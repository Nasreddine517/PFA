import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, AlertTriangle, MapPin, FileText,
  Layers, Activity, Brain,
} from "lucide-react";
import { PositiveSlice } from "@/lib/analysisApi";
import { useTheme } from "@/contexts/ThemeContext";

interface SlicesState {
  slices: PositiveSlice[];
  patientName?: string;
  resultsId?: string;
}

const SlicesPage = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { t, lang } = useTheme();

  const state       = (location.state || {}) as SlicesState;
  const slices      = state.slices      || [];
  const patientName = state.patientName || "";
  const resultsId   = state.resultsId   || "";

  // Si on arrive sans données, on renvoie aux résultats
  useEffect(() => {
    if (slices.length === 0) {
      navigate(resultsId ? `/results/${resultsId}` : "/results", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () =>
    resultsId ? navigate(`/results/${resultsId}`) : navigate("/results");

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 border-b border-border/40 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--background)/0.96), rgba(239,68,68,0.04))",
        }}
      >
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                       border border-border/50 text-muted-foreground hover:text-foreground
                       hover:border-primary/40 hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === "fr" ? "Résultats" : "Results"}
          </motion.button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <Layers className="w-4 h-4 text-red-400" />
              </div>
              <h1 className="font-bold text-base truncate" style={{ color: "#f87171" }}>
                {t("res.positiveSlicesTitle")}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-9">
              <span className="font-semibold text-red-400">{slices.length}</span>
              &nbsp;{lang === "fr" ? "coupe(s) détectée(s)" : "slice(s) detected"}
              {patientName && (
                <span className="text-muted-foreground/60"> · {patientName}</span>
              )}
            </p>
          </div>

          {/* Brain icon accent */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <Brain className="w-5 h-5 text-red-400" />
          </div>
        </div>
      </div>

      {/* ── Description bar ───────────────────────────────────────── */}
      <div
        className="border-b border-border/30"
        style={{ background: "rgba(239,68,68,0.03)" }}
      >
        <div className="max-w-3xl mx-auto px-5 py-2.5">
          <p className="text-xs text-muted-foreground">{t("res.positiveSlicesDesc")}</p>
        </div>
      </div>

      {/* ── Slices list ───────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
        {slices.map((slice, idx) => {
          const confPct = slice.confidence ?? 0;
          const confColor =
            confPct >= 80
              ? "#f87171"
              : confPct >= 60
              ? "#fb923c"
              : "#facc15";

          const sliceBox = slice.boundingBox
            ? {
                left:   `${slice.boundingBox.x       * 100}%`,
                top:    `${slice.boundingBox.y        * 100}%`,
                width:  `${slice.boundingBox.width    * 100}%`,
                height: `${slice.boundingBox.height   * 100}%`,
              }
            : null;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y:  0 }}
              transition={{ delay: idx * 0.07, type: "spring", stiffness: 180, damping: 22 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--card)/0.8), rgba(239,68,68,0.04))",
                border: "1px solid rgba(239,68,68,0.22)",
                boxShadow:
                  "0 4px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(239,68,68,0.08)",
              }}
            >
              {/* ── Card header ──────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "rgba(239,68,68,0.15)" }}
              >
                <div className="flex items-center gap-3">
                  {/* Index badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                    style={{
                      background: "rgba(239,68,68,0.18)",
                      border: "1px solid rgba(239,68,68,0.35)",
                      color: "#f87171",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === "fr" ? "Coupe" : "Slice"} #{idx + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "fr" ? "Tumeur détectée" : "Tumor detected"}
                    </p>
                  </div>
                </div>

                {/* Confidence pill */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: `${confColor}1a`,
                    border: `1px solid ${confColor}55`,
                    color: confColor,
                  }}
                >
                  <Activity className="w-3 h-3" />
                  {confPct.toFixed(1)}%
                </div>
              </div>

              {/* ── IRM image ────────────────────────────────────── */}
              <div
                className="relative w-full"
                style={{ background: "#060810", minHeight: "260px" }}
              >
                <img
                  src={slice.imageData}
                  alt={`${lang === "fr" ? "Coupe" : "Slice"} ${idx + 1}`}
                  className="w-full object-contain"
                  style={{ maxHeight: "420px", display: "block" }}
                />

                {/* Bounding box overlay */}
                {sliceBox && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute" style={sliceBox}>
                      <div
                        className="absolute inset-0 rounded-md border-2 border-red-400"
                        style={{ boxShadow: "0 0 16px rgba(239,68,68,0.6)" }}
                      />
                      {/* Corner accents */}
                      {[
                        { top: -2, left: -2, borderTop: "3px solid #f87171", borderLeft: "3px solid #f87171" },
                        { top: -2, right: -2, borderTop: "3px solid #f87171", borderRight: "3px solid #f87171" },
                        { bottom: -2, left: -2, borderBottom: "3px solid #f87171", borderLeft: "3px solid #f87171" },
                        { bottom: -2, right: -2, borderBottom: "3px solid #f87171", borderRight: "3px solid #f87171" },
                      ].map((s, ci) => (
                        <div
                          key={ci}
                          className="absolute w-4 h-4"
                          style={s}
                        />
                      ))}
                    </div>
                    {/* Label */}
                    <div
                      className="absolute text-xs font-bold px-2 py-1 rounded-md"
                      style={{
                        left: sliceBox.left,
                        top: `calc(${sliceBox.top} - 26px)`,
                        background: "rgba(239,68,68,0.9)",
                        color: "white",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {lang === "fr" ? "Région Tumorale" : "Tumor Region"}
                    </div>
                  </div>
                )}

                {/* Top-left: slice number */}
                <div
                  className="absolute top-3 left-3 font-mono text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.7)",
                    color: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  #{String(idx + 1).padStart(2, "0")}
                </div>

                {/* Top-right: confidence */}
                <div
                  className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{
                    background: `${confColor}dd`,
                    color: "white",
                    boxShadow: `0 0 12px ${confColor}66`,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {confPct.toFixed(1)}%
                </div>

                {/* Bottom gradient overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(6,8,16,0.85), transparent)",
                  }}
                />
              </div>

              {/* ── Confidence bar ───────────────────────────────── */}
              <div
                className="px-5 py-3 border-t"
                style={{ borderColor: "rgba(239,68,68,0.1)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    {lang === "fr" ? "Niveau de confiance" : "Confidence level"}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: confColor }}
                  >
                    {confPct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ height: "5px", background: "rgba(255,255,255,0.07)" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confPct}%` }}
                    transition={{ delay: idx * 0.07 + 0.3, duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${confColor}88, ${confColor})`,
                      boxShadow: `0 0 8px ${confColor}66`,
                    }}
                  />
                </div>
              </div>

              {/* ── Meta info ────────────────────────────────────── */}
              <div
                className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border-t"
                style={{
                  borderColor: "rgba(239,68,68,0.1)",
                  divideColor: "rgba(239,68,68,0.1)",
                }}
              >
                {/* Tumor type */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {lang === "fr" ? "Type de tumeur" : "Tumor type"}
                    </p>
                    <p className="text-sm font-semibold text-foreground capitalize truncate">
                      {slice.tumorType || "—"}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.25)",
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {lang === "fr" ? "Localisation" : "Location"}
                    </p>
                    <p className="text-sm font-semibold text-foreground capitalize truncate">
                      {slice.tumorLocation || "—"}
                    </p>
                  </div>
                </div>

                {/* File name */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {lang === "fr" ? "Fichier source" : "Source file"}
                    </p>
                    <p
                      className="text-xs font-mono text-foreground/70 truncate"
                      title={slice.fileName}
                    >
                      {slice.fileName}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default SlicesPage;