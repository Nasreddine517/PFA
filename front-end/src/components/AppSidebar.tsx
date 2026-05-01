import { Brain, BarChart3, Home, LogOut, Scan, BookOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, lang, theme } = useTheme();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: null,
    avatar_url: null,
  });

  const navItems = [
    { title: t("sidebar.home"),      url: "/",          icon: Home      },
    { title: t("sidebar.analyze"),   url: "/upload",    icon: Scan      },
    { title: t("sidebar.dashboard"), url: "/dashboard", icon: BarChart3 },
    { title: lang === "fr" ? "Bibliothèque" : "Medical Library", url: "/library", icon: BookOpen },
  ];

  useEffect(() => {
    if (!user) return;
    setProfile({
      display_name: user.fullName || user.email || null,
      avatar_url: user.profileImage || null,
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success(lang === "fr" ? "Déconnecté" : "Signed out");
    navigate("/");
  };

  const initials = profile.display_name
    ? profile.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "DR";

  const isLight = theme === "light";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border h-screen sticky top-0"
      style={isLight ? {
        background: "linear-gradient(180deg, hsl(42,28%,92%) 0%, hsl(80,16%,89%) 50%, hsl(152,20%,86%) 100%)",
        borderRight: "1px solid hsl(40,22%,76%)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      } : {
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {isLight && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "3px",
          background: "linear-gradient(90deg, hsl(152,35%,40%), hsl(40,60%,45%), hsl(152,35%,40%))",
          zIndex: 10,
        }} />
      )}

      <SidebarContent>
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-5 hover:opacity-80 transition-opacity ${collapsed ? "justify-center" : ""}`}
        >
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={isLight
              ? { background: "linear-gradient(135deg, hsl(152,30%,82%), hsl(40,50%,82%))", border: "1px solid hsl(152,30%,68%)" }
              : { background: "hsl(var(--primary) / 0.2)" }
            }
          >
            <Brain className="w-5 h-5" style={{ color: isLight ? "hsl(152,38%,28%)" : undefined }} />
          </motion.div>
          {!collapsed && (
            <span className="font-display font-bold text-lg" style={{ color: isLight ? "hsl(150,30%,14%)" : undefined }}>
              Neuro<span style={{ color: isLight ? "hsl(152,38%,28%)" : undefined }}>Scan</span>
            </span>
          )}
        </Link>

        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs uppercase tracking-wider font-bold"
            style={{ color: isLight ? "hsl(40,55%,35%)" : undefined }}
          >
            {!collapsed && (lang === "fr" ? "Navigation" : "Navigation")}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName={isLight
                        ? "bg-primary/12 border-l-2 border-primary"
                        : "bg-primary/15 text-primary border-l-2 border-primary"
                      }
                      style={isLight ? { color: "hsl(150,28%,18%)" } : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: isLight ? "hsl(152,35%,32%)" : undefined }} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3" style={{ borderColor: isLight ? "hsl(40,22%,74%)" : undefined }}>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all duration-300 ${collapsed ? "justify-center" : ""}`}
          style={collapsed ? {
            background: "transparent",
            border: "none",
            boxShadow: "none",
          } : isLight ? {
            background: "linear-gradient(135deg, hsl(40,25%,92%), hsl(152,18%,88%))",
            border: "1px solid hsl(40,22%,74%)",
            boxShadow: "0 2px 12px hsl(152,25%,30%,0.10)",
          } : {
            background: "hsl(var(--background) / 0.8)",
            border: "1px solid hsl(var(--primary) / 0.2)",
            boxShadow: "0 12px 35px rgba(59,130,246,0.18)",
          }}
          onClick={() => navigate("/profile")}
        >
          <Avatar
            className="w-10 h-10"
            style={{
              border: isLight ? "1.5px solid hsl(152,30%,60%)" : undefined,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                style={{
                  objectFit: "cover",
                  objectPosition: "center top",
                  width: "100%",
                  height: "100%",
                  imageRendering: "auto",
                }}
              />
            ) : (
              <AvatarFallback
                className="text-sm font-semibold"
                style={isLight ? {
                  background: "linear-gradient(135deg, hsl(152,28%,78%), hsl(40,40%,80%))",
                  color: "hsl(152,38%,22%)",
                } : {
                  background: "hsl(var(--primary)/0.1)",
                  color: "hsl(var(--primary))",
                }}
              >
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: isLight ? "hsl(150,30%,14%)" : undefined }}>
                {profile.display_name || "Doctor"}
              </p>
              <p className="text-xs truncate" style={{ color: isLight ? "hsl(150,18%,38%)" : undefined }}>
                {user?.email}
              </p>
            </div>
          )}
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm hover:bg-destructive/10 hover:text-destructive transition-colors ${collapsed ? "justify-center" : ""}`}
          style={{ color: isLight ? "hsl(150,18%,38%)" : undefined }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t("sidebar.signout")}</span>}
        </motion.button>
      </SidebarFooter>
    </Sidebar>
  );
}