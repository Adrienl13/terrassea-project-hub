import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProServiceLanding from "@/components/pro-service/ProServiceLanding";
import ProServiceClientHub from "@/components/pro-service/ProServiceClientHub";
import ProServicePartnerHub from "@/components/pro-service/ProServicePartnerHub";
import ProServiceArchitectHub from "@/components/pro-service/ProServiceArchitectHub";
import ProServiceAdminHub from "@/components/pro-service/ProServiceAdminHub";
import { useProServiceStore } from "@/components/pro-service/useProServiceStore";

const ProService = () => {
  const { profile, isLoading } = useAuth();
  const store = useProServiceStore();

  if (isLoading || store.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const userType = profile?.user_type;

  // Authenticated users get their role-specific hub
  if (userType) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 px-6">
          <div className="container mx-auto max-w-6xl">
            {userType === "client" && <ProServiceClientHub store={store} />}
            {userType === "partner" && <ProServicePartnerHub store={store} />}
            {userType === "architect" && <ProServiceArchitectHub store={store} />}
            {userType === "admin" && <ProServiceAdminHub store={store} />}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Anonymous users see the landing page
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProServiceLanding />
      <Footer />
    </div>
  );
};

export default ProService;
