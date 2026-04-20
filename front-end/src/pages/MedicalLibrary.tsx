import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Brain, Activity, Layers, Pill, Image, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const data = {
  types: [
    { name: "Gliome", grade: "Grade II-IV", description: "Tumeur des cellules gliales. Inclut le glioblastome (GBM), forme la plus agressive.", color: "#ef4444" },
    { name: "Méningiome", grade: "Grade I-II", description: "Tumeur des méninges, souvent bénigne, croissance lente.", color: "#3b82f6" },
    { name: "Tumeur pituitaire", grade: "Grade I-II", description: "Tumeur de l'hypophyse, souvent bénigne. Peut affecter les hormones et la vision.", color: "#f59e0b" },
  ],
  symptoms: [
    { icon: "🧠", title: "Céphalées persistantes", detail: "Maux de tête matinaux intenses, résistants aux antalgiques, souvent aggravés en position couchée." },
    { icon: "👁️", title: "Troubles visuels", detail: "Diplopie, perte du champ visuel périphérique, flou visuel soudain." },
    { icon: "⚡", title: "Crises épileptiques", detail: "Convulsions de novo chez un adulte sans antécédents — signe d'alarme majeur." },
    { icon: "🗣️", title: "Aphasie", detail: "Difficulté à trouver les mots, confusion du langage, troubles de la compréhension." },
    { icon: "🤸", title: "Déficit moteur", detail: "Faiblesse unilatérale d'un membre, troubles de la coordination, démarche instable." },
    { icon: "🧩", title: "Troubles cognitifs", detail: "Changements de personnalité, pertes de mémoire, ralentissement mental progressif." },
  ],
  stages: [
    { stage: "I", color: "#22c55e", title: "Bénin", description: "Croissance lente, cellules quasi normales. Survie > 10 ans. Résection souvent curative.", survival: "> 10 ans" },
    { stage: "II", color: "#84cc16", title: "Bas grade", description: "Légèrement anormal. Peut évoluer. Surveillance rapprochée après chirurgie.", survival: "5–10 ans" },
    { stage: "III", color: "#f59e0b", title: "Malin", description: "Croissance active, infiltration. Chimio + radio nécessaires post-opération.", survival: "2–5 ans" },
    { stage: "IV", color: "#ef4444", title: "Très malin", description: "Croissance rapide, nécrose centrale. Traitement palliatif souvent en priorité.", survival: "12–18 mois" },
  ],
  treatments: [
    { icon: "🔪", name: "Neurochirurgie", detail: "Résection maximale sécurisée de la tumeur. Améliore le pronostic et réduit la masse tumorale." },
    { icon: "☢️", name: "Radiothérapie", detail: "Rayons ciblés post-op (60 Gy standard). Peut être stéréotaxique pour les petites lésions." },
    { icon: "💊", name: "Chimiothérapie", detail: "Témozolomide (TMZ) en standard pour GBM. Bévacizumab pour les récidives." },
    { icon: "🎯", name: "Thérapies ciblées", detail: "Inhibiteurs IDH1/IDH2 pour tumeurs mutées. EGFR inhibiteurs en évaluation." },
    { icon: "🛡️", name: "Immunothérapie", detail: "Checkpoint inhibitors (PD-1/PD-L1) en essais cliniques prometteurs." },
    { icon: "⚡", name: "Champs électriques (TTF)", detail: "Dispositif Optune : champs alternatifs perturbant la division cellulaire. Approuvé GBM." },
  ],
  mri: [
    { label: "T1 sans contraste", desc: "Anatomie de base. Tumeur souvent hypointense (sombre).", color: "#1e3a5f" },
    { label: "T1 avec gadolinium", desc: "Prise de contraste = rupture BHE. Signature des tumeurs malignes.", color: "#1e4a7f" },
    { label: "T2 / FLAIR", desc: "Œdème péritumoral visible. Étendue réelle de l'infiltration.", color: "#1a3a4a" },
    { label: "DWI / ADC", desc: "Diffusion restreinte = haute cellularité = malignité probable.", color: "#2a2a4a" },
    { label: "Spectroscopie MRS", desc: "Pic choline élevé + NAA bas = activité tumorale métabolique.", color: "#1a2a3a" },
    { label: "Perfusion (DSC)", desc: "rCBV augmenté dans les zones de haut grade. Guide la biopsie.", color: "#0f2a3f" },
  ],
};

const Section = ({ icon: Icon, title, children }: any) => {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl overflow-hidden border border-border bg-card"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-lg text-foreground">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MedicalLibrary = () => {
  const { lang } = useTheme();

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1
              className="text-3xl font-bold font-display"
              style={{
                backgroundImage: "linear-gradient(90deg, hsl(217,70%,80%) 0%, hsl(217,91%,65%) 35%, hsl(43,95%,58%) 70%, hsl(47,100%,62%) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {lang === "fr" ? "Bibliothèque Médicale" : "Medical Library"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {lang === "fr" ? "Référence clinique rapide — tumeurs cérébrales" : "Quick clinical reference — brain tumors"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 1. Types */}
      <Section icon={Brain} title={lang === "fr" ? "Types de tumeurs cérébrales" : "Brain Tumor Types"}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.types.map((t) => (
            <div key={t.name} className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: t.color }} />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground text-sm">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>{t.grade}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Symptômes */}
      <Section icon={Activity} title={lang === "fr" ? "Symptômes expliqués" : "Symptoms Explained"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.symptoms.map((s) => (
            <div key={s.title} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{s.icon}</span>
                <span className="font-semibold text-foreground text-sm">{s.title}</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 3. Stades */}
      <Section icon={Layers} title={lang === "fr" ? "Stades de la maladie" : "Disease Stages"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.stages.map((s) => (
            <div key={s.stage} className="p-4 rounded-xl border transition-colors hover:border-primary/30" style={{ borderColor: s.color + "44", backgroundColor: s.color + "08" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: s.color }}>
                  {s.stage}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{s.title}</div>
                  <div className="text-xs font-medium" style={{ color: s.color }}>{lang === "fr" ? "Survie médiane" : "Median survival"} : {s.survival}</div>
                </div>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Traitements */}
      <Section icon={Pill} title={lang === "fr" ? "Traitements possibles" : "Possible Treatments"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.treatments.map((t) => (
            <div key={t.name} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.icon}</span>
                <span className="font-semibold text-foreground text-sm">{t.name}</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. IRM */}
      <Section icon={Image} title={lang === "fr" ? "Séquences IRM — Guide rapide" : "MRI Sequences — Quick Guide"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.mri.map((m) => (
            <div key={m.label} className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color }}>
                IRM
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm mb-1">{m.label}</div>
                <p className="text-muted-foreground text-xs leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default MedicalLibrary;