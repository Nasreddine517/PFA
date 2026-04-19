import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Target, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedButton from "@/components/AnimatedButton";
import { AnimatedTitle, AnimatedParagraph } from "@/components/AnimatedText";
import { useTheme } from "@/contexts/ThemeContext";
import brainBg from "@/assets/brain-hero-bg.png";

const HeroSection = () => {
  const { lang, theme } = useTheme();

  const stats = [
    { value: "99.2%", label: lang === "fr" ? "Précision de Détection" : "Detection Accuracy" },
    { value: "<30s", label: lang === "fr" ? "Temps d'Analyse" : "Analysis Time" },
    { value: "50K+", label: lang === "fr" ? "Scans Analysés" : "Scans Analyzed" },
  ];

  const pills = [
    { icon: Zap, text: lang === "fr" ? "Analyse en Temps Réel" : "Real-time Analysis" },
    { icon: Target, text: lang === "fr" ? "Localisation Tumorale" : "Tumor Localization" },
    { icon: Shield, text: lang === "fr" ? "Conforme HIPAA" : "HIPAA Compliant" },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Dark mode: brain photo bg */}
      {/* Light mode: animated gradient mesh */}
      <div className="absolute inset-0 z-0">
        {/* Photo — hidden in light mode */}
        <img
          src={brainBg}
          alt=""
          className="w-full h-full object-cover opacity-70 dark:block"
          style={{ display: theme === "light" ? "none" : "block" }}
        />

        {/* Light mode decorative background */}
        {theme === "light" && (
          <>
            {/* Animated mesh gradient */}
            <div className="absolute inset-0" style={{
              background: "linear-gradient(160deg, hsl(220,55%,93%) 0%, hsl(217,70%,88%) 35%, hsl(200,60%,90%) 65%, hsl(43,80%,90%) 100%)"
            }} />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "linear-gradient(hsl(217,60%,50%,0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(217,60%,50%,0.15) 1px, transparent 1px)",
              backgroundSize: "60px 60px"
            }} />
            {/* Gold orb top-right */}
            <motion.div
              className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(43,95%,65%,0.25) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 7, repeat: Infinity }}
            />
            {/* Blue orb bottom-left */}
            <motion.div
              className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(217,85%,60%,0.2) 0%, transparent 70%)" }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 9, repeat: Infinity }}
            />
            {/* Center brain-shaped glow */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(217,70%,65%,0.1) 0%, transparent 60%)" }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            {/* Floating neural nodes */}
            {[
              { top: "15%", left: "10%", size: 6, delay: 0 },
              { top: "25%", right: "15%", size: 4, delay: 1 },
              { top: "60%", left: "8%", size: 5, delay: 2 },
              { top: "70%", right: "10%", size: 7, delay: 0.5 },
              { top: "40%", left: "85%", size: 4, delay: 1.5 },
            ].map((dot, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ top: dot.top, left: (dot as any).left, right: (dot as any).right, width: dot.size, height: dot.size, background: i % 2 === 0 ? "hsl(217,85%,55%,0.5)" : "hsl(43,95%,55%,0.5)" }}
                animate={{ y: [0, -15, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 4 + i, repeat: Infinity, delay: dot.delay }}
              />
            ))}
          </>
        )}

        {/* Dark mode overlays */}
        {theme === "dark" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_85%)]" />
          </>
        )}

        {/* Light mode subtle vignette */}
        {theme === "light" && (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, hsl(220,50%,90%,0.3) 100%)" }} />
        )}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-4 h-4 text-accent" />
              </motion.div>
              <span className="text-sm font-medium text-accent">
                {lang === "fr" ? "Imagerie Médicale par IA" : "AI-Powered Medical Imaging"}
              </span>
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <AnimatedTitle text={lang === "fr" ? "Détecter le Cancer Cérébral" : "Detect Brain Cancer"} delay={0.2} />
              <br />
              <motion.span
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-gradient"
              >
                {lang === "fr" ? "Avant Qu'il Ne Soit Trop Tard" : "Before It's Too Late"}
              </motion.span>
            </h1>

            <AnimatedParagraph
              text={lang === "fr"
                ? "Téléversez des scans IRM et obtenez une analyse IA instantanée avec localisation tumorale, score de confiance et rapports médicaux personnalisés."
                : "Upload MRI scans and get instant AI-powered analysis with tumor localization, confidence scoring, and personalized medical reports."}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              delay={0.7}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link to="/upload">
                <AnimatedButton size="lg" className="gap-2 text-base px-8 h-12">
                  {lang === "fr" ? "Téléverser un Scan IRM" : "Upload MRI Scan"}
                  <ArrowRight className="w-4 h-4" />
                </AnimatedButton>
              </Link>
              <Link to="/dashboard">
                <AnimatedButton variant="outline" size="lg" className="text-base px-8 h-12">
                  {lang === "fr" ? "Voir le Tableau de Bord" : "View Dashboard"}
                </AnimatedButton>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="text-center cursor-default"
              >
                <div className="font-display text-2xl md:text-3xl font-bold text-accent">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-20"
        >
          {pills.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 + i * 0.1 }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass cursor-default"
            >
              <Icon className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">{text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-accent/30 flex items-start justify-center p-1.5"
        >
          <motion.div className="w-1.5 h-1.5 rounded-full bg-accent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
