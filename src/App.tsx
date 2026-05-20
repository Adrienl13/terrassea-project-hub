import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectCartProvider } from "@/contexts/ProjectCartContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FavouritesProvider } from "@/contexts/FavouritesContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import StructuredData from "@/components/StructuredData";
import NotFound from "./pages/NotFound.tsx";
import { usePricingModeQuery } from "@/hooks/usePricingMode";

const RECOVERY_PATHS = new Set(["/auth", "/login", "/reset-password"]);

// Defensive guard: if Supabase Auth falls back to Site URL after a password
// recovery (e.g. when the requested redirectTo is not in the project's
// allowlist), the user lands on the homepage with #type=recovery in the
// hash — but the homepage has no UI to set a new password. This guard
// detects that state and routes the user to /reset-password.
// Routes `/become-partner` to the launch-mode landing page while
// `platform_settings.pricing_visibility_mode='launch'`, falling back to the
// canonical paid plans page otherwise. Waits for the query to resolve before
// mounting either page to avoid a flash of the wrong route.
const BecomePartnerRouter = () => {
  const { data, isPending } = usePricingModeQuery();
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  return data === "launch" ? <BecomePartnerLaunch /> : <BecomePartner />;
};

const RecoveryGuard = () => {
  const { isPasswordRecovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPasswordRecovery && !RECOVERY_PATHS.has(location.pathname)) {
      navigate("/reset-password", { replace: true });
    }
  }, [isPasswordRecovery, location.pathname, navigate]);

  return null;
};

// Lazy-loaded page components
const Index = lazy(() => import("./pages/Index"));
const Inspirations = lazy(() => import("./pages/Inspirations"));
const Resources = lazy(() => import("./pages/Resources"));
const Auth = lazy(() => import("./pages/Auth"));
const Messages = lazy(() => import("./pages/Messages"));
const CookieBanner = lazy(() => import("@/components/CookieBanner"));
const ChatbotWidget = lazy(() => import("@/components/ChatbotWidget"));

// Legal pages
const Legal = lazy(() => import("./pages/Legal"));
const CGV = lazy(() => import("./pages/CGV"));
const CGU = lazy(() => import("./pages/CGU"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Lazy-loaded heavy page components
const Admin = lazy(() => import("./pages/Admin"));
const AdminBrandEditor = lazy(() => import("./components/admin/AdminBrandEditor"));
const ProjectBuilder = lazy(() => import("./pages/ProjectBuilder"));
const ProductCompare = lazy(() => import("./pages/ProductCompare"));
const BecomePartner = lazy(() => import("./pages/BecomePartner"));
const BecomePartnerLaunch = lazy(() => import("./pages/BecomePartnerLaunch"));
const Account = lazy(() => import("./pages/Account"));
const MoodBoard = lazy(() => import("./pages/MoodBoard"));
const SharedBoard = lazy(() => import("./pages/SharedBoard"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ProjectCart = lazy(() => import("./pages/ProjectCart"));
const Partners = lazy(() => import("./pages/Partners"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const Collections = lazy(() => import("./pages/Collections"));
const ProService = lazy(() => import("./pages/ProService"));

const ProServiceGate = lazy(() => import("./pages/ProServiceGate"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
      <AuthProvider>
        <FavouritesProvider>
        <ProjectCartProvider>
          <CompareProvider>
            <Sonner />
            <BrowserRouter>
              <RecoveryGuard />
              <StructuredData />
              <div className="pt-[var(--header-height)]">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/compare" element={<ProductCompare />} />
                  {/* ÉTAPE 9b-2a — canonical SEO URLs */}
                  <Route path="/products/:brandSlug/:productSlug" element={<ProductDetail />} />
                  {/* Legacy UUID URL — redirects to canonical at runtime */}
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/project-cart" element={<ProtectedRoute><ProjectCart /></ProtectedRoute>} />
                  <Route path="/projects/new" element={<ProtectedRoute><ProjectBuilder /></ProtectedRoute>} />
                  <Route path="/inspirations" element={<Inspirations />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/pro-service" element={<ProServiceGate />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/become-partner" element={<BecomePartnerRouter />} />
                  <Route path="/partners/:slug" element={<PartnerDetail />} />
                  <Route path="/brands/:slug" element={<BrandPage />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
                  <Route path="/admin/brands/:partnerId/edit" element={<ProtectedRoute requireAdmin><AdminBrandEditor /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<Auth />} />
                  <Route path="/boards/shared/:token" element={<SharedBoard />} />
                  <Route path="/mood-board" element={<ProtectedRoute><MoodBoard /></ProtectedRoute>} />
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="/mentions-legales" element={<Legal />} />
                  <Route path="/cgv" element={<CGV />} />
                  <Route path="/cgu" element={<CGU />} />
                  <Route path="/confidentialite" element={<Privacy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                <Suspense fallback={null}>
                  <CookieBanner />
                  <ChatbotWidget />
                </Suspense>
              </div>
            </BrowserRouter>
          </CompareProvider>
        </ProjectCartProvider>
        </FavouritesProvider>
      </AuthProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
