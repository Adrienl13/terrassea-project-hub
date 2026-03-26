import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";

type Mode = "login" | "register";
type UserType = "client" | "partner" | "architect" | "designer";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, isPasswordRecovery } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/account";

  // Redirect already-authenticated users (unless in password recovery flow)
  useEffect(() => {
    if (!authLoading && user && !isPasswordRecovery) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, isPasswordRecovery, navigate, from]);

  const searchParams = new URLSearchParams(location.search);
  const defaultType = (searchParams.get('type') as UserType) || 'client';
  const defaultMode = (searchParams.get('mode') as Mode) || 'login';

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [sirenValid, setSirenValid] = useState<boolean | null>(null);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const USER_TYPES: { value: UserType; label: string; desc: string; icon: string }[] = [
    { value: "client",    label: t('auth.client'),    desc: t('auth.clientDesc'),    icon: "🍽" },
    { value: "partner",   label: t('auth.partner'),   desc: t('auth.partnerDesc'),   icon: "🏭" },
    { value: "architect", label: t('auth.architect'),  desc: t('auth.architectDesc'), icon: "📐" },
  ];

  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    company: "", siren: "", phone: "", country: "France", userType: defaultType,
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const validateSiren = async (siren: string) => {
    if (siren.length !== 9) { setSirenValid(null); return; }
    setSirenChecking(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&mtm_campaign=terrassea`
      );
      if (!res.ok) { setSirenValid(false); return; }
      const data = await res.json();
      setSirenValid(data?.results?.length > 0);
    } catch {
      setSirenValid(true); // Fallback: accept if API unreachable
    } finally {
      setSirenChecking(false);
    }
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.firstName) {
      toast.error(t('auth.fillRequired'));
      return;
    }
    // SIREN required for partners and architects, optional for clients
    if (form.userType !== "client" && (!form.company || !form.siren)) {
      toast.error(t('auth.fillRequired'));
      return;
    }
    if (form.siren && form.siren.length !== 9) {
      toast.error(t('auth.sirenDigits'));
      return;
    }
    setIsLoading(true);
    try {
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
            country: form.country || null,
          },
        },
      });
      if (error) throw error;
      toast.success(t('auth.accountCreated'));
      navigate(from);
    } catch (err: any) {
      toast.error(err.message || t('errors.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      toast.error(t('auth.emailPasswordRequired'));
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
      toast.error(err.message || t('errors.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-transparent border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sign In" noindex />
      <Header />

      <div className="pt-28 pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          {isPasswordRecovery ? (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-bold text-foreground">{t('auth.resetPassword')}</h2>
              <div>
                <span className={labelClass}>{t('auth.newPassword')} *</span>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>{t('auth.confirmPassword')} *</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <button
                onClick={async () => {
                  if (!newPassword || !confirmPassword) {
                    toast.error(t('auth.fillBothFields'));
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast.error(t('auth.passwordsNoMatch'));
                    return;
                  }
                  setIsLoading(true);
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    toast.success(t('auth.passwordUpdated'));
                    setTimeout(() => { window.location.replace("/"); }, 1500);
                  } catch (err: any) {
                    toast.error(err.message || t('errors.somethingWrong'));
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-3 bg-foreground text-primary-foreground font-display font-semibold text-sm rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "..." : t('auth.updatePassword')}
              </button>
            </div>
          ) : (
            <>
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
                {m === "login" ? t('auth.signIn') : t('auth.createAccount')}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <>
                {/* User type */}
                <div>
                  <span className={labelClass}>{t('auth.iAm')} *</span>
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
                    <span className={labelClass}>{t('auth.firstName')} *</span>
                    <input value={form.firstName} onChange={handle("firstName")} className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>{t('auth.lastName')}</span>
                    <input value={form.lastName} onChange={handle("lastName")} className={inputClass} />
                  </div>
                </div>

                {/* Company — required for partner/architect, optional for client */}
                <div>
                  <span className={labelClass}>{t('auth.company')} {form.userType !== "client" ? "*" : ""}</span>
                  <input value={form.company} onChange={handle("company")} className={inputClass} placeholder={form.userType === "client" ? t('auth.companyOptional', 'Optionnel') : ""} />
                </div>

                {/* SIREN — required for partner/architect, optional for client */}
                {form.userType !== "client" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={labelClass + " mb-0"}>{t('auth.sirenNumber')} *</span>
                      {sirenChecking && <span className="text-[9px] text-muted-foreground">{t('auth.checking')}</span>}
                      {sirenValid === true && <span className="text-[9px] text-green-600">{t('auth.valid')}</span>}
                      {sirenValid === false && <span className="text-[9px] text-destructive">{t('auth.notFound')}</span>}
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
                ) : null}

                <div>
                  <span className={labelClass}>{t('auth.phone')}</span>
                  <input value={form.phone} onChange={handle("phone")} className={inputClass} />
                </div>

                <div>
                  <span className={labelClass}>{t('auth.country', 'Pays')}</span>
                  <select
                    value={form.country}
                    onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="France">France</option>
                    <option value="Belgium">{t('brief.countryBelgium')}</option>
                    <option value="Switzerland">{t('brief.countrySwitzerland')}</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Italy">{t('brief.countryItaly')}</option>
                    <option value="Spain">{t('brief.countrySpain')}</option>
                    <option value="Portugal">{t('brief.countryPortugal')}</option>
                    <option value="Germany">{t('brief.countryGermany')}</option>
                    <option value="Netherlands">{t('brief.countryNetherlands')}</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Other">{t('brief.other')}</option>
                  </select>
                </div>

                {/* Partner-specific hint */}
                {form.userType === "partner" ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[10px] font-body text-amber-800">
                      {t('auth.partnerHint', 'Votre espace partenaire sera activé après validation de votre profil. Pour devenir marque partenaire, rendez-vous sur la page Devenir partenaire.')}
                    </p>
                  </div>
                ) : null}
              </>
            )}

            <div>
              <span className={labelClass}>{t('auth.email')} *</span>
              <input value={form.email} onChange={handle("email")} type="email" placeholder={t('forms.emailPlaceholder')} className={inputClass} />
            </div>

            <div>
              <span className={labelClass}>{t('auth.password')} *</span>
              <input value={form.password} onChange={handle("password")} type="password" placeholder="••••••••" className={inputClass} />
            </div>

            {mode === "login" && (
              <button
                type="button"
                onClick={async () => {
                  if (!form.email) {
                    toast.error(t('auth.enterEmailFirst'));
                    return;
                  }
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                      redirectTo: `${window.location.origin}/auth`,
                    });
                    if (error) throw error;
                    toast.success(t('auth.resetEmailSent'));
                  } catch (err: any) {
                    toast.error(err.message || t('errors.somethingWrong'));
                  }
                }}
                className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors self-end"
              >
                {t('auth.forgotPassword')}
              </button>
            )}

            <button
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={isLoading}
              className="w-full py-3 bg-foreground text-primary-foreground font-display font-semibold text-sm rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "..." : mode === "login" ? t('auth.signIn') : t('auth.createMyAccount')}
            </button>
          </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
