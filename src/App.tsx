import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Bookings from "./pages/Bookings";
import Chat from "./pages/Chat";
import Planning from "./pages/Planning";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Accounting from "./pages/Accounting";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import CreateDemo from "./pages/CreateDemo";
import CleanupDrivers from "./pages/CleanupDrivers";

import Profile from './pages/settings/Profile';
import Security from './pages/settings/Security';
import Vehicle from './pages/settings/Vehicle';
import Documents from './pages/settings/Documents';
import BankAccount from './pages/settings/BankAccount';
import NotificationsSettings from './pages/settings/Notifications';
import DriverProfile from './pages/DriverProfile';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { session, loading } = useAuth();

  // Mode clair par défaut (pas de dark mode forcé)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <Bookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:courseId"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planning"
        element={
          <ProtectedRoute>
            <Planning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver-profile"
        element={
          <ProtectedRoute>
            <DriverProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <ProtectedRoute>
            <Accounting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <Security />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/vehicle"
        element={
          <ProtectedRoute>
            <Vehicle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/bank"
        element={
          <ProtectedRoute>
            <BankAccount />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <ProtectedRoute>
            <NotificationsSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-demo"
        element={<CreateDemo />}
      />
      <Route
        path="/cleanup-drivers"
        element={<CleanupDrivers />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex justify-center">
          <div className="w-full max-w-lg bg-background min-h-screen shadow-2xl relative safe-area-pt safe-area-pb">
            <AppContent />
          </div>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
