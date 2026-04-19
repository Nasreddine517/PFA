import { Brain, BarChart3, Home, User, LogOut, Scan } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, lang } = useTheme();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null });

  const navItems = [
    { title: t("sidebar.home"), url: "/", icon: Home },
    { title: t("sidebar.analyze"), url: "/upload", icon: Scan },
    { title: t("sidebar.dashboard"), url: "/dashboard", icon: BarChart3 },
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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarContent>
        {/* Logo — link to home, preserves auth state */}
        <Link to="/" className={`flex items-center gap-2 px-4 py-5 hover:opacity-80 transition-opacity ${collapsed ? "justify-center" : ""}`}>
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0"
          >
            <Brain className="w-5 h-5 text-primary" />
          </motion.div>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              Neuro<span className="text-primary">Scan</span>
            </span>
          )}
        </Link>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            {!collapsed && (lang === "fr" ? "Navigation" : "Navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-primary/15 text-primary border-l-2 border-primary"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 p-2 rounded-2xl bg-background/80 border border-primary/20 shadow-[0_12px_35px_rgba(59,130,246,0.18)] hover:bg-background cursor-pointer transition-all duration-300 ${collapsed ? "justify-center" : ""}`}
          onClick={() => navigate("/profile")}
        >
          <Avatar className="w-10 h-10 border border-primary/30">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
            )}
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.display_name || "Doctor"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t("sidebar.signout")}</span>}
        </motion.button>
      </SidebarFooter>
    </Sidebar>
  );
}
