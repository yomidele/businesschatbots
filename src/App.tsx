import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Overview from "./pages/Overview";
import Sites from "./pages/Sites";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Conversations from "./pages/Conversations";
import ChatTest from "./pages/ChatTest";
import EmbedCode from "./pages/EmbedCode";
import ChatWidget from "./pages/ChatWidget";
import Store from "./pages/Store";
import Docs from "./pages/Docs";
import LandingPageGenerator from "./pages/LandingPageGenerator";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, withLayout = true }: { children: React.ReactNode; withLayout?: boolean }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (withLayout) return <DashboardLayout>{children}</DashboardLayout>;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/store/:slug" element={<Store />} />
            <Route path="/dashboard" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute><Sites /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
            <Route path="/landing-pages" element={<ProtectedRoute><LandingPageGenerator /></ProtectedRoute>} />
            <Route path="/chat/:siteId" element={<ProtectedRoute withLayout={false}><ChatTest /></ProtectedRoute>} />
            <Route path="/embed/:siteId" element={<ProtectedRoute><EmbedCode /></ProtectedRoute>} />
            <Route path="/docs" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
            <Route path="/widget/:siteId" element={<ChatWidget />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
