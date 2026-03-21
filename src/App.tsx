import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectCartProvider } from "@/contexts/ProjectCartContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavouritesProvider } from "@/contexts/FavouritesContext";
import Index from "./pages/Index.tsx";
import Products from "./pages/Products.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import ProjectCart from "./pages/ProjectCart.tsx";
import Partners from "./pages/Partners.tsx";
import PartnerDetail from "./pages/PartnerDetail.tsx";
import Inspirations from "./pages/Inspirations.tsx";
import Resources from "./pages/Resources.tsx";
import ProService from "./pages/ProService.tsx";
import Auth from "./pages/Auth.tsx";
import Messages from "./pages/Messages.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";

// Lazy-loaded heavy page components
const Admin = lazy(() => import("./pages/Admin"));
const ProjectBuilder = lazy(() => import("./pages/ProjectBuilder"));
const ProductCompare = lazy(() => import("./pages/ProductCompare"));
const BecomePartner = lazy(() => import("./pages/BecomePartner"));
const Account = lazy(() => import("./pages/Account"));

const queryClient = new QueryClient();

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
              <div className="pt-[var(--header-height)]">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/compare" element={<ProductCompare />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/project-cart" element={<ProtectedRoute><ProjectCart /></ProtectedRoute>} />
                  <Route path="/projects/new" element={<ProtectedRoute><ProjectBuilder /></ProtectedRoute>} />
                  <Route path="/inspirations" element={<Inspirations />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/pro-service" element={<ProService />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/become-partner" element={<BecomePartner />} />
                  <Route path="/partners/:slug" element={<PartnerDetail />} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<Auth />} />
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
