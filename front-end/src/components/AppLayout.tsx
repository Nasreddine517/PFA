import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Languages } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, lang, toggleLang } = useTheme();
  const isLight = theme === "light";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <header
            className="h-14 flex items-center justify-between border-b sticky top-0 z-40 px-4 backdrop-blur-md"
            style={isLight ? {
              background: "hsl(42,26%,91%,0.95)",
              borderBottom: "1px solid hsl(40,22%,74%)",
            } : {
              background: "hsl(var(--background)/0.80)",
              borderBottom: "1px solid hsl(var(--border))",
            }}
          >
            <SidebarTrigger
              className="transition-colors"
              style={{ color: isLight ? "hsl(150,25%,30%)" : undefined }}
            />

            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={isLight ? {
                  border: "1px solid hsl(40,22%,70%)",
                  color: "hsl(150,28%,28%)",
                  background: "hsl(40,20%,94%)",
                } : {
                  border: "1px solid hsl(var(--border)/0.6)",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <Languages className="w-3.5 h-3.5" />
                {lang === "fr" ? "ENG" : "FR"}
              </motion.button>

              {/* Theme toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                style={isLight ? {
                  border: "1px solid hsl(40,22%,70%)",
                  color: "hsl(150,28%,28%)",
                  background: "hsl(40,20%,94%)",
                } : {
                  border: "1px solid hsl(var(--border)/0.6)",
                  color: "hsl(var(--muted-foreground))",
                }}
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
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}