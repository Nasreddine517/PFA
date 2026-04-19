import { motion } from "framer-motion";
import { Brain, FileText, Upload, Activity, Crosshair, Clock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const FeaturesSection = () => {
  const { lang } = useTheme();

  const features = [
    {
      icon: Upload,
      title: lang === "fr" ? "Téléversement Facile" : "Easy Upload",
      description: lang === "fr"
        ? "Glissez-déposez vos scans IRM au format DICOM, PNG ou JPEG pour un traitement instantané."
        : "Drag and drop MRI scans in DICOM, PNG, or JPEG format for instant processing.",
    },
    {
      icon: Brain,
      title: lang === "fr" ? "Détection par IA" : "AI Detection",
      description: lang === "fr"
        ? "Modèle d'apprentissage profond entraîné sur des milliers de scans IRM pour une détection précise."
        : "Deep learning model trained on thousands of MRI scans for accurate cancer detection.",
    },
    {
      icon: Crosshair,
      title: lang === "fr" ? "Localisation Tumorale" : "Tumor Localization",
      description: lang === "fr"
        ? "Détection précise des contours tumoraux avec superposition mise en évidence sur le scan original."
        : "Precise tumor boundary detection with highlighted overlay on the original scan.",
    },
    {
      icon: Activity,
      title: lang === "fr" ? "Score de Confiance" : "Confidence Scoring",
      description: lang === "fr"
        ? "Scores de probabilité et classification du type de tumeur avec métriques détaillées."
        : "Probability scores and classification of tumor type with detailed metrics.",
    },
    {
      icon: FileText,
      title: lang === "fr" ? "Rapports Médicaux" : "Medical Reports",
      description: lang === "fr"
        ? "Rapports personnalisés auto-générés prêts pour la revue clinique et les dossiers patients."
        : "Auto-generated personalized reports ready for clinical review and patient records.",
    },
    {
      icon: Clock,
      title: lang === "fr" ? "Résultats Instantanés" : "Instant Results",
      description: lang === "fr"
        ? "Obtenez une analyse complète en moins de 30 secondes par scan."
        : "Get comprehensive analysis results in under 30 seconds per scan.",
    },
  ];

  const iconColors = [
    "text-blue-500", "text-indigo-500", "text-blue-600",
    "text-amber-500", "text-blue-500", "text-amber-600",
  ];
  const cardAccents = [
    "hover:border-blue-300", "hover:border-indigo-300", "hover:border-blue-400",
    "hover:border-amber-300", "hover:border-blue-300", "hover:border-amber-400",
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4"
          >
            {lang === "fr" ? "FONCTIONNALITÉS" : "FEATURES"}
          </motion.span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            {lang === "fr" ? <>Propulsé par une <span className="text-gradient">IA Avancée</span></> : <>Powered by <span className="text-gradient">Advanced AI</span></>}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {lang === "fr"
              ? "Notre plateforme combine l'apprentissage profond de pointe avec l'expertise clinique pour une détection rapide et précise."
              : "Our platform combines cutting-edge deep learning with clinical expertise to deliver accurate, fast brain cancer detection."}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`group relative p-6 rounded-xl bg-gradient-card border border-border ${cardAccents[i]} transition-colors duration-300 shadow-card overflow-hidden`}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className={`relative w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors`}
              >
                <feature.icon className={`w-6 h-6 ${iconColors[i]}`} />
              </motion.div>
              <h3 className="relative font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;