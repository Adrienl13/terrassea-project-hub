import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";

type Mode = "login" | "register";
type UserType = "client" | "partner" | "architect";

const USER_TYPES: { value: UserType; label: string; desc: string; icon: string }[] = [
  { value: "client",    label: "Client",      desc: "Restaurant, hotel, venue owner", icon: "🍽" },
  { value: "partner",   label: "Partner",     desc: "Supplier, manufacturer, distributor", icon: "🏭" },
  { value: "architect", label: "Architect",   desc: "Designer, interior architect, decorator", icon: "📐" },
];

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/account";

  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [sirenValid, setSirenValid] = useState<boolean | null>(null);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    company: "", siren: "", phone: "", userType: "client" as UserType,
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const validateSiren = async (siren: string) => {
    if (siren.length !== 9) { setSirenValid(null); return; }
    setSirenChecking(true);
    try {
      const res = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`,
        { headers: { Accept: "application/json" } }
      );
      setSirenValid(res.ok);
    } catch {
      setSirenValid(true);
    } finally {
      setSirenChecking(false);
    }
  };

  const handleRegister = async () => {
    window.alert("handleRegister called");

    if (!form.email || !form.password || !form.firstName || !form.company || !form.siren) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.siren.length !== 9) {
      toast.error("SIREN number must be 9 digits.");
      return;
    }
    setIsLoading(true);
    try {
      console.log("Signing up with data:", {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        userType: form.userType,
        company: form.company,
        siren: form.siren,
        phone: form.phone,
      });

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            user_type: form.userType,
            company: form.company,
            siren: form.siren,
            phone: form.phone || null,
          },
        },
      });

      if (error) {
        console.error("supabase.auth.signUp error:", error);
        console.error("supabase.auth.signUp full response:", { data, error });
        throw error;
      }

      console.log("supabase.auth.signUp success:", { data, error });
      toast.success("Account created! Check your email to confirm.");
      navigate(from);
    } catch (err: any) {
      console.error("handleRegister catch error:", err);
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      toast.error("Email and password required.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      navigate(from);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-transparent border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-28 pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          {/* Mode toggle */}
          <div className="flex gap-1 bg-card border border-border rounded-full p-1 mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs font-display font-semibold rounded-full transition-colors ${
                  mode === m
                    ? "bg-foreground text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <>
                {/* User type */}
                <div>
                  <span className={labelClass}>I am *</span>
                  <div className="grid grid-cols-3 gap-2">
                    {USER_TYPES.map(({ value, label: lbl, desc, icon }) => (
                      <button
                        key={value}
                        onClick={() => setForm((p) => ({ ...p, userType: value }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          form.userType === value
                            ? "border-foreground bg-card"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <p className="text-xs font-display font-bold text-foreground mt-1">{lbl}</p>
                        <p className="text-[9px] font-body text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={labelClass}>First name *</span>
                    <input value={form.firstName} onChange={handle("firstName")} className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>Last name</span>
                    <input value={form.lastName} onChange={handle("lastName")} className={inputClass} />
                  </div>
                </div>

                <div>
                  <span className={labelClass}>Company *</span>
                  <input value={form.company} onChange={handle("company")} className={inputClass} />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={labelClass + " mb-0"}>SIREN number *</span>
                    {sirenChecking && <span className="text-[9px] text-muted-foreground">Checking...</span>}
                    {sirenValid === true && <span className="text-[9px] text-green-600">✓ Valid</span>}
                    {sirenValid === false && <span className="text-[9px] text-destructive">Not found</span>}
                  </div>
                  <input
                    value={form.siren}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setForm((p) => ({ ...p, siren: val }));
                      if (val.length === 9) validateSiren(val);
                      else setSirenValid(null);
                    }}
                    placeholder="123456789"
                    className={`${inputClass} ${sirenValid === false ? "border-destructive" : sirenValid === true ? "border-green-500" : ""}`}
                  />
                </div>

                <div>
                  <span className={labelClass}>Phone</span>
                  <input value={form.phone} onChange={handle("phone")} className={inputClass} />
                </div>
              </>
            )}

            <div>
              <span className={labelClass}>Email *</span>
              <input value={form.email} onChange={handle("email")} type="email" placeholder="hello@restaurant.fr" className={inputClass} />
            </div>

            <div>
              <span className={labelClass}>Password *</span>
              <input value={form.password} onChange={handle("password")} type="password" placeholder="••••••••" className={inputClass} />
            </div>

            <button
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={isLoading}
              className="w-full py-3 bg-foreground text-primary-foreground font-display font-semibold text-sm rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "..." : mode === "login" ? "Sign in" : "Create my account"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
