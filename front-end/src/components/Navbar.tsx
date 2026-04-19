import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Menu, X, LogOut, User, Sun, Moon, Languages } from "lucide-react";
import AnimatedButton from "@/components/AnimatedButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, lang, toggleLang, t } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user
    ? [
        { label: t("nav.home"), path: "/" },
        { label: t("nav.dashboard"), path: "/dashboard" },
        { label: t("nav.analyze"), path: "/upload" },
      ]
    : [{ label: t("nav.home"), path: "/" }];

  const handleSignOut = async () => {
    await signOut();
    toast.success(lang === "fr" ? "Déconnecté avec succès" : "Signed out successfully");
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="fixed top-0 left-0 right-0 z-50 bg-glass"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
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

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary"
            >
              {location.pathname === item.path && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <span className={`relative z-10 ${location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "fr" ? "ENG" : "FR"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200"
          >
            <AnimatePresence mode="wait">
              {theme === "dark" ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {user ? (
            <>
              <Link to="/upload">
                <AnimatedButton size="sm">{t("nav.start")}</AnimatedButton>
              </Link>
              <Link to="/profile">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center justify-center rounded-full border border-primary/25 bg-background/90 p-0.5"
                >
                  <Avatar className="w-9 h-9">
                    {user.profileImage ? (
                      <AvatarImage src={user.profileImage} alt="Doctor avatar" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </motion.button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 text-muted-foreground">
                <LogOut className="w-4 h-4" /> {t("nav.signout")}
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <AnimatedButton size="sm">{t("nav.signin")}</AnimatedButton>
            </Link>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-glass border-t border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item, i) => (
                <motion.div key={item.path} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium ${location.pathname === item.path ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <div className="flex gap-2 mt-1">
                <button onClick={toggleLang} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground">
                  <Languages className="w-3.5 h-3.5" /> {lang === "fr" ? "ENG" : "FR"}
                </button>
                <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs text-muted-foreground">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
              {user ? (
                <>
                  <Link to="/upload" onClick={() => setMobileOpen(false)}>
                    <AnimatedButton className="w-full mt-2" size="sm">{t("nav.start")}</AnimatedButton>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 mt-1">
                    <LogOut className="w-4 h-4" /> {t("nav.signout")}
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <AnimatedButton className="w-full mt-2" size="sm">{t("nav.signin")}</AnimatedButton>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
