import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";
type Lang = "fr" | "en";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<string, string>> = {
  // Navbar
  "nav.home": { fr: "Accueil", en: "Home" },
  "nav.dashboard": { fr: "Tableau de bord", en: "Dashboard" },
  "nav.analyze": { fr: "Analyser", en: "Analyze" },
  "nav.signin": { fr: "Connexion", en: "Sign In" },
  "nav.signout": { fr: "Déconnexion", en: "Sign Out" },
  "nav.start": { fr: "Démarrer l'analyse", en: "Start Analysis" },
  // Sidebar
  "sidebar.home": { fr: "Accueil", en: "Home" },
  "sidebar.analyze": { fr: "Analyser", en: "Analyze" },
  "sidebar.dashboard": { fr: "Tableau de bord", en: "Dashboard" },
  "sidebar.signout": { fr: "Déconnexion", en: "Sign Out" },
  // Dashboard
  "dash.title": { fr: "Tableau de Bord Analytique", en: "Analytics Dashboard" },
  "dash.subtitle": { fr: "Statistiques et analyses IA des scans", en: "AI-powered scan insights & statistics" },
  "dash.newScan": { fr: "Nouveau Scan", en: "New Scan" },
  "dash.profile": { fr: "Profil", en: "Profile" },
  "dash.period": { fr: "Période :", en: "Period:" },
  "dash.custom": { fr: "Personnalisé", en: "Custom" },
  "dash.from": { fr: "De", en: "From" },
  "dash.to": { fr: "À", en: "To" },
  "dash.scansInRange": { fr: "scan(s) dans la période", en: "scan(s) in range" },
  "dash.totalScans": { fr: "Total Scans", en: "Total Scans" },
  "dash.detected": { fr: "Détectés", en: "Detected" },
  "dash.cleared": { fr: "Négatifs", en: "Cleared" },
  "dash.avgConf": { fr: "Confiance Moy.", en: "Avg. Confidence" },
  "dash.scansOverTime": { fr: "Scans dans le Temps", en: "Scans Over Time" },
  "dash.tumorTypes": { fr: "Types de Tumeurs", en: "Tumor Types" },
  "dash.noTumorData": { fr: "Aucune donnée de tumeur", en: "No tumor data yet" },
  "dash.resultsSplit": { fr: "Répartition des Résultats", en: "Results Breakdown" },
  "dash.noResultsData": { fr: "Aucune analyse disponible", en: "No analyses yet" },
  "dash.confDist": { fr: "Distribution de Confiance", en: "Confidence Distribution" },
  "dash.aiInsights": { fr: "Analyses IA", en: "AI Insights" },
  // Upload
  "up.title": { fr: "Analyser un Scan IRM", en: "Analyze MRI Scan" },
  "up.subtitle": { fr: "Téléversez un scan IRM cérébral et laissez notre IA réaliser une analyse de qualité clinique en quelques secondes", en: "Upload a brain MRI scan and let our AI deliver clinical-grade analysis in seconds" },
  "up.realtimeAI": { fr: "IA Temps Réel", en: "Real-time AI" },
  "up.realtimeDesc": { fr: "Résultats en moins de 30 secondes", en: "Results in under 30 seconds" },
  "up.hipaa": { fr: "Sécurisé HIPAA", en: "HIPAA Secure" },
  "up.hipaaDesc": { fr: "Données chiffrées de bout en bout", en: "End-to-end encrypted data" },
  "up.accuracy": { fr: "99,2% de Précision", en: "99.2% Accuracy" },
  "up.accuracyDesc": { fr: "Précision de qualité clinique", en: "Clinical-grade precision" },
  "up.step1": { fr: "Infos Patient", en: "Patient Info" },
  "up.step2": { fr: "Symptômes", en: "Symptoms" },
  "up.step3": { fr: "Upload IRM", en: "MRI Upload" },
  "up.step4": { fr: "Analyse", en: "Analysis" },
  "up.patientInfo": { fr: "Infos Patient", en: "Patient Info" },
  "up.required": { fr: "Détails obligatoires", en: "Required details" },
  "up.patientName": { fr: "Nom du Patient", en: "Patient Name" },
  "up.patientId": { fr: "ID Patient", en: "Patient ID" },
  "up.scanDate": { fr: "Date du Scan", en: "Scan Date" },
  "up.next": { fr: "Suivant", en: "Next" },
  "up.back": { fr: "← Retour", en: "← Back" },
  "up.continue": { fr: "Continuer vers l'IRM", en: "Continue to MRI" },
  "up.clinical": { fr: "Évaluation Clinique", en: "Clinical Assessment" },
  "up.selectSymptoms": { fr: "Sélectionnez les symptômes observés", en: "Select observed symptoms" },
  "up.riskLevel": { fr: "Niveau de risque", en: "Risk level" },
  "up.selected": { fr: "sélectionnés", en: "selected" },
  "up.irmUpload": { fr: "Upload IRM", en: "MRI Upload" },
  "up.dropScan": { fr: "Déposez ou sélectionnez votre scan cérébral", en: "Drop or select your brain scan" },
  "up.dragDrop": { fr: "Glisser & Déposer le scan IRM", en: "Drag & Drop MRI Scan" },
  "up.formats": { fr: "Formats JPEG, PNG, DICOM • Max 50MB", en: "Supports JPEG, PNG, DICOM formats • Max 50MB" },
  "up.browse": { fr: "Parcourir les fichiers", en: "Browse Files" },
  "up.startAnalysis": { fr: "Lancer l'analyse IA", en: "Start AI Analysis" },
  "up.analyzing": { fr: "Analyse en cours", en: "Analyzing" },
  "up.analyzingIRM": { fr: "Analyse du Scan IRM", en: "Analyzing MRI Scan" },
  "up.analyzingDesc": { fr: "L'IA traite le scan cérébral avec précision clinique", en: "AI is processing the brain scan with clinical precision" },
  "up.progress": { fr: "Progression", en: "Progress" },
  "up.aiReady": { fr: "Modèle IA prêt", en: "AI Model ready" },
  "up.highSymptoms": { fr: "Plusieurs symptômes critiques détectés — une analyse IRM est fortement recommandée.", en: "Multiple critical symptoms detected — an MRI analysis is strongly recommended." },
  // Results
  "res.back": { fr: "Retour", en: "Back" },
  "res.title": { fr: "Résultats d'Analyse", en: "Analysis Results" },
  "res.print": { fr: "Imprimer", en: "Print" },
  "res.downloadPDF": { fr: "Télécharger PDF", en: "Download PDF" },
  "res.tumorDetected": { fr: "Tumeur Détectée", en: "Tumor Detected" },
  "res.noTumor": { fr: "Aucune Tumeur Détectée", en: "No Tumor Detected" },
  "res.tumorLocal": { fr: "Localisation Tumorale", en: "Tumor Localization" },
  "res.scanImage": { fr: "Image du Scan", en: "Scan Image" },
  "res.confidence": { fr: "Confiance", en: "Confidence" },
  "res.location": { fr: "Localisation", en: "Location" },
  "res.volume": { fr: "Volume", en: "Volume" },
  "res.tumorRegion": { fr: "Zone Tumorale", en: "Tumor Region" },
  "res.patientInfo": { fr: "Informations Patient", en: "Patient Information" },
  "res.name": { fr: "Nom", en: "Name" },
  "res.id": { fr: "ID", en: "ID" },
  "res.scanDate": { fr: "Date du Scan", en: "Scan Date" },
  "res.scanType": { fr: "Type de Scan", en: "Scan Type" },
  "res.aiReport": { fr: "Rapport Médical IA", en: "AI Medical Report" },
  "res.aiDisclaimer": { fr: "⚠️ Ce rapport est généré par IA et constitue un outil d'aide à la décision clinique. Il ne doit pas être utilisé comme seul critère de diagnostic ou de traitement.", en: "⚠️ This report is AI-generated and intended as a clinical decision support tool. It should not be used as the sole basis for diagnosis or treatment planning." },
  "res.scanNotFound": { fr: "Scan introuvable", en: "Scan not found" },
  "res.uploadNew": { fr: "Téléverser un Nouveau Scan", en: "Upload New Scan" },
  // Auth
  "auth.signin": { fr: "Connexion", en: "Sign In" },
  "auth.signup": { fr: "Créer un compte", en: "Sign Up" },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("neuroscan-theme") as Theme) || "dark";
  });
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("neuroscan-lang") as Lang) || "fr";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("neuroscan-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("neuroscan-lang", lang);
  }, [lang]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const toggleLang = () => setLang((prev) => (prev === "fr" ? "en" : "fr"));

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry["fr"] || key;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, lang, toggleLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
