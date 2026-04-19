import { motion } from "framer-motion";
import { Brain, Github, Twitter, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

const Footer = () => {
  const { lang } = useTheme();

  const platformLinks = [
    { label: lang === "fr" ? "Tableau de bord" : "Dashboard", to: "/dashboard" },
    { label: lang === "fr" ? "Téléverser un Scan" : "Upload Scan", to: "/upload" },
    { label: lang === "fr" ? "Résultats" : "Results", to: "/results" },
  ];

  return (
    <footer className="border-t border-border py-16 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center"
              >
                <Brain className="w-5 h-5 text-primary" />
              </motion.div>
              <span className="font-display font-bold text-lg text-foreground">
                Neuro<span className="text-primary">Scan</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {lang === "fr"
                ? "Plateforme de détection du cancer cérébral par IA. Aidons les médecins à sauver des vies grâce à une analyse IRM instantanée et précise."
                : "AI-powered brain cancer detection platform. Helping doctors save lives with instant, accurate MRI scan analysis."}
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">
              {lang === "fr" ? "Plateforme" : "Platform"}
            </h4>
            <div className="flex flex-col gap-2">
              {platformLinks.map((link) => (
                <Link key={link.to} to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">
              {lang === "fr" ? "Contact" : "Connect"}
            </h4>
            <div className="flex gap-3">
              {[Github, Twitter, Mail].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NeuroScan.{" "}
            {lang === "fr"
              ? "Outil d'aide au diagnostic — ne remplace pas un avis médical professionnel."
              : "AI-assisted tool — not a substitute for professional medical diagnosis."}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {lang === "fr" ? "Tous les systèmes opérationnels" : "All systems operational"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
