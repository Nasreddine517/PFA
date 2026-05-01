import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Shield, Zap, Target, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedButton from "@/components/AnimatedButton";
import { AnimatedParagraph } from "@/components/AnimatedText";
import { useTheme } from "@/contexts/ThemeContext";
import brainBg from "@/assets/brain-hero-bg.png";

const AnimatedECG = () => {
  const [cycle, setCycle] = useState(0);

  const startY = 175;
  const stepY  = 22;
  const maxY   = 820; // descend jusqu'en bas de la page
  const y = startY + ((cycle * stepY) % (maxY - startY));

  const ecgPath = `
    M 0 ${y}
    L 50 ${y} L 75 ${y}
    L 93 ${y-42} L 108 ${y+48} L 121 ${y-78} L 134 ${y+42} L 147 ${y}
    L 195 ${y} L 230 ${y}
    L 245 ${y-16} L 255 ${y+20} L 265 ${y}
    L 375 ${y} L 435 ${y}
    L 453 ${y-24} L 465 ${y+28} L 477 ${y-58} L 489 ${y+22} L 501 ${y}
    L 575 ${y} L 675 ${y} L 715 ${y}
    L 733 ${y-24} L 745 ${y+32} L 757 ${y-58} L 769 ${y+26} L 781 ${y}
    L 835 ${y} L 895 ${y}
    L 911 ${y-18} L 921 ${y+22} L 931 ${y}
    L 1015 ${y} L 1055 ${y}
    L 1073 ${y-26} L 1085 ${y+34} L 1097 ${y-62} L 1109 ${y+28} L 1121 ${y}
    L 1175 ${y} L 1235 ${y}
    L 1251 ${y-15} L 1261 ${y+20} L 1271 ${y}
    L 1440 ${y}
  `;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="medGrid" width="55" height="55" patternUnits="userSpaceOnUse">
          <path d="M 55 0 L 0 0 0 55" fill="none" stroke="hsl(152,28%,48%)" strokeWidth="0.4" opacity="0.28"/>
        </pattern>
      </defs>
      <rect width="1440" height="900" fill="url(#medGrid)" />

      {/* ECG boucle — se dessine, s'efface, descend, recommence */}
      <motion.path
        key={cycle}
        d={ecgPath}
        fill="none"
        stroke="hsl(40,60%,42%)"
        strokeWidth="1.7"
        initial={{ pathLength: 0, opacity: 0.75 }}
        animate={{ pathLength: 1, opacity: [0.75, 0.75, 0] }}
        transition={{
          pathLength: { duration: 3.5, ease: "easeInOut" },
          opacity: { duration: 3.5, times: [0, 0.72, 1], ease: "easeInOut" },
        }}
        onAnimationComplete={() => setCycle(c => c + 1)}
      />

      {/* Cercle cible grand haut gauche */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
        <circle cx="90" cy="310" r="110" fill="none" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.35" />
        <circle cx="90" cy="310" r="78"  fill="none" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.35" />
        <circle cx="90" cy="310" r="46"  fill="none" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.35" />
        <circle cx="90" cy="310" r="14"  fill="none" stroke="hsl(40,45%,48%)" strokeWidth="1.1" opacity="0.45" />
        <line x1="90"  y1="188" x2="90"  y2="252" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.42" />
        <line x1="90"  y1="368" x2="90"  y2="432" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.42" />
        <line x1="-32" y1="310" x2="32"  y2="310" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.42" />
        <line x1="148" y1="310" x2="212" y2="310" stroke="hsl(40,45%,48%)" strokeWidth="0.9" opacity="0.42" />
      </motion.g>

      {/* Grand cercle halo gauche */}
      <motion.circle cx="80" cy="560" r="170"
        fill="none" stroke="hsl(40,35%,52%)" strokeWidth="0.7" opacity="0.18"
        initial={{ opacity: 0 }} animate={{ opacity: 0.18 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />

      {/* Grand cercle halo droite */}
      <motion.circle cx="1380" cy="400" r="185"
        fill="none" stroke="hsl(152,25%,52%)" strokeWidth="0.7" opacity="0.18"
        initial={{ opacity: 0 }} animate={{ opacity: 0.18 }}
        transition={{ duration: 1.5, delay: 0.7 }}
      />

      {/* Cercle cible petit bas droite */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }}>
        <circle cx="1360" cy="680" r="60" fill="none" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.32" />
        <circle cx="1360" cy="680" r="38" fill="none" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.32" />
        <circle cx="1360" cy="680" r="18" fill="none" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.32" />
        <circle cx="1360" cy="680" r="5"  fill="hsl(152,28%,50%)"               opacity="0.28" />
        <line x1="1360" y1="612" x2="1360" y2="634" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.36" />
        <line x1="1360" y1="726" x2="1360" y2="748" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.36" />
        <line x1="1292" y1="680" x2="1314" y2="680" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.36" />
        <line x1="1406" y1="680" x2="1428" y2="680" stroke="hsl(152,28%,50%)" strokeWidth="0.9" opacity="0.36" />
      </motion.g>
    </svg>
  );
};

const FloatingCross = () => (
  <motion.div
    className="absolute pointer-events-none z-10"
    style={{ top: "80px", right: "48px" }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 0.6, scale: 1, y: [0, -14, 0] }}
    transition={{
      opacity: { duration: 0.8, delay: 1 },
      scale:   { duration: 0.8, delay: 1 },
      y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
    }}
  >
    <svg width="88" height="88" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
      <rect x="33" y="0"  width="22" height="88" rx="6" fill="hsl(152,32%,50%)" />
      <rect x="0"  y="33" width="88" height="22" rx="6" fill="hsl(152,32%,50%)" />
    </svg>
  </motion.div>
);

const HeroSection = () => {
  const { lang, theme } = useTheme();

  const stats = [
    { value: "99.2%", label: lang === "fr" ? "Précision de Détection" : "Detection Accuracy" },
    { value: "<30s",  label: lang === "fr" ? "Temps d'Analyse"        : "Analysis Time"       },
    { value: "50K+",  label: lang === "fr" ? "Scans Analysés"         : "Scans Analyzed"      },
  ];

  const pills = [
    { icon: Zap,    text: lang === "fr" ? "Analyse en Temps Réel" : "Real-time Analysis" },
    { icon: Target, text: lang === "fr" ? "Localisation Tumorale" : "Tumor Localization" },
    { icon: Shield, text: lang === "fr" ? "Conforme HIPAA"        : "HIPAA Compliant"    },
  ];

  const line1 = lang === "fr"
    ? [
        { word: "Détecter", green: false },
        { word: "le",       green: false },
        { word: "Cancer",   green: true  },
        { word: "Cérébral", green: false },
      ]
    : [
        { word: "Detect", green: false },
        { word: "Brain",  green: false },
        { word: "Cancer", green: true  },
      ];

  const line2Words = lang === "fr"
    ? [
        { word: "Avant" },
        { word: "Qu'il" },
        { word: "Ne"    },
        { word: "Soit"  },
        { word: "Trop"  },
        { word: "Tard"  },
      ]
    : [
        { word: "Before" },
        { word: "It's"   },
        { word: "Too"    },
        { word: "Late"   },
      ];

  const line2Gradient = theme === "light"
    ? "linear-gradient(90deg, hsl(40,65%,30%) 0%, hsl(45,70%,33%) 40%, hsl(50,65%,29%) 100%)"
    : "linear-gradient(90deg, hsl(217,70%,80%) 0%, hsl(217,91%,65%) 35%, hsl(43,95%,58%) 70%, hsl(47,100%,62%) 100%)";

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 z-0">

        <img
          src={brainBg}
          alt=""
          className="w-full h-full object-contain opacity-70"
          style={{ display: theme === "light" ? "none" : "block" }}
        />

        {theme === "light" && (
          <>
            <div className="absolute inset-0" style={{
              background: "linear-gradient(180deg, hsl(42,28%,89%) 0%, hsl(58,16%,87%) 20%, hsl(98,14%,86%) 50%, hsl(138,18%,83%) 75%, hsl(152,22%,81%) 100%)"
            }} />
            <AnimatedECG />
          </>
        )}

        {theme === "dark" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_85%)]" />
          </>
        )}
      </div>

      {theme === "light" && <FloatingCross />}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

            {/* Badge */}
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

            {/* TITLE */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">

              <motion.div
                className="flex flex-wrap justify-center gap-x-4 mb-3"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
                  hidden: {},
                }}
              >
                {line1.map(({ word, green }, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden:  { opacity: 0, y: 50, filter: "blur(8px)" },
                      visible: { opacity: 1, y: 0,  filter: "blur(0px)" },
                    }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block"
                    style={green && theme === "light" ? { color: "hsl(152,42%,24%)" } : undefined}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.div>

              <motion.div
                className="flex flex-wrap justify-center gap-x-3"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.75 } },
                  hidden: {},
                }}
                style={{
                  backgroundImage: line2Gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {line2Words.map(({ word }, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden:  { opacity: 0, y: 40, scale: 0.8 },
                      visible: { opacity: 1, y: 0,  scale: 1   },
                    }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block font-bold"
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.div>
            </h1>

            <AnimatedParagraph
              text={lang === "fr"
                ? "Téléversez des scans IRM et obtenez une analyse IA instantanée avec localisation tumorale, score de confiance et rapports médicaux personnalisés."
                : "Upload MRI scans and get instant AI-powered analysis with tumor localization, confidence scoring, and personalized medical reports."}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              delay={1.1}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.6 }}
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
            transition={{ delay: 1.5 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.6 + i * 0.15, type: "spring", stiffness: 100 }}
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
          transition={{ delay: 1.9 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-20"
        >
          {pills.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2 + i * 0.1 }}
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
        transition={{ delay: 2.3 }}
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