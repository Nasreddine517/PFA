import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import Auth from "./pages/Auth";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedWithSidebar = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedWithSidebar><Dashboard /></ProtectedWithSidebar>} />
              <Route path="/upload" element={<ProtectedWithSidebar><UploadPage /></ProtectedWithSidebar>} />
              <Route path="/results" element={<ProtectedWithSidebar><ResultsPage /></ProtectedWithSidebar>} />
              <Route path="/results/:id" element={<ProtectedWithSidebar><ResultsPage /></ProtectedWithSidebar>} />
              <Route path="/profile" element={<ProtectedWithSidebar><ProfileSettings /></ProtectedWithSidebar>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
