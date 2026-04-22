import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Brain, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedButton from "@/components/AnimatedButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import ParticleBackground from "@/components/ParticleBackground";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { lang } = useTheme();
  const navigate = useNavigate();

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isValidDoctorName = (val: string) => /^Dr\.[A-Za-zÀ-ÖØ-öø-ÿ]+([ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(val.trim());

  const err = (msg: string) => toast.error(msg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        if (!isValidEmail(email)) { err(lang === "fr" ? "Veuillez entrer un email valide." : "Please enter a valid email."); return; }
        if (password.length < 6) { err(lang === "fr" ? "Le mot de passe doit contenir au moins 6 caractères." : "Password must be at least 6 characters."); return; }
        try {
          await signIn(email, password);
          toast.success(lang === "fr" ? "Bienvenue, Docteur !" : "Welcome back, Doctor!");
          navigate("/upload");
        } catch (signInError: any) {
          err(signInError?.message || (lang === "fr" ? "Échec de la connexion." : "Sign in failed."));
          return;
        }
      } else {
        if (!isValidDoctorName(fullName)) { err(lang === "fr" ? "Format requis : Dr.NomComplet (ex: Dr.JeanDupont)" : "Required format: Dr.FullName (e.g. Dr.JohnDoe)"); return; }
        if (!isValidEmail(email)) { err(lang === "fr" ? "Veuillez entrer un email valide." : "Please enter a valid email."); return; }
        if (password.length < 6) { err(lang === "fr" ? "Le mot de passe doit contenir au moins 6 caractères." : "Password must be at least 6 characters."); return; }
        await signUp(email, password, fullName);
        toast.success(lang === "fr" ? "Compte créé avec succès !" : "Account created successfully!");
        navigate("/upload");
      }
    } catch (error: any) {
      err(error.message || (lang === "fr" ? "Erreur d'authentification" : "Authentication failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const tabLabels = lang === "fr" ? ["Connexion", "Créer un compte"] : ["Sign In", "Sign Up"];

  const submitLabel = () => {
    return isLogin
      ? (lang === "fr" ? "Se connecter" : "Sign In")
      : (lang === "fr" ? "Créer le compte" : "Create Account");
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <ParticleBackground />
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      <style>{`
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 20px 60px -10px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.12), 0 0 40px 0px rgba(99,102,241,0.18), 0 20px 60px -10px rgba(0,0,0,0.4); }
        }
        .auth-card { animation: cardPulse 3s ease-in-out infinite; transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .auth-card:hover { animation: none; transform: translateY(-4px) scale(1.012); box-shadow: 0 0 0 3px rgba(99,102,241,0.35), 0 0 60px 0px rgba(99,102,241,0.22), 0 30px 70px -10px rgba(0,0,0,0.5); }
        input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { display: none !important; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative z-10 w-full max-w-md mx-auto flex items-center justify-center px-4"
      >
        <div className="auth-card w-full rounded-2xl bg-gradient-card border border-border p-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Logo — link to home */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <span className="font-display font-bold text-2xl">
              Neuro<span className="text-accent">Scan</span>
            </span>
          </motion.div>

          {/* Tab toggle */}
          <div className="flex rounded-lg bg-secondary/50 p-1 mb-8">
            {tabLabels.map((tab, i) => (
              <motion.button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  (i === 0 ? isLogin : !isLogin) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3.5 h-3.5" /> {lang === "fr" ? "Nom complet" : "Full Name"}
                  </Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr.JeanDupont" required={!isLogin} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="docteur@hopital.com" required />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-3.5 h-3.5" /> {lang === "fr" ? "Mot de passe" : "Password"}
              </Label>
              <Input type="password" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>

            <div className="flex justify-center mt-6">
              <AnimatedButton
                type="submit"
                className="w-full h-12 gap-2 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <>{submitLabel()} <ArrowRight className="w-4 h-4" /></>
                )}
              </AnimatedButton>
            </div>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {isLogin
              ? (lang === "fr" ? "Vous n'avez pas de compte ?" : "Don't have an account?")
              : (lang === "fr" ? "Vous avez déjà un compte ?" : "Already have an account?")}
            {" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
              {isLogin
                ? (lang === "fr" ? "Créer un compte" : "Sign Up")
                : (lang === "fr" ? "Se connecter" : "Sign In")}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
