import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  AlertTriangle, CheckCircle, Download, Printer, ArrowLeft, Brain,
  Target, Activity, FileText, TrendingUp, Shield, Sparkles, Star,
  MapPin, Layers, Calendar, Hash, Cpu, ChevronRight,
} from "lucide-react";
import AnimatedButton from "@/components/AnimatedButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getAnalysisById } from "@/lib/analysisApi";
import { generateMedicalReport } from "@/lib/generatePDF";

const LATEST_ANALYSIS_STORAGE_KEY = "neuroscan_latest_analysis_id";

interface ResultLocationState {
  patientName?: string;
  patientId?: string;
  scanDate?: string;
}

interface ScanResult {
  id: string;
  patient_name: string;
  patient_id_number: string | null;
  scan_date: string;
  scan_type: string | null;
  result: string;
  confidence: number | null;
  tumor_type: string | null;
  tumor_grade: string | null;
  tumor_location: string | null;
  tumor_size: string | null;
  tumor_volume: string | null;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  report_text: string | null;
  image_url: string | null;
}

const ResultsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const routeState = (location.state || {}) as ResultLocationState;
  const { user, session } = useAuth();
  const { t, lang } = useTheme();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!user || !session?.accessToken) {
      setLoading(false);
      return;
    }

    const analysisId = id || sessionStorage.getItem(LATEST_ANALYSIS_STORAGE_KEY);
    if (!analysisId) {
      setScan(null);
      setLoading(false);
      return;
    }

    const loadAnalysis = async () => {
      try {
        const analysis = await getAnalysisById(session.accessToken, analysisId);
        sessionStorage.setItem(LATEST_ANALYSIS_STORAGE_KEY, analysis.id);
        setScan({
          id: analysis.id,
          patient_name: routeState.patientName || "Patient",
          patient_id_number: routeState.patientId || null,
          scan_date: routeState.scanDate || analysis.createdAt.split("T")[0],
          scan_type: analysis.fileType || "MRI",
          result: analysis.result,
          confidence: analysis.confidence,
          tumor_type: analysis.tumorType || null,
          tumor_grade: analysis.tumorGrade || null,
          tumor_location: analysis.tumorLocation || null,
          tumor_size: analysis.tumorSize || null,
          tumor_volume: analysis.tumorVolume || null,
          bounding_box: analysis.boundingBox || null,
          report_text: analysis.reportText,
          image_url: analysis.imageUrl || null,
        });
      } catch (error) {
        console.error("Failed to load scan:", error);
        setScan(null);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalysis();
  }, [id, routeState.patientId, routeState.patientName, routeState.scanDate, session?.accessToken, user]);

  const handleDownloadPDF = () => {
    if (!scan) return;
    generateMedicalReport({
      patientName: scan.patient_name,
      patientId: scan.patient_id_number || "N/A",
      scanDate: new Date(scan.scan_date).toLocaleDateString(),
      scanType: scan.scan_type || "T1-weighted MRI",
      result: scan.result,
      confidence: scan.confidence || 0,
      tumorType: scan.tumor_type || undefined,
      tumorGrade: scan.tumor_grade || undefined,
      tumorLocation: scan.tumor_location || undefined,
      tumorSize: scan.tumor_size || undefined,
      tumorVolume: scan.tumor_volume || undefined,
      reportText: scan.report_text || undefined,
      imageUrl: scan.image_url || undefined,
      boundingBox: scan.bounding_box || undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Brain className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="p-6 text-center">
        <h1 className="font-display text-2xl font-bold">{t("res.scanNotFound")}</h1>
        <Link to="/upload"><AnimatedButton className="mt-4">{t("res.uploadNew")}</AnimatedButton></Link>
      </div>
    );
  }

  const isPositive = scan.result === "positive";
  const confidence = scan.confidence?.toFixed(1) || "N/A";
  const overlayBox = scan.bounding_box
    ? {
        left: `${scan.bounding_box.x * 100}%`,
        top: `${scan.bounding_box.y * 100}%`,
        width: `${scan.bounding_box.width * 100}%`,
        height: `${scan.bounding_box.height * 100}%`,
      }
    : null;

  const metrics = [
    { label: t("res.confidence"), value: `${confidence}%`, icon: TrendingUp, color: "text-blue-400", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
    { label: t("res.tumorGrade"), value: scan.tumor_grade || "N/A", icon: Activity, color: "text-amber-400", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    { label: t("res.location"), value: scan.tumor_location || "N/A", icon: MapPin, color: "text-blue-400", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
    { label: t("res.volume"), value: scan.tumor_volume || "N/A", icon: Layers, color: "text-amber-400", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  ];

  const patientFields = [
    { label: t("res.name"), value: scan.patient_name, icon: Shield },
    { label: t("res.id"), value: scan.patient_id_number || "N/A", icon: Hash },
    { label: t("res.scanDate"), value: new Date(scan.scan_date).toLocaleDateString(), icon: Calendar },
    { label: t("res.scanType"), value: scan.scan_type || "T1-weighted MRI", icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" /> {t("res.back")}
                </Button>
              </motion.div>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-amber-300 bg-clip-text text-transparent">
                {t("res.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {scan.patient_name} · {new Date(scan.scan_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" className="gap-1.5 border-border/60 hover:border-primary/40" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> {t("res.print")}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="sm" className="gap-1.5" onClick={handleDownloadPDF}
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", color: "white", border: "none" }}>
                <Download className="w-4 h-4" /> {t("res.downloadPDF")}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
          className="relative rounded-2xl overflow-hidden mb-8"
          style={{
            background: isPositive
              ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))"
              : "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.05))",
            border: `1px solid ${isPositive ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"}`,
            boxShadow: isPositive
              ? "0 0 40px rgba(239,68,68,0.1), inset 0 1px 0 rgba(239,68,68,0.15)"
              : "0 0 40px rgba(59,130,246,0.1), inset 0 1px 0 rgba(59,130,246,0.15)",
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(105deg, transparent 40%, ${isPositive ? "rgba(239,68,68,0.06)" : "rgba(59,130,246,0.06)"} 50%, transparent 60%)` }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex items-center gap-5 p-6">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isPositive ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)",
                border: `1px solid ${isPositive ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"}`,
                boxShadow: `0 0 20px ${isPositive ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
              }}
            >
              {isPositive ? (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              ) : (
                <CheckCircle className="w-8 h-8 text-blue-400" />
              )}
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display text-2xl font-bold" style={{ color: isPositive ? "#f87171" : "#60a5fa" }}>
                  {isPositive ? t("res.tumorDetected") : t("res.noTumor")}
                </h2>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: isPositive ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                    color: isPositive ? "#f87171" : "#60a5fa",
                    border: `1px solid ${isPositive ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                  }}
                >
                  {isPositive ? (lang === "fr" ? "POSITIF" : "POSITIVE") : (lang === "fr" ? "NÉGATIF" : "NEGATIVE")}
                </motion.div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isPositive
                  ? (lang === "fr" ? `${scan.tumor_type} identifiée avec ${confidence}% de confiance.` : `${scan.tumor_type} identified with ${confidence}% confidence.`)
                  : (lang === "fr" ? `Le scan cérébral paraît normal avec ${confidence}% de confiance.` : `Brain scan appears normal with ${confidence}% confidence.`)}
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-5xl font-display font-black" style={{ color: isPositive ? "#f87171" : "#60a5fa" }}>
                {confidence}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">{lang === "fr" ? "Confiance IA" : "AI Confidence"}</div>
            </div>
          </div>
        </motion.div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left — Scan Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(245,158,11,0.04))",
              border: "1px solid rgba(59,130,246,0.2)",
              boxShadow: "0 8px 40px rgba(59,130,246,0.12), 0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                {isPositive ? t("res.tumorLocal") : t("res.scanImage")}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                {lang === "fr" ? "En direct" : "Live"}
              </div>
            </div>

            <div className="relative">
              {scan.image_url ? (
                <div className="relative">
                  <motion.img
                    src={scan.image_url}
                    alt="Brain MRI"
                    className="w-full object-cover"
                    style={{ maxHeight: "400px", objectFit: "contain" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: imageLoaded ? 1 : 0 }}
                    onLoad={() => setImageLoaded(true)}
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <Brain className="w-8 h-8 text-primary" />
                      </motion.div>
                    </div>
                  )}
                  {imageLoaded && (
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 pointer-events-none"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(245,158,11,0.4), transparent)" }}
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  {isPositive && imageLoaded && overlayBox && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="absolute"
                      style={overlayBox}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl border-2 border-red-400"
                        style={{ boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 rounded-lg border border-red-400/50 border-dashed"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                        style={{ background: "rgba(239,68,68,0.9)", color: "white", boxShadow: "0 4px 12px rgba(239,68,68,0.4)" }}
                      >
                        {t("res.tumorRegion")}
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-secondary/30 flex items-center justify-center">
                  <Brain className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <span className="text-xs text-muted-foreground font-mono">{scan.scan_type}</span>
              <div className="flex items-center gap-2">
                {["T1", "T2", "FLAIR"].map((layer, i) => (
                  <span key={layer} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: i === 0 ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)", color: i === 0 ? "#60a5fa" : "rgba(255,255,255,0.4)", border: i === 0 ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.08)" }}>
                    {layer}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Metrics + Info */}
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-3"
            >
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08, type: "spring" }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="relative p-4 rounded-xl overflow-hidden cursor-default"
                  style={{ background: m.bg, border: `1px solid ${m.border}`, boxShadow: `0 4px 16px ${m.bg}` }}
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(105deg, transparent 40%, ${m.bg.replace("0.1", "0.15")} 50%, transparent 60%)` }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-2">
                      <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <div className={`font-display text-lg font-bold ${m.color}`}>{m.value}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(59,130,246,0.06))",
                border: "1px solid rgba(245,158,11,0.2)",
                boxShadow: "0 4px 20px rgba(245,158,11,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-display font-semibold">{t("res.patientInfo")}</h3>
              </div>
              <div className="p-5 space-y-3">
                {patientFields.map((field, i) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.05 }}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{field.label}</span>
                    </div>
                    <span className="text-sm font-semibold">{field.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {scan.report_text && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(245,158,11,0.04))",
                  border: "1px solid rgba(59,130,246,0.2)",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.08)",
                }}
              >
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-display font-semibold">{t("res.aiReport")}</h3>
                  <motion.div
                    className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    AI
                  </motion.div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{scan.report_text}</p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground/60 italic">{t("res.aiDisclaimer")}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom action strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(59,130,246,0.06))",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">{lang === "fr" ? "Analyse IA complète" : "AI Analysis Complete"}</div>
              <div className="text-xs text-muted-foreground">{lang === "fr" ? "Résultats générés en moins de 30 secondes" : "Results generated in under 30 seconds"}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/upload">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200"
              >
                {lang === "fr" ? "Nouveau Scan" : "New Scan"} <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}
            >
              <Download className="w-4 h-4" /> {t("res.downloadPDF")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultsPage;