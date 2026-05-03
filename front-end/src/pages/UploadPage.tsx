import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Upload, Brain, FileImage, X, User, Calendar, Hash,
  Sparkles, CheckCircle2, Shield, Zap, Activity, Cpu,
  ArrowRight, Scan, ChevronRight, AlertTriangle,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { uploadAndAnalyzeScan } from "@/lib/analysisApi";
import { toast } from "sonner";

const LATEST_ANALYSIS_STORAGE_KEY = "neuroscan_latest_analysis_id";

const SYMPTOMS_FR = [
  { label: "Maux de tête persistants ou inhabituels", icon: "🧠", severity: "high" },
  { label: "Crises d'épilepsie (convulsions)", icon: "⚡", severity: "high" },
  { label: "Vision floue ou double", icon: "👁️", severity: "medium" },
  { label: "Nausées ou vomissements fréquents", icon: "🤢", severity: "medium" },
  { label: "Difficulté à se concentrer", icon: "💭", severity: "low" },
  { label: "Troubles de la mémoire", icon: "🔮", severity: "medium" },
  { label: "Changements de comportement ou de personnalité", icon: "🎭", severity: "medium" },
  { label: "Faiblesse ou engourdissement d'un côté du corps", icon: "💪", severity: "high" },
  { label: "Difficulté à parler ou à trouver ses mots", icon: "💬", severity: "high" },
  { label: "Problèmes d'équilibre ou de coordination", icon: "⚖️", severity: "medium" },
  { label: "Fatigue inhabituelle et persistante", icon: "😴", severity: "low" },
];

const SYMPTOMS_EN = [
  { label: "Persistent or unusual headaches", icon: "🧠", severity: "high" },
  { label: "Epileptic seizures (convulsions)", icon: "⚡", severity: "high" },
  { label: "Blurry or double vision", icon: "👁️", severity: "medium" },
  { label: "Frequent nausea or vomiting", icon: "🤢", severity: "medium" },
  { label: "Difficulty concentrating", icon: "💭", severity: "low" },
  { label: "Memory problems", icon: "🔮", severity: "medium" },
  { label: "Behavioral or personality changes", icon: "🎭", severity: "medium" },
  { label: "Weakness or numbness on one side of the body", icon: "💪", severity: "high" },
  { label: "Difficulty speaking or finding words", icon: "💬", severity: "high" },
  { label: "Balance or coordination issues", icon: "⚖️", severity: "medium" },
  { label: "Unusual and persistent fatigue", icon: "😴", severity: "low" },
];

const severityConfig = {
  high:   { labelFr: "Critique", labelEn: "Critical", color: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  medium: { labelFr: "Modéré",   labelEn: "Moderate", color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  low:    { labelFr: "Léger",    labelEn: "Minor",    color: "#3b82f6", glow: "rgba(59,130,246,0.3)" },
};

const UploadPage = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { t, lang, theme } = useTheme();
  const isLight = theme === "light";

  const SYMPTOMS = lang === "fr" ? SYMPTOMS_FR : SYMPTOMS_EN;

  const [step, setStep] = useState(1);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [scanDate, setScanDate] = useState("");
  const [scanDateObj, setScanDateObj] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredSymptom, setHoveredSymptom] = useState<string | null>(null);

  // CSS calendrier — adapté light/dark
  const CALENDAR_CSS = isLight ? `
    @keyframes nsFloatIn {
      from { opacity: 0; transform: translateY(14px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0px) scale(1); }
    }
    .ns-cal-wrap { animation: nsFloatIn 0.28s cubic-bezier(0.34,1.56,0.64,1); }
    .ns-cal .rdp { margin: 0; }
    .ns-cal .rdp-months { justify-content: center; }
    .ns-cal .rdp-caption {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 4px 10px 4px;
      border-bottom: 1px solid hsl(40,25%,76%);
      margin-bottom: 8px;
    }
    .ns-cal .rdp-caption_label {
      color: hsl(150,30%,14%) !important;
      font-weight: 700 !important;
      font-size: 14px !important;
    }
    .ns-cal .rdp-nav { display: flex; gap: 6px; }
    .ns-cal .rdp-nav_button {
      color: hsl(150,18%,38%) !important;
      border: 1px solid hsl(40,22%,74%) !important;
      border-radius: 8px !important;
      width: 28px !important; height: 28px !important;
      display: flex; align-items: center; justify-content: center;
      background: hsl(40,18%,96%) !important;
      transition: all 0.2s;
    }
    .ns-cal .rdp-nav_button:hover {
      color: hsl(152,38%,28%) !important;
      background: hsl(152,25%,88%) !important;
      border-color: hsl(152,30%,68%) !important;
    }
    .ns-cal .rdp-head_cell {
      color: hsl(40,55%,35%) !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      width: 36px !important;
      padding-bottom: 6px;
    }
    .ns-cal .rdp-cell { width: 36px !important; height: 36px !important; }
    .ns-cal .rdp-button {
      color: hsl(150,25%,20%) !important;
      font-size: 13px !important;
      width: 34px !important; height: 34px !important;
      border-radius: 8px !important;
      transition: all 0.15s;
    }
    .ns-cal .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background: hsl(152,25%,88%) !important;
      color: hsl(152,38%,22%) !important;
    }
    .ns-cal .rdp-day_selected .rdp-button,
    .ns-cal .rdp-day_selected .rdp-button:hover {
      background: linear-gradient(135deg, hsl(152,38%,32%), hsl(152,35%,40%)) !important;
      color: #ffffff !important;
      box-shadow: 0 0 14px hsl(152,35%,40%,0.4) !important;
    }
    .ns-cal .rdp-day_today .rdp-button {
      border: 1.5px solid hsl(40,55%,48%) !important;
      color: hsl(40,55%,32%) !important;
      font-weight: 700 !important;
    }
    .ns-cal .rdp-day_outside .rdp-button {
      color: hsl(150,15%,65%) !important;
    }
    .ns-cal .rdp-day_disabled .rdp-button {
      color: hsl(150,10%,75%) !important;
      cursor: not-allowed;
    }
  ` : `
    @keyframes nsFloatIn {
      from { opacity: 0; transform: translateY(14px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0px) scale(1); }
    }
    .ns-cal-wrap { animation: nsFloatIn 0.28s cubic-bezier(0.34,1.56,0.64,1); }
    .ns-cal .rdp { margin: 0; }
    .ns-cal .rdp-months { justify-content: center; }
    .ns-cal .rdp-caption {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 4px 10px 4px;
      border-bottom: 1px solid rgba(245,158,11,0.2);
      margin-bottom: 8px;
    }
    .ns-cal .rdp-caption_label {
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 14px !important;
    }
    .ns-cal .rdp-nav { display: flex; gap: 6px; }
    .ns-cal .rdp-nav_button {
      color: rgba(255,255,255,0.55) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
      width: 28px !important; height: 28px !important;
      display: flex; align-items: center; justify-content: center;
      background: transparent !important;
      transition: all 0.2s;
    }
    .ns-cal .rdp-nav_button:hover {
      color: #ffffff !important;
      background: rgba(59,130,246,0.25) !important;
      border-color: rgba(59,130,246,0.5) !important;
    }
    .ns-cal .rdp-head_cell {
      color: rgba(245,158,11,0.85) !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      width: 36px !important;
      padding-bottom: 6px;
    }
    .ns-cal .rdp-cell { width: 36px !important; height: 36px !important; }
    .ns-cal .rdp-button {
      color: rgba(255,255,255,0.8) !important;
      font-size: 13px !important;
      width: 34px !important; height: 34px !important;
      border-radius: 8px !important;
      transition: all 0.15s;
    }
    .ns-cal .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background: rgba(59,130,246,0.22) !important;
      color: #ffffff !important;
    }
    .ns-cal .rdp-day_selected .rdp-button,
    .ns-cal .rdp-day_selected .rdp-button:hover {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
      color: #ffffff !important;
      box-shadow: 0 0 14px rgba(59,130,246,0.55) !important;
    }
    .ns-cal .rdp-day_today .rdp-button {
      border: 1.5px solid rgba(245,158,11,0.75) !important;
      color: #f59e0b !important;
      font-weight: 700 !important;
    }
    .ns-cal .rdp-day_outside .rdp-button { color: rgba(255,255,255,0.2) !important; }
    .ns-cal .rdp-day_disabled .rdp-button { color: rgba(255,255,255,0.15) !important; cursor: not-allowed; }
  `;

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleAnalyze = async () => {
    if (!file || !user || !patientName || !session?.accessToken) {
      toast.error(lang === "fr" ? "Veuillez renseigner le nom du patient et téléverser un scan." : "Please fill in patient name and upload a scan.");
      return;
    }
    setStep(4);
    setIsAnalyzing(true);
    setProgress(0);
    setActiveStep(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      const analysis = await uploadAndAnalyzeScan(session.accessToken, file);
      sessionStorage.setItem(LATEST_ANALYSIS_STORAGE_KEY, analysis.id);
      // Store the image for this session only (cleared on logout / tab close)
      if (preview) {
        sessionStorage.setItem(`neuroscan_scan_image_${analysis.id}`, preview);
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        navigate(`/results/${analysis.id}`, {
          state: { patientName, patientId, scanDate, symptoms: selectedSymptoms },
        });
      }, 500);
    } catch (error: any) {
      clearInterval(interval);
      setIsAnalyzing(false);
      setStep(3);
      toast.error((lang === "fr" ? "Erreur lors de l'analyse: " : "Analysis error: ") + error.message);
    }
  };

  const analysisStepsData = lang === "fr"
    ? [
        { icon: Scan, text: "Prétraitement et normalisation des données" },
        { icon: Cpu, text: "Inférence du réseau de neurones" },
        { icon: Brain, text: "Détection des anomalies et contours tumoraux" },
        { icon: Activity, text: "Classification du type et grade tumoral" },
        { icon: CheckCircle2, text: "Génération du rapport complet" },
      ]
    : [
        { icon: Scan, text: "Preprocessing & normalizing scan data" },
        { icon: Cpu, text: "Running neural network inference" },
        { icon: Brain, text: "Detecting anomalies & tumor boundaries" },
        { icon: Activity, text: "Classifying tumor type & grade" },
        { icon: CheckCircle2, text: "Generating comprehensive report" },
      ];

  const stepLabels = [t("up.step1"), t("up.step2"), t("up.step3"), t("up.step4")];
  const highCount = selectedSymptoms.filter(s => SYMPTOMS.find(sy => sy.label === s && sy.severity === "high")).length;
  const medCount  = selectedSymptoms.filter(s => SYMPTOMS.find(sy => sy.label === s && sy.severity === "medium")).length;
  const lowCount  = selectedSymptoms.filter(s => SYMPTOMS.find(sy => sy.label === s && sy.severity === "low")).length;

  const features = [
    { icon: Zap,    label: t("up.realtimeAI"), desc: t("up.realtimeDesc") },
    { icon: Shield, label: t("up.hipaa"),      desc: t("up.hipaaDesc")    },
    { icon: Brain,  label: t("up.accuracy"),   desc: t("up.accuracyDesc") },
  ];

  // Couleurs adaptées light/dark pour le step 2
  const s2bg     = isLight ? "hsl(40,22%,94%)"              : "linear-gradient(135deg, #0a0f1e 0%, #0d1530 40%, #0a1628 100%)";
  const s2border = isLight ? "hsl(40,22%,74%)"              : "rgba(245,158,11,0.25)";
  const s2shadow = isLight ? "0 4px 24px hsl(152,22%,25%,0.10)" : "0 0 60px rgba(245,158,11,0.08), 0 0 120px rgba(59,130,246,0.06), inset 0 1px 0 rgba(255,255,255,0.05)";
  const s2text   = isLight ? "hsl(150,30%,14%)"             : "#ffffff";
  const s2sub    = isLight ? "hsl(150,16%,38%)"             : "rgba(255,255,255,0.45)";
  const s2divider= isLight
    ? "linear-gradient(90deg, transparent, hsl(40,25%,72%), transparent)"
    : "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), rgba(59,130,246,0.3), transparent)";

  return (
    <div className="min-h-screen bg-background relative">
      <style>{CALENDAR_CSS}</style>

      <div className="py-8 relative z-10">
        <div className="container mx-auto px-4">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, type: "spring" }} className="text-center mb-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mx-auto mb-6 relative"
            >
              <Brain className="w-10 h-10 text-primary" />
              <motion.div className="absolute inset-0 rounded-2xl border-2 border-primary/20" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-display text-4xl md:text-5xl font-bold mb-3">
              {lang === "fr" ? <>Analyser un <span className="text-gradient">Scan IRM</span></> : <>Analyze <span className="text-gradient">MRI Scan</span></>}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("up.subtitle")}
            </motion.p>
          </motion.div>

          {/* Step Indicator */}
          {step < 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-center items-center gap-2 mb-10">
              {stepLabels.map((label, idx) => {
                const n = idx + 1;
                const isActive = step === n;
                const isDone = step > n;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <motion.div
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isDone ? "bg-accent text-background" : isActive ? "bg-primary text-background shadow-[0_0_16px_hsl(var(--primary)/0.4)]" : "bg-secondary text-muted-foreground"}`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : n}
                      </motion.div>
                      <span className={`text-xs font-medium ${isActive ? "text-primary" : isDone ? "text-accent" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                    {idx < stepLabels.length - 1 && <div className={`w-10 h-0.5 mb-4 rounded-full transition-all duration-500 ${isDone ? "bg-accent" : "bg-border"}`} />}
                  </div>
                );
              })}
            </motion.div>
          )}

          <div className="flex justify-center">
            <AnimatePresence mode="wait">

              {/* STEP 1 — Patient Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.95 }} transition={{ duration: 0.4, type: "spring" }} className="w-full max-w-lg">
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border p-10 space-y-6"
                    style={isLight ? {
                      background: "hsl(40,18%,97%)",
                      border: "1px solid hsl(40,22%,74%)",
                      boxShadow: "0 4px 24px hsl(152,22%,25%,0.09)",
                    } : {
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 8px 40px rgba(59,130,246,0.15), 0 2px 12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={isLight
                          ? { background: "hsl(40,45%,88%)", border: "1px solid hsl(40,40%,74%)" }
                          : { background: "hsl(var(--accent)/0.1)" }
                        }
                      >
                        <User className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold" style={{ color: isLight ? "hsl(150,30%,12%)" : undefined }}>{t("up.patientInfo")}</h2>
                        <p className="text-sm" style={{ color: isLight ? "hsl(150,16%,38%)" : undefined }}>{t("up.required")}</p>
                      </div>
                    </div>

                    {/* Nom */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm" style={{ color: isLight ? "hsl(150,18%,34%)" : undefined }}>
                        <User className="w-3.5 h-3.5 text-accent" /> {t("up.patientName")}
                        <span className="text-accent text-xs">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder={lang === "fr" ? "ex. Jean Dupont" : "e.g. John Doe"}
                        value={patientName}
                        onChange={(e) => { if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]*$/.test(e.target.value)) setPatientName(e.target.value); }}
                        className="h-11 transition-all duration-300"
                        style={isLight ? { background: "hsl(40,16%,93%)", border: "1px solid hsl(40,22%,72%)", color: "hsl(150,28%,14%)" } : {}}
                      />
                    </motion.div>

                    {/* ID */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm" style={{ color: isLight ? "hsl(150,18%,34%)" : undefined }}>
                        <Hash className="w-3.5 h-3.5 text-accent" /> {t("up.patientId")}
                      </Label>
                      <Input
                        type="text"
                        placeholder={lang === "fr" ? "ex. 123456" : "e.g. 123456"}
                        value={patientId}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setPatientId(e.target.value); }}
                        className="h-11 transition-all duration-300"
                        style={isLight ? { background: "hsl(40,16%,93%)", border: "1px solid hsl(40,22%,72%)", color: "hsl(150,28%,14%)" } : {}}
                      />
                    </motion.div>

                    {/* Date — Calendrier */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm" style={{ color: isLight ? "hsl(150,18%,34%)" : undefined }}>
                        <Calendar className="w-3.5 h-3.5 text-accent" /> {t("up.scanDate")}
                      </Label>

                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full h-11 px-4 rounded-md flex items-center justify-between text-sm transition-all duration-300"
                            style={isLight ? {
                              background: "hsl(40,16%,93%)",
                              border: calendarOpen ? "1px solid hsl(152,35%,42%)" : "1px solid hsl(40,22%,72%)",
                              color: scanDateObj ? "hsl(150,28%,14%)" : "hsl(150,16%,48%)",
                              boxShadow: calendarOpen ? "0 0 0 3px hsl(152,35%,42%,0.14)" : "none",
                              borderRadius: "calc(var(--radius) - 2px)",
                            } : {
                              background: "rgba(255,255,255,0.03)",
                              border: calendarOpen ? "1px solid rgba(59,130,246,0.75)" : "1px solid hsl(var(--border))",
                              color: scanDateObj ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                              boxShadow: calendarOpen ? "0 0 0 3px rgba(59,130,246,0.15)" : "none",
                              borderRadius: "calc(var(--radius) - 2px)",
                            }}
                          >
                            <span>
                              {scanDateObj
                                ? format(scanDateObj, "dd / MM / yyyy")
                                : lang === "fr" ? "jj / mm / aaaa" : "dd / mm / yyyy"}
                            </span>
                            <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: isLight ? "hsl(40,55%,38%)" : "rgba(245,158,11,0.8)" }} />
                          </button>
                        </PopoverTrigger>

                        <PopoverContent
                          className="p-0 w-auto ns-cal-wrap"
                          align="start"
                          sideOffset={6}
                          style={isLight ? {
                            background: "hsl(40,20%,96%)",
                            border: "1px solid hsl(40,22%,72%)",
                            borderRadius: "16px",
                            boxShadow: "0 12px 40px hsl(152,22%,25%,0.14), 0 2px 8px hsl(40,20%,50%,0.08)",
                            overflow: "hidden",
                          } : {
                            background: "linear-gradient(135deg, #080e1f 0%, #0d1530 100%)",
                            border: "1px solid rgba(59,130,246,0.28)",
                            borderRadius: "16px",
                            boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 0 40px rgba(59,130,246,0.12)",
                            overflow: "hidden",
                          }}
                        >
                          {/* Header calendrier */}
                          <div
                            className="flex items-center gap-2 px-5 py-3"
                            style={isLight ? {
                              borderBottom: "1px solid hsl(40,22%,78%)",
                              background: "hsl(40,22%,92%)",
                            } : {
                              borderBottom: "1px solid rgba(245,158,11,0.18)",
                              background: "rgba(245,158,11,0.05)",
                            }}
                          >
                            <Calendar className="w-3.5 h-3.5" style={{ color: isLight ? "hsl(40,55%,38%)" : "#f59e0b" }} />
                            <span style={{
                              color: isLight ? "hsl(40,55%,32%)" : "#f59e0b",
                              fontSize: "11px", fontWeight: 700, letterSpacing: "0.09em"
                            }}>
                              {lang === "fr" ? "DATE DU SCAN" : "SCAN DATE"}
                            </span>
                          </div>

                          {/* DayPicker */}
                          <div className="p-3 ns-cal">
                            <DayPicker
                              mode="single"
                              selected={scanDateObj}
                              onSelect={(date) => {
                                setScanDateObj(date);
                                setScanDate(date ? format(date, "dd/MM/yyyy") : "");
                                setCalendarOpen(false);
                              }}
                              locale={lang === "fr" ? fr : enUS}
                              showOutsideDays
                            />
                          </div>

                          {/* Footer */}
                          <div
                            className="flex justify-end px-4 py-2"
                            style={{ borderTop: isLight ? "1px solid hsl(40,22%,78%)" : "1px solid rgba(59,130,246,0.12)" }}
                          >
                            <button
                              type="button"
                              onClick={() => { setScanDateObj(undefined); setScanDate(""); setCalendarOpen(false); }}
                              className="text-xs px-3 py-1.5 rounded-md transition-all duration-200"
                              style={isLight ? {
                                color: "hsl(150,16%,42%)",
                                border: "1px solid hsl(40,20%,76%)",
                                background: "transparent",
                              } : {
                                color: "rgba(255,255,255,0.4)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "transparent",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = isLight ? "hsl(150,30%,18%)" : "#ffffff";
                                e.currentTarget.style.borderColor = isLight ? "hsl(40,25%,60%)" : "rgba(255,255,255,0.2)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = isLight ? "hsl(150,16%,42%)" : "rgba(255,255,255,0.4)";
                                e.currentTarget.style.borderColor = isLight ? "hsl(40,20%,76%)" : "rgba(255,255,255,0.08)";
                              }}
                            >
                              {lang === "fr" ? "Effacer" : "Clear"}
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </motion.div>

                    <div
                      className="pt-4 flex items-center justify-between"
                      style={{ borderTop: `1px solid ${isLight ? "hsl(40,22%,78%)" : "hsl(var(--border))"}` }}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-xs" style={{ color: isLight ? "hsl(150,16%,38%)" : undefined }}>{t("up.aiReady")}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (!patientName.trim()) {
                            toast.error(lang === "fr" ? "Veuillez entrer le nom du patient." : "Please enter the patient name.");
                            return;
                          }
                          setStep(2);
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-primary-foreground"
                        style={isLight ? {
                          background: "linear-gradient(135deg, hsl(152,38%,32%), hsl(40,58%,36%))",
                          color: "white",
                        } : {
                          backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        }}
                      >
                        {t("up.next")} <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 2 — Symptoms */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.95 }} transition={{ duration: 0.4, type: "spring" }} className="w-full max-w-2xl">
                  <div
                    className="rounded-3xl border overflow-hidden"
                    style={{
                      background: s2bg,
                      borderColor: s2border,
                      boxShadow: s2shadow,
                    }}
                  >
                    {/* Header step 2 */}
                    <div className="relative px-8 pt-8 pb-6 overflow-hidden">
                      {!isLight && (
                        <>
                          <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(245,158,11,0.06)" }} />
                          <div className="absolute top-0 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(59,130,246,0.06)" }} />
                        </>
                      )}
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <motion.div
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                              style={isLight ? {
                                background: "hsl(40,35%,88%)",
                                border: "1px solid hsl(40,30%,74%)",
                              } : {
                                background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(59,130,246,0.2))",
                                border: "1px solid rgba(245,158,11,0.3)",
                                boxShadow: "0 0 20px rgba(245,158,11,0.15)",
                              }}
                            >
                              🧬
                            </motion.div>
                            <motion.div
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
                              style={isLight ? {
                                background: "hsl(152,35%,45%)",
                                border: `2px solid hsl(40,22%,94%)`,
                              } : {
                                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                                border: "2px solid #0a0f1e",
                              }}
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold" style={{ color: s2text }}>{t("up.clinical")}</h2>
                            <p className="text-sm" style={{ color: s2sub }}>{t("up.selectSymptoms")}</p>
                          </div>
                        </div>

                        {selectedSymptoms.length > 0 && (
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-right">
                            <div className="text-xs mb-1" style={{ color: isLight ? "hsl(150,16%,42%)" : "rgba(255,255,255,0.4)" }}>{t("up.riskLevel")}</div>
                            <div className="flex items-center gap-1.5">
                              {[...Array(5)].map((_, i) => {
                                const risk = Math.min(5, highCount * 2 + medCount);
                                return (
                                  <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }} className="w-2 rounded-full"
                                    style={{ height: `${12 + i * 4}px`, background: i < risk ? (risk >= 4 ? "#ef4444" : risk >= 2 ? "#f59e0b" : "#3b82f6") : isLight ? "hsl(40,15%,80%)" : "rgba(255,255,255,0.1)" }}
                                  />
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {selectedSymptoms.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mt-5">
                          {[
                            { count: highCount, label: lang === "fr" ? "Critique" : "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
                            { count: medCount,  label: lang === "fr" ? "Modéré" : "Moderate",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
                            { count: lowCount,  label: lang === "fr" ? "Léger" : "Minor",       color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
                          ].map((s) => s.count > 0 && (
                            <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                              <span className="text-base font-bold">{s.count}</span> {s.label}
                            </div>
                          ))}
                          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: isLight ? "hsl(40,15%,86%)" : "rgba(255,255,255,0.05)", color: isLight ? "hsl(150,16%,38%)" : "rgba(255,255,255,0.5)" }}>
                            {selectedSymptoms.length} / {SYMPTOMS.length} {t("up.selected")}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div style={{ height: "1px", background: s2divider }} />

                    {/* Liste symptômes */}
                    <div className="p-6 grid grid-cols-1 gap-2.5">
                      {SYMPTOMS.map((symptom, i) => {
                        const checked = selectedSymptoms.includes(symptom.label);
                        const cfg = severityConfig[symptom.severity as keyof typeof severityConfig];
                        const severityLabel = lang === "fr" ? cfg.labelFr : cfg.labelEn;
                        const isHovered = hoveredSymptom === symptom.label;
                        return (
                          <motion.button
                            key={symptom.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, type: "spring" }}
                            onClick={() => toggleSymptom(symptom.label)}
                            onHoverStart={() => setHoveredSymptom(symptom.label)}
                            onHoverEnd={() => setHoveredSymptom(null)}
                            whileTap={{ scale: 0.98 }}
                            className="relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 overflow-hidden"
                            style={{
                              background: checked
                                ? isLight ? `${cfg.color}12` : `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}08)`
                                : isLight
                                  ? isHovered ? "hsl(40,18%,90%)" : "hsl(40,15%,93%)"
                                  : isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                              border: `1px solid ${checked
                                ? cfg.color + "50"
                                : isLight
                                  ? isHovered ? "hsl(40,22%,74%)" : "hsl(40,18%,82%)"
                                  : isHovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                              boxShadow: checked
                                ? isLight ? `0 2px 12px ${cfg.color}22` : `0 0 20px ${cfg.glow}, inset 0 1px 0 ${cfg.color}20`
                                : "none",
                            }}
                          >
                            <motion.div animate={checked ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="text-xl w-8 flex-shrink-0 text-center">
                              {symptom.icon}
                            </motion.div>
                            <span className="flex-1 text-sm font-medium leading-snug" style={{ color: checked ? s2text : isLight ? "hsl(150,18%,36%)" : "rgba(255,255,255,0.6)" }}>
                              {symptom.label}
                            </span>
                            <div className="flex-shrink-0 flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                {severityLabel}
                              </span>
                              <motion.div
                                animate={checked ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.25 }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: checked ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` : isLight ? "hsl(40,15%,86%)" : "rgba(255,255,255,0.06)",
                                  border: `1.5px solid ${checked ? cfg.color : isLight ? "hsl(40,22%,72%)" : "rgba(255,255,255,0.15)"}`,
                                  boxShadow: checked ? `0 0 12px ${cfg.glow}` : "none",
                                }}
                              >
                                {checked && (
                                  <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }} className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </motion.svg>
                                )}
                              </motion.div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {highCount >= 2 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-6 mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
                          <p className="text-xs" style={{ color: "rgba(239,68,68,0.9)" }}>{t("up.highSymptoms")}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="px-8 pb-8">
                      <div style={{ height: "1px", background: s2divider, marginBottom: "20px" }} />
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setStep(1)}
                          className="text-sm transition-colors"
                          style={{ color: isLight ? "hsl(150,16%,42%)" : "rgba(255,255,255,0.4)" }}
                          onMouseEnter={e => e.currentTarget.style.color = isLight ? "hsl(150,28%,18%)" : "rgba(255,255,255,0.8)"}
                          onMouseLeave={e => e.currentTarget.style.color = isLight ? "hsl(150,16%,42%)" : "rgba(255,255,255,0.4)"}
                        >
                          {t("up.back")}
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setStep(3)}
                          className="relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm overflow-hidden"
                          style={isLight ? {
                            background: "linear-gradient(135deg, hsl(152,38%,32%), hsl(152,32%,42%), hsl(40,58%,36%))",
                            color: "#fff",
                            boxShadow: "0 4px 20px hsl(152,35%,32%,0.3)",
                          } : {
                            background: "linear-gradient(135deg, #f59e0b, #d97706, #3b82f6)",
                            color: "#fff",
                            boxShadow: "0 0 30px rgba(245,158,11,0.3), 0 0 60px rgba(59,130,246,0.15)",
                          }}
                        >
                          <span className="relative">{t("up.continue")}</span>
                          <ChevronRight className="w-4 h-4 relative" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — IRM Upload (intouché) */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.95 }} transition={{ duration: 0.4, type: "spring" }} className="w-full max-w-xl">
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="rounded-2xl bg-card border border-primary/30 p-10 space-y-6" style={{ boxShadow: "0 0 60px rgba(59,130,246,0.2), 0 8px 40px rgba(59,130,246,0.12), 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <Scan className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold">{t("up.irmUpload")}</h2>
                        <p className="text-sm text-muted-foreground">{t("up.dropScan")}</p>
                      </div>
                    </div>
                    <motion.div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      whileHover={!preview ? { scale: 1.01 } : {}}
                      className={`relative rounded-2xl border-2 border-dashed transition-all duration-500 overflow-hidden ${isDragging ? "border-accent bg-accent/5 shadow-[0_0_40px_hsl(var(--accent)/0.25)]" : preview ? "border-border p-4" : "border-primary/40 hover:border-primary/70 p-14"}`}
                      style={!preview && !isDragging ? { background: "linear-gradient(135deg, rgba(59,130,246,0.04), rgba(245,158,11,0.04))" } : {}}
                    >
                      {preview ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }} className="relative">
                          <div className="relative rounded-xl overflow-hidden group">
                            <motion.img src={preview} alt="MRI Preview" className="w-full max-h-[320px] object-contain rounded-xl" />
                            <motion.div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <motion.div className="absolute left-0 right-0 h-0.5 bg-accent/40" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                          </div>
                          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => { setFile(null); setPreview(null); }} className="absolute top-6 right-6 w-9 h-9 bg-background/90 backdrop-blur-md rounded-full flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-lg">
                            <X className="w-4 h-4" />
                          </motion.button>
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileImage className="w-4 h-4 text-accent" />
                              <span className="truncate max-w-[200px]">{file?.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{(file!.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex items-center gap-1 text-xs text-accent">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {lang === "fr" ? "Prêt" : "Ready"}
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      ) : (
                        <div className="text-center relative z-10">
                          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <Upload className="w-12 h-12 text-primary" />
                          </motion.div>
                          <h3 className="font-display text-2xl font-semibold mb-2">
                            {lang === "fr" ? <>Glisser & Déposer le <span className="text-accent">Scan IRM</span></> : <>Drag & Drop <span className="text-accent">MRI Scan</span></>}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-6">{t("up.formats")}</p>
                          <label>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                            <Button variant="outline" asChild className="gap-2 border-primary/40 hover:border-primary/70 hover:bg-primary/5 transition-all duration-300 h-11 px-6">
                              <span className="cursor-pointer"><FileImage className="w-4 h-4" /> {t("up.browse")}</span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </motion.div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("up.back")}</button>
                      {file && (
                        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze} whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(59,130,246,0.3)" }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-primary-foreground" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}><Sparkles className="w-4 h-4" /></motion.div>
                          {t("up.startAnalysis")} <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 4 — Analysis (intouché) */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 100 }} className="w-full max-w-2xl">
                  <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
                    <div className="relative p-8 text-center border-b border-border overflow-hidden">
                      <motion.div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))" }} animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 3, repeat: Infinity }} />
                      <div className="relative z-10">
                        <div className="relative w-32 h-32 mx-auto mb-6">
                          <motion.div className="absolute inset-0 rounded-full" style={{ border: "3px solid hsl(var(--accent) / 0.3)" }} animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                          <motion.div className="absolute inset-2 rounded-full border-2 border-primary/20" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                          <motion.div className="absolute inset-3 rounded-full" style={{ border: "3px solid transparent", borderTopColor: "hsl(var(--primary))", borderRightColor: "hsl(var(--accent))" }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}><Brain className="w-14 h-14 text-primary" /></motion.div>
                          </div>
                        </div>
                        <h3 className="font-display text-2xl font-bold mb-2">
                          {lang === "fr" ? <>Analyse du <span className="text-accent">Scan IRM</span></> : <>Analyzing <span className="text-accent">MRI Scan</span></>}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t("up.analyzingDesc")}</p>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="mb-8">
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-muted-foreground">{t("up.progress")}</span>
                          <motion.span key={Math.round(progress)} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-display font-bold text-accent">{Math.min(Math.round(progress), 100)}%</motion.span>
                        </div>
                        <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
                          <motion.div className="h-full rounded-full relative" style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.3 }}>
                            <motion.div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                          </motion.div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {analysisStepsData.map((astep, i) => {
                          const isActive = i === activeStep;
                          const isDone = i < activeStep;
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.15, duration: 0.4 }} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${isActive ? "bg-primary/5 border border-primary/20" : isDone ? "bg-accent/5" : ""}`}>
                              <motion.div animate={isActive ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDone ? "bg-accent/20" : isActive ? "bg-primary/20" : "bg-secondary"}`}>
                                {isDone ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <astep.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />}
                              </motion.div>
                              <span className={`text-sm font-medium ${isDone ? "text-accent" : isActive ? "text-foreground" : "text-muted-foreground"}`}>{astep.text}</span>
                              {isActive && (
                                <motion.div className="ml-auto flex gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                  {[0, 1, 2].map((d) => (<motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }} />))}
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Feature badges */}
          {step < 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-wrap justify-center gap-4 mt-10">
              {features.map((f, i) => (
                <motion.div key={f.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.1, type: "spring" }} whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl border cursor-default"
                  style={isLight ? {
                    background: "hsl(40,18%,96%)",
                    border: "1px solid hsl(40,22%,76%)",
                    boxShadow: "0 2px 12px hsl(152,20%,25%,0.07)",
                  } : {
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  }}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><f.icon className="w-4 h-4 text-accent" /></div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: isLight ? "hsl(150,28%,14%)" : undefined }}>{f.label}</div>
                    <div className="text-xs" style={{ color: isLight ? "hsl(150,16%,36%)" : undefined }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UploadPage;