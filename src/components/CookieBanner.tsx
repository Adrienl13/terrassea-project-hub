import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "terrassea_cookie_consent";

interface CookieConsent {
  necessary: true; // always true
  analytics: boolean;
  timestamp: string;
}

function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function storeConsent(consent: CookieConsent) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
}

const CookieBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    storeConsent({ necessary: true, analytics: true, timestamp: new Date().toISOString() });
    setVisible(false);
  };

  const saveSettings = () => {
    storeConsent({ necessary: true, analytics, timestamp: new Date().toISOString() });
    setVisible(false);
  };

  const refuse = () => {
    storeConsent({ necessary: true, analytics: false, timestamp: new Date().toISOString() });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border bg-background shadow-xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="font-display font-semibold text-sm">
            {t("cookieBanner.title")}
          </h3>
          <button
            onClick={refuse}
            className="text-muted-foreground hover:text-foreground transition-colors -mt-1"
            aria-label={t("cookieBanner.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!showSettings ? (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t("cookieBanner.description")}{" "}
              <Link
                to="/confidentialite"
                className="text-primary underline hover:text-primary/80"
              >
                {t("cookieBanner.privacyPolicy")}
              </Link>{" "}
              {t("cookieBanner.learnMore")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={accept} className="text-xs">
                {t("cookieBanner.acceptAll")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="text-xs"
              >
                {t("cookieBanner.settings")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={refuse}
                className="text-xs text-muted-foreground"
              >
                {t("cookieBanner.refuse")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium">{t("cookieBanner.necessaryCookies")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("cookieBanner.necessaryDesc")}
                  </p>
                </div>
                <Switch checked disabled aria-label={t("cookieBanner.necessaryAlwaysActive")} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium">{t("cookieBanner.analyticsCookies")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("cookieBanner.analyticsDesc")}
                  </p>
                </div>
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label={t("cookieBanner.analyticsLabel")}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveSettings} className="text-xs">
                {t("cookieBanner.saveChoices")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="text-xs text-muted-foreground"
              >
                {t("cookieBanner.back")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
