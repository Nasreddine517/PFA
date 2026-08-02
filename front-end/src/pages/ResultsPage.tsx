import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, CheckCircle, Download, Printer, ArrowLeft, Brain,
  Target, Activity, TrendingUp, Shield, Sparkles, Star,
  MapPin, Layers, Calendar, Hash, Cpu, ChevronRight, Eye,
} from "lucide-react";
import AnimatedButton from "@/components/AnimatedButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getAnalysisById, PositiveSlice, ExamSeries } from "@/lib/analysisApi";
import { generateMedicalReport } from "@/lib/generatePDF";

const LATEST_ANALYSIS_STORAGE_KEY = "neuroscan_latest_analysis_id";

interface ResultLocationState {
  patientName?: string;
  patientId?: string;
  patientSex?: string;
  patientAge?: string;
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
  positive_slices: PositiveSlice[];
  is_full_exam: boolean;
  exam_series: ExamSeries[] | null;
}

const ResultsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate  = useNavigate();
  const routeState = (location.state || {}) as ResultLocationState;
  const { user, session } = useAuth();
  const { t, lang } = useTheme();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ── PACS viewer state ──────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pacsViewerRef = useRef<HTMLDivElement>(null);
  const [pacsSelectedSeries, setPacsSelectedSeries] = useState(0);
  const [pacsViewAll, setPacsViewAll] = useState(false);
  const [pacsSliceByIdx, setPacsSliceByIdx] = useState<Record<number, number>>({});
  const [pacsBboxVisible, setPacsBboxVisible] = useState(true);


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
          image_url: analysis.imageUrl || analysis.previewImageData || localStorage.getItem(`neuroscan_preview_${analysis.id}`) || sessionStorage.getItem(`neuroscan_scan_image_${analysis.id}`) || null,
          positive_slices: analysis.positiveSlices || [],
          is_full_exam: analysis.isFullExam ?? false,
          exam_series: analysis.examSeries ?? null,
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
      patientName:     scan.patient_name,
      patientId:       scan.patient_id_number || "N/A",
      scanDate:        scan.scan_date,
      scanType:        scan.scan_type || "T1-weighted MRI",
      result:          scan.result,
      confidence:      scan.confidence || 0,
      tumorType:       scan.tumor_type    || undefined,
      tumorGrade:      scan.tumor_grade   || undefined,
      tumorLocation:   scan.tumor_location || undefined,
      tumorSize:       scan.tumor_size    || undefined,
      tumorVolume:     scan.tumor_volume  || undefined,
      reportText:      scan.report_text   || undefined,
      imageUrl:        scan.image_url     || undefined,
      boundingBox:     scan.bounding_box  || undefined,
      doctorName:      user?.fullName     || undefined,
      doctorSpecialty: user?.specialty    || undefined,
      doctorHospital:  user?.hospital     || undefined,
    });
  };

  // ── PACS canvas rendering ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pacsViewAll || !scan?.exam_series) return;
    const series = scan.exam_series[pacsSelectedSeries];
    if (!series) return;
    const sliceIdx = pacsSliceByIdx[pacsSelectedSeries] ?? 0;
    const slice = series.allSlices[sliceIdx];
    if (!slice?.imageData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      if (pacsBboxVisible && slice.isSuspicious && slice.boundingBox) {
        const { x, y, width, height } = slice.boundingBox;
        const lw = Math.max(2, img.naturalWidth * 0.005);
        ctx.lineWidth = lw;
        ctx.strokeStyle = "#ef4444";
        ctx.shadowColor = "rgba(239,68,68,0.7)";
        ctx.shadowBlur = 10;
        ctx.strokeRect(x * img.naturalWidth, y * img.naturalHeight, width * img.naturalWidth, height * img.naturalHeight);
        ctx.shadowBlur = 0;
        const label = lang === "fr" ? "Tumeur" : "Tumor";
        const fs = Math.max(12, Math.floor(img.naturalWidth * 0.026));
        ctx.font = `bold ${fs}px "Courier New", monospace`;
        const tw = ctx.measureText(label).width + 10;
        const lh = fs + 8;
        const lx = x * img.naturalWidth;
        const ly = Math.max(0, y * img.naturalHeight - lh - 2);
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.fillRect(lx, ly, tw, lh);
        ctx.fillStyle = "white";
        ctx.fillText(label, lx + 5, ly + fs + 1);
      }
    };
    img.src = slice.imageData;
  }, [scan?.exam_series, pacsSelectedSeries, pacsSliceByIdx, pacsBboxVisible, pacsViewAll]);

  // ── PACS mouse-wheel scrolling ────────────────────────────────────────────
  useEffect(() => {
    const el = pacsViewerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      const seriesLen = scan?.exam_series?.[pacsSelectedSeries]?.allSlices.length ?? 0;
      setPacsSliceByIdx(prev => {
        const cur = prev[pacsSelectedSeries] ?? 0;
        return { ...prev, [pacsSelectedSeries]: Math.max(0, Math.min(cur + delta, seriesLen - 1)) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scan?.exam_series, pacsSelectedSeries]);

  // ── PACS navigation helpers ───────────────────────────────────────────────
  const pacsCurrentSeries = scan?.exam_series?.[pacsSelectedSeries];
  const pacsSliceIdx = pacsSliceByIdx[pacsSelectedSeries] ?? 0;

  const goToSlice = useCallback((idx: number) => {
    const len = pacsCurrentSeries?.allSlices.length ?? 0;
    setPacsSliceByIdx(prev => ({ ...prev, [pacsSelectedSeries]: Math.max(0, Math.min(idx, len - 1)) }));
  }, [pacsCurrentSeries, pacsSelectedSeries]);

  const goToNextSuspicious = useCallback(() => {
    const slices = pacsCurrentSeries?.allSlices ?? [];
    const suspIdx = slices.map((s, i) => ({ i, s })).filter(({ s }) => s.isSuspicious).map(({ i }) => i);
    if (!suspIdx.length) return;
    const next = suspIdx.find(i => i > pacsSliceIdx);
    goToSlice(next !== undefined ? next : suspIdx[0]);
  }, [pacsCurrentSeries, pacsSliceIdx, goToSlice]);

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
    ...(routeState.patientSex ? [{ label: lang === 'fr' ? 'Sexe' : 'Sex', value: routeState.patientSex, icon: Shield }] : []),
    ...(routeState.patientAge ? [{ label: lang === 'fr' ? 'Âge' : 'Age', value: routeState.patientAge, icon: Shield }] : []),
    { label: t("res.scanDate"), value: new Date(scan.scan_date).toLocaleDateString(), icon: Calendar },
    { label: t("res.scanType"), value: scan.scan_type || "T1-weighted MRI", icon: Cpu },
  ];

  // ── PACS VIEW (full exam) ─────────────────────────────────────────────────
  if (scan.is_full_exam && scan.exam_series && scan.exam_series.length > 0) {
    const series = scan.exam_series[pacsSelectedSeries];
    const currentSlice = series?.allSlices[pacsSliceIdx];
    const suspiciousIndices = (series?.allSlices ?? []).map((s, i) => s.isSuspicious ? i : -1).filter(i => i >= 0);
    const hasSuspicious = suspiciousIndices.length > 0;

    const pacsHeader = (
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0" style={{ background: "#0f0f18", minHeight: "52px" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/upload")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />{lang === "fr" ? "Retour" : "Back"}
          </button>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-bold text-white text-sm tracking-wide">NeuroScan PACS</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
            <span className="text-white/90 font-medium">{scan.patient_name}</span>
            {routeState.patientAge && <span>· {lang === "fr" ? "Âge" : "Age"}: {routeState.patientAge}</span>}
            {routeState.patientSex && <span>· {routeState.patientSex}</span>}
            <span>· {new Date(scan.scan_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
            isPositive ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          }`}>
            {isPositive ? (lang === "fr" ? "POSITIF" : "POSITIVE") : (lang === "fr" ? "NÉGATIF" : "NEGATIVE")}
          </span>
          <Button size="sm" onClick={handleDownloadPDF}
            className="gap-1.5 h-8 text-xs"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", color: "white", border: "none" }}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>
    );

    // ── "Voir tous" grid mode ───────────────────────────────────
    if (pacsViewAll) {
      return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0a0a0f" }}>
          {pacsHeader}
          {/* Series strip */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 flex-shrink-0" style={{ background: "#0c0c16" }}>
            <button onClick={() => setPacsViewAll(false)} className="text-xs text-white/60 hover:text-white flex items-center gap-1 border border-white/15 rounded px-2 py-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> {lang === "fr" ? "Retour visionneur" : "Back to viewer"}
            </button>
            {scan.exam_series.map((s, idx) => (
              <button
                key={s.seriesUid}
                onClick={() => { setPacsSelectedSeries(idx); setPacsViewAll(false); }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${idx === pacsSelectedSeries ? "bg-white/15 text-white border-white/30" : "text-white/50 border-white/10 hover:bg-white/8 hover:text-white/80"}`}
              >
                {s.isPositive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 mb-px" />}
                {lang === "fr" ? `Série ${s.seriesNumber}` : `Series ${s.seriesNumber}`}
              </button>
            ))}
          </div>
          {/* Thumbnails grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {scan.exam_series.map((s, sIdx) => (
              <div key={s.seriesUid} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  {s.isPositive && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />}
                  <span className="text-sm font-semibold text-white">{lang === "fr" ? `Série ${s.seriesNumber}` : `Series ${s.seriesNumber}`}</span>
                  <span className="text-xs text-white/40">{s.seriesLabel}</span>
                  <span className="text-xs text-white/30">— {s.totalSlices} {lang === "fr" ? "coupes" : "slices"}</span>
                  {s.isPositive && <span className="text-xs text-red-400 font-bold">{lang === "fr" ? `⚠ ${suspiciousIndices.length} suspicieuse(s)` : `⚠ suspicious`}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.allSlices.map((slice, sliceIdx) => (
                    <button
                      key={sliceIdx}
                      onClick={() => { setPacsSelectedSeries(sIdx); setPacsViewAll(false); setPacsSliceByIdx(prev => ({ ...prev, [sIdx]: sliceIdx })); }}
                      className={`relative w-14 h-14 overflow-hidden rounded border transition-all hover:scale-105 hover:border-white/50 ${
                        slice.isSuspicious ? "border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "border-white/10"
                      }`}
                      title={`Slice ${sliceIdx + 1}${slice.isSuspicious ? " ⚠" : ""}`}
                    >
                      <img src={slice.imageData} alt="" className="w-full h-full object-cover" />
                      {slice.isSuspicious && (
                        <div className="absolute inset-0 border-2 border-red-500/50 rounded pointer-events-none" />
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 text-center text-[8px] leading-4 ${
                        slice.isSuspicious ? "bg-red-900/80 text-red-300" : "bg-black/60 text-white/50"
                      }`}>{sliceIdx + 1}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Main PACS single-series viewer ──────────────────────────
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0a0a0f" }}>
        {pacsHeader}
        <div className="flex flex-1 overflow-hidden">

          {/* Left sidebar — series list */}
          <div className="w-52 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden" style={{ background: "#0c0c16" }}>
            <div className="px-3 py-2 border-b border-white/10">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {lang === "fr" ? "SÉRIES" : "SERIES"} ({scan.exam_series.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {scan.exam_series.map((s, idx) => (
                <button
                  key={s.seriesUid}
                  onClick={() => { setPacsSelectedSeries(idx); setPacsViewAll(false); }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 text-xs transition-all ${
                    idx === pacsSelectedSeries ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {s.isPositive
                      ? <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
                      : <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{lang === "fr" ? `Série ${s.seriesNumber}` : `Series ${s.seriesNumber}`}</div>
                    <div className="text-white/30 text-[10px] mt-0.5">{s.totalSlices} {lang === "fr" ? "coupes" : "slices"}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 p-1">
              <button
                onClick={() => setPacsViewAll(true)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs rounded text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">{lang === "fr" ? "Voir tous" : "View all"}</span>
              </button>
            </div>
          </div>

          {/* Main image viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            {/* Viewer toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0" style={{ background: "#0f0f1a" }}>
              <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
                <span className="font-semibold text-white">
                  {series ? (lang === "fr" ? `Série ${series.seriesNumber}` : `Series ${series.seriesNumber}`) : ""}
                </span>
                <span className="text-white/25">·</span>
                <span>
                  {lang === "fr" ? "Coupe" : "Slice"}{" "}
                  <strong className="text-white">{pacsSliceIdx + 1}</strong> / {series?.totalSlices ?? 0}
                </span>
                {currentSlice?.isSuspicious && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">
                    ⚠ {lang === "fr" ? "Suspicieux" : "Suspicious"}
                    {currentSlice.confidence != null && ` — ${currentSlice.confidence.toFixed(1)}%`}
                  </span>
                )}
              </div>
              <button
                onClick={() => setPacsBboxVisible(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs border transition-all ${
                  pacsBboxVisible ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-white/5 text-white/30 border-white/10"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                {pacsBboxVisible ? (lang === "fr" ? "Masquer bbox" : "Hide bbox") : (lang === "fr" ? "Afficher bbox" : "Show bbox")}
              </button>
            </div>

            {/* Image + right nav panel */}
            <div className="flex flex-1 overflow-hidden">

              {/* Image canvas — takes all available space */}
              <div ref={pacsViewerRef} className="flex-1 flex items-center justify-center overflow-hidden p-4" style={{ background: "#050508", cursor: "ns-resize" }}>
                {currentSlice?.imageData ? (
                  <canvas
                    ref={canvasRef}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", imageRendering: "pixelated", display: "block" }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/20">
                    <Brain className="w-20 h-20" />
                    <span className="text-sm">{lang === "fr" ? "Aucune image" : "No image"}</span>
                  </div>
                )}
              </div>

              {/* Right navigation panel */}
              <div className="w-14 flex-shrink-0 flex flex-col items-center border-l border-white/10 overflow-hidden" style={{ background: "#0d0d1a" }}>

                {/* Prev button */}
                <button
                  onClick={() => goToSlice(pacsSliceIdx - 1)}
                  disabled={pacsSliceIdx === 0}
                  title={lang === "fr" ? "Coupe précédente" : "Previous slice"}
                  className="w-full flex-shrink-0 flex items-center justify-center py-3 text-white/50 hover:bg-white/8 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border-b border-white/10 text-sm"
                >
                  ▲
                </button>

                {/* Vertical slice strip — scrollable */}
                <div
                  className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1 py-2 px-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {series?.allSlices.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlice(i)}
                      title={`${lang === "fr" ? "Coupe" : "Slice"} ${i + 1}${s.isSuspicious ? " ⚠" : ""}`}
                      className={`flex-shrink-0 w-9 h-7 rounded text-[9px] font-medium transition-all ${
                        i === pacsSliceIdx
                          ? "bg-white text-black shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                          : s.isSuspicious
                            ? "bg-red-500/40 text-red-300 border border-red-500/50 hover:bg-red-500/60"
                            : "bg-white/10 text-white/35 hover:bg-white/20 hover:text-white/70"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={() => goToSlice(pacsSliceIdx + 1)}
                  disabled={!series || pacsSliceIdx >= series.allSlices.length - 1}
                  title={lang === "fr" ? "Coupe suivante" : "Next slice"}
                  className="w-full flex-shrink-0 flex items-center justify-center py-3 text-white/50 hover:bg-white/8 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border-t border-white/10 text-sm"
                >
                  ▼
                </button>

                {/* "Next suspicious" button — vertical text */}
                {hasSuspicious && (
                  <button
                    onClick={goToNextSuspicious}
                    title={lang === "fr" ? "Prochaine coupe suspecte" : "Next suspicious slice"}
                    className="w-full flex-shrink-0 flex items-center justify-center py-3 border-t border-red-500/25 bg-red-500/8 hover:bg-red-500/18 transition-all"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ──────────────────────────────────────────────────────────────

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
            <Link to="/upload">
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
                  ? (lang === "fr" ? `Tumeur détectée avec ${confidence}% de confiance.` : `Tumor detected with ${confidence}% confidence.`)
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
              {(scan.image_url || scan.positive_slices[0]?.imageData) ? (
                <div className="relative">
                  <motion.img
                    src={scan.image_url || scan.positive_slices[0]?.imageData}
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
            {isPositive && scan.positive_slices.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  navigate("/slices", {
                    state: {
                      slices:      scan.positive_slices,
                      patientName: scan.patient_name,
                      resultsId:   scan.id,
                    },
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#f87171",
                  borderColor: "rgba(239,68,68,0.35)",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.15)",
                }}
              >
                <Eye className="w-4 h-4" /> {t("res.positiveSlices")}
              </motion.button>
            )}
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