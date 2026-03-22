import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  console.log("[ProtectedRoute]", { isLoading, hasUser: !!user, profile: profile?.user_type ?? "null", requireAdmin, timedOut });

  // Still loading auth session
  if (isLoading && !timedOut) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Not logged in
  if (!user) return (
    <Navigate to="/login" state={{ from: location }} replace />
  );

  // User exists but profile not loaded yet — wait for it (don't redirect prematurely)
  if (requireAdmin && profile === null && !timedOut) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Profile loaded — check admin role
  if (requireAdmin && profile?.user_type !== "admin") return (
    <Navigate to="/" replace />
  );

  return <>{children}</>;
};

export default ProtectedRoute;
