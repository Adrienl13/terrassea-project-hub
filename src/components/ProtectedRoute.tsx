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

  if (isLoading && !timedOut) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <Navigate to="/login" state={{ from: location }} replace />
  );

  if (requireAdmin && profile?.user_type !== "admin") return (
    <Navigate to="/" replace />
  );

  return <>{children}</>;
};

export default ProtectedRoute;
