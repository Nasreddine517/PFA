import { motion } from "framer-motion";
import { Upload, Cpu, FileCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const HowItWorks = () => {
  const { lang } = useTheme();

  const steps = [
    {
      icon: Upload,
      step: "01",
      title: lang === "fr" ? "Téléverser le Scan IRM" : "Upload MRI Scan",
      description: lang === "fr"
        ? "Téléversez le scan IRM cérébral du patient dans n'importe quel format d'imagerie médicale standard."
        : "Upload the patient's brain MRI scan in any standard medical imaging format.",
      color: "from-primary/20 to-primary/5",
    },
    {
      icon: Cpu,
      step: "02",
      title: lang === "fr" ? "Analyse par IA" : "AI Analysis",
      description: lang === "fr"
        ? "Notre modèle d'apprentissage profond analyse le scan, détectant les anomalies et tumeurs potentielles."
        : "Our deep learning model analyzes the scan, detecting anomalies and potential tumors.",
      color: "from-accent/20 to-accent/5",
    },
    {
      icon: FileCheck,
      step: "03",
      title: lang === "fr" ? "Obtenir le Rapport" : "Get Report",
      description: lang === "fr"
        ? "Recevez un rapport médical détaillé avec la localisation, la classification et le score de confiance."
        : "Receive a detailed medical report with tumor location, classification, and confidence score.",
      color: "from-primary/20 to-accent/5",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
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
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent mb-4"
          >
            {lang === "fr" ? "COMMENT ÇA FONCTIONNE" : "HOW IT WORKS"}
          </motion.span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            {lang === "fr"
              ? <>{lang === "fr" ? "Trois Étapes vers le " : "Three Steps to "}<span className="text-gradient">{lang === "fr" ? "Diagnostic" : "Diagnosis"}</span></>
              : <>Three Steps to <span className="text-gradient">Diagnosis</span></>}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {lang === "fr"
              ? "Détection du cancer cérébral simple, rapide et précise grâce à l'IA."
              : "Simple, fast, and accurate AI-powered brain cancer detection."}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          <div className="hidden md:block absolute top-28 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30" />
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, type: "spring", stiffness: 80 }}
              whileHover={{ y: -10 }}
              className="relative text-center group"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 + 0.3, type: "spring", stiffness: 200 }}
                className="font-display text-7xl font-bold text-accent/20 mb-4"
              >
                {item.step}
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-glow`}
              >
                <item.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
