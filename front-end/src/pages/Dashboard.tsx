import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  Brain, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Upload, User, BarChart3, PieChart as PieChartIcon, Calendar as CalendarIcon,
  FileText, Zap, Shield, CalendarDays,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const SCANS_STORAGE_KEY = "neuroscan_scans";

const CHART_COLORS = {
  primary: "hsl(217, 91%, 60%)",
  accent: "hsl(199, 89%, 48%)",
  destructive: "hsl(0, 72%, 51%)",
  muted: "hsl(215, 15%, 55%)",
};

const Dashboard = () => {
  const { user } = useAuth();
  const { t, lang } = useTheme();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "6m" | "1y" | "custom">("6m");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [stats, setStats] = useState({ totalScans: 0, detected: 0, cleared: 0, avgConfidence: 0 });

  const dateRangeInterval = useMemo(() => {
    const now = new Date();
    if (dateRange === "custom" && customFrom && customTo) {
      return { start: startOfDay(customFrom), end: endOfDay(customTo) };
    }
    const map: Record<string, Date> = {
      "7d": subDays(now, 7), "30d": subDays(now, 30), "90d": subDays(now, 90),
      "6m": subMonths(now, 6), "1y": subMonths(now, 12),
    };
    return { start: startOfDay(map[dateRange] || subMonths(now, 6)), end: endOfDay(now) };
  }, [dateRange, customFrom, customTo]);

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const d = new Date(s.created_at);
      return isWithinInterval(d, dateRangeInterval);
    });
  }, [scans, dateRangeInterval]);

  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(SCANS_STORAGE_KEY);
      const allScans: any[] = stored ? JSON.parse(stored) : [];
      const userScans = allScans.filter((s: any) => s.userId === user.id);
      const mapped = userScans.map((s: any) => ({
        id: s.id,
        created_at: s.createdAt,
        result: s.detected ? "positive" : "negative",
        confidence: s.confidence,
      }));
      setScans(mapped);
      const detected = mapped.filter((s) => s.result === "positive").length;
      const cleared = mapped.filter((s) => s.result === "negative").length;
      const avgConf = mapped.length ? mapped.reduce((acc, s) => acc + s.confidence, 0) / mapped.length : 0;
      setStats({ totalScans: mapped.length, detected, cleared, avgConfidence: avgConf });
    } catch { setScans([]); setStats({ totalScans: 0, detected: 0, cleared: 0, avgConfidence: 0 }); }
    setLoading(false);
  }, [user]);

  const { totalScans, detected, cleared } = stats;
  const avgConfidence = stats.avgConfidence.toFixed(1);

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; total: number; positive: number; negative: number }> = {};
    const { start, end } = dateRangeInterval;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const key = cursor.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", year: "2-digit" });
      months[key] = { month: key, total: 0, positive: 0, negative: 0 };
      cursor.setMonth(cursor.getMonth() + 1);
    }
    filteredScans.forEach((s) => {
      const d = new Date(s.created_at);
      const key = d.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", year: "2-digit" });
      if (months[key]) { months[key].total++; if (s.result === "positive") months[key].positive++; else months[key].negative++; }
    });
    return Object.values(months);
  }, [filteredScans, dateRangeInterval, lang]);

  const tumorDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredScans.filter((s) => s.tumor_type).forEach((s) => { map[s.tumor_type] = (map[s.tumor_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredScans]);

  const pieColors = [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.destructive, "hsl(45, 90%, 55%)", "hsl(280, 60%, 55%)"];

  const confidenceData = useMemo(() => {
    const buckets = [
      { range: "50-60%", min: 50, max: 60, count: 0 },
      { range: "60-70%", min: 60, max: 70, count: 0 },
      { range: "70-80%", min: 70, max: 80, count: 0 },
      { range: "80-90%", min: 80, max: 90, count: 0 },
      { range: "90-100%", min: 90, max: 100, count: 0 },
    ];
    filteredScans.forEach((s) => {
      const c = s.confidence || 0;
      const b = buckets.find((b) => c >= b.min && c < b.max) || buckets[buckets.length - 1];
      if (c >= 50) b.count++;
    });
    return buckets.map((b) => ({ range: b.range, count: b.count }));
  }, [filteredScans]);

  const datePresets = [
    { label: "7J", value: "7d" as const },
    { label: "30J", value: "30d" as const },
    { label: "90J", value: "90d" as const },
    { label: "6M", value: "6m" as const },
    { label: "1A", value: "1y" as const },
  ];

  const statCards = [
    { icon: Brain, label: t("dash.totalScans"), value: String(totalScans), change: "+12%", up: true },
    { icon: AlertTriangle, label: t("dash.detected"), value: String(detected), change: `${totalScans ? Math.round((detected / totalScans) * 100) : 0}%`, up: detected > 0 },
    { icon: CheckCircle, label: t("dash.cleared"), value: String(cleared), change: `${totalScans ? Math.round((cleared / totalScans) * 100) : 0}%`, up: true },
    { icon: Activity, label: t("dash.avgConf"), value: `${avgConfidence}%`, change: "AI Model", up: true },
  ];

  const quickActions = [
    { icon: Upload, label: t("dash.newScan"), to: "/upload" },
    { icon: User, label: t("dash.profile"), to: "/profile" },
  ];

  const chartTooltipStyle = {
    contentStyle: {
      background: "hsl(220, 25%, 10%)",
      border: "1px solid hsl(220, 20%, 18%)",
      borderRadius: "0.75rem",
      color: "hsl(210, 20%, 92%)",
      fontSize: "0.75rem",
    },
    itemStyle: { color: "hsl(210, 20%, 85%)" },
  };

  const aiInsights = [
    {
      title: lang === "fr" ? "Taux de Détection" : "Detection Rate",
      desc: totalScans
        ? `${Math.round((detected / totalScans) * 100)}% ${lang === "fr" ? "des scans présentent des résultats positifs" : "of scans show positive findings"}`
        : (lang === "fr" ? "Téléversez des scans pour voir le taux de détection" : "Upload scans to see detection rate"),
      icon: AlertTriangle, color: "text-destructive",
    },
    {
      title: lang === "fr" ? "Précision de l'IA" : "AI Accuracy",
      desc: `${lang === "fr" ? "Confiance moyenne de" : "Average confidence of"} ${avgConfidence}% ${lang === "fr" ? "sur toutes les analyses" : "across all analyses"}`,
      icon: Activity, color: "text-primary",
    },
    {
      title: lang === "fr" ? "Résultat le Plus Fréquent" : "Most Common Finding",
      desc: tumorDistribution.length
        ? `${tumorDistribution.sort((a, b) => b.value - a.value)[0].name} (${tumorDistribution[0].value} ${lang === "fr" ? "cas" : "cases"})`
        : (lang === "fr" ? "Aucun résultat pour l'instant" : "No findings yet"),
      icon: Brain, color: "text-accent",
    },
    {
      title: lang === "fr" ? "Recommandation" : "Recommendation",
      desc: detected > cleared
        ? (lang === "fr" ? "Taux de détection élevé — envisagez des seconds avis pour les scans signalés" : "High detection rate — consider second opinions for flagged scans")
        : (lang === "fr" ? "Ratio de scan sain — continuez la surveillance régulière" : "Healthy scan ratio — continue regular monitoring"),
      icon: FileText, color: "text-primary",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("dash.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("dash.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary/50">
                  <a.icon className="w-4 h-4" /> <span className="hidden sm:inline">{a.label}</span>
                </Button>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Date Range Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-card border border-border"
      >
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-1">{t("dash.period")}</span>
        {datePresets.map((p) => (
          <Button key={p.value} variant={dateRange === p.value ? "default" : "ghost"} size="sm"
            className={cn("h-7 px-3 text-xs", dateRange === p.value && "bg-primary text-primary-foreground")}
            onClick={() => setDateRange(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={dateRange === "custom" ? "default" : "ghost"} size="sm"
              className={cn("h-7 px-3 text-xs gap-1.5", dateRange === "custom" && "bg-primary text-primary-foreground")}
            >
              <CalendarIcon className="w-3 h-3" />
              {dateRange === "custom" && customFrom && customTo
                ? `${format(customFrom, "MMM d")} – ${format(customTo, "MMM d")}`
                : t("dash.custom")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("dash.from")}</p>
                <Calendar mode="single" selected={customFrom} onSelect={(d) => { setCustomFrom(d); setDateRange("custom"); }}
                  disabled={(d) => d > new Date() || (customTo ? d > customTo : false)} className="p-0 pointer-events-auto" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("dash.to")}</p>
                <Calendar mode="single" selected={customTo} onSelect={(d) => { setCustomTo(d); setDateRange("custom"); }}
                  disabled={(d) => d > new Date() || (customFrom ? d < customFrom : false)} className="p-0 pointer-events-auto" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <span className="ml-auto text-xs text-muted-foreground">
          {totalScans} {t("dash.scansInRange")}
        </span>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 120 }}
            whileHover={{ y: -6, scale: 1.03 }}
            className="relative p-5 rounded-xl bg-card border border-border shadow-card group cursor-default overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary" />
                </motion.div>
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <div className="font-display text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-xl bg-card border border-border shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">{t("dash.scansOverTime")}</h2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.destructive} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.destructive} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="negative" name={lang === "fr" ? "Négatifs" : "Cleared"} stackId="1" stroke={CHART_COLORS.primary} fill="url(#gradNegative)" strokeWidth={2} />
                <Area type="monotone" dataKey="positive" name={lang === "fr" ? "Détectés" : "Detected"} stackId="1" stroke={CHART_COLORS.destructive} fill="url(#gradPositive)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl bg-card border border-border shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-semibold">{t("dash.tumorTypes")}</h2>
          </div>
          {tumorDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tumorDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {tumorDistribution.map((_, i) => (<Cell key={i} fill={pieColors[i % pieColors.length]} />))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", color: "hsl(215, 15%, 55%)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">{t("dash.noTumorData")}</div>
          )}
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-xl bg-card border border-border shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">{t("dash.confDist")}</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="range" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="count" name={lang === "fr" ? "Scans" : "Scans"} radius={[6, 6, 0, 0]} fill={CHART_COLORS.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="lg:col-span-2 rounded-xl bg-card border border-border shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">{t("dash.aiInsights")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiInsights.map((insight, i) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <insight.icon className={`w-4 h-4 ${insight.color}`} />
                  <span className="text-sm font-semibold">{insight.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
