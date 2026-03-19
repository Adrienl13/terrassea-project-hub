import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  onSelect: (mode: "guided" | "expert") => void;
}

const TerraceIllustration = () => (
  <svg width="180" height="135" viewBox="0 0 180 135" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <rect x="8" y="8" width="164" height="119" rx="10" fill="#D4603A" fillOpacity=".05" stroke="#D4603A" strokeOpacity=".12" strokeWidth="0.8" />
    <line x1="8" y1="52" x2="172" y2="52" stroke="#D4603A" strokeOpacity=".05" strokeWidth="0.5" />
    <line x1="8" y1="86" x2="172" y2="86" stroke="#D4603A" strokeOpacity=".05" strokeWidth="0.5" />
    <line x1="60" y1="8" x2="60" y2="127" stroke="#D4603A" strokeOpacity=".05" strokeWidth="0.5" />
    <line x1="120" y1="8" x2="120" y2="127" stroke="#D4603A" strokeOpacity=".05" strokeWidth="0.5" />
    <circle cx="46" cy="46" r="15" fill="#D4603A" fillOpacity=".1" stroke="#D4603A" strokeOpacity=".25" strokeWidth="0.9" />
    <circle cx="46" cy="46" r="6" fill="#D4603A" fillOpacity=".18" />
    <rect x="33" y="24" width="7" height="9" rx="2" fill="#C4956A" fillOpacity=".45" />
    <rect x="60" y="24" width="7" height="9" rx="2" fill="#C4956A" fillOpacity=".45" />
    <rect x="20" y="41" width="9" height="7" rx="2" fill="#C4956A" fillOpacity=".45" />
    <rect x="71" y="41" width="9" height="7" rx="2" fill="#C4956A" fillOpacity=".45" />
    <rect x="33" y="59" width="7" height="9" rx="2" fill="#C4956A" fillOpacity=".45" />
    <rect x="60" y="59" width="7" height="9" rx="2" fill="#C4956A" fillOpacity=".45" />
    <circle cx="130" cy="46" r="15" fill="#4A90A4" fillOpacity=".09" stroke="#4A90A4" strokeOpacity=".22" strokeWidth="0.9" />
    <circle cx="130" cy="46" r="6" fill="#4A90A4" fillOpacity=".16" />
    <rect x="117" y="24" width="7" height="9" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="144" y="24" width="7" height="9" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="104" y="41" width="9" height="7" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="155" y="41" width="9" height="7" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="117" y="59" width="7" height="9" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="144" y="59" width="7" height="9" rx="2" fill="#8AAFBF" fillOpacity=".4" />
    <rect x="28" y="92" width="88" height="26" rx="4" fill="#6B7B5E" fillOpacity=".09" stroke="#6B7B5E" strokeOpacity=".18" strokeWidth="0.8" />
    <rect x="34" y="82" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".35" />
    <rect x="52" y="82" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".35" />
    <rect x="70" y="82" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".35" />
    <rect x="88" y="82" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".35" />
    <rect x="34" y="120" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".3" />
    <rect x="52" y="120" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".3" />
    <rect x="70" y="120" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".3" />
    <rect x="88" y="120" width="9" height="8" rx="2" fill="#6B7B5E" fillOpacity=".3" />
    <circle cx="148" cy="100" r="16" fill="#D4A574" fillOpacity=".12" stroke="#D4A574" strokeOpacity=".22" strokeWidth="0.8" strokeDasharray="4 2.5" />
    <line x1="148" y1="86" x2="148" y2="116" stroke="#D4A574" strokeOpacity=".35" strokeWidth="1.2" />
    <circle cx="17" cy="17" r="6" fill="#6B7B5E" fillOpacity=".28" />
    <circle cx="163" cy="17" r="6" fill="#6B7B5E" fillOpacity=".28" />
    <circle cx="17" cy="118" r="6" fill="#6B7B5E" fillOpacity=".25" />
    <circle cx="163" cy="118" r="6" fill="#6B7B5E" fillOpacity=".25" />
    <circle cx="90" cy="72" r="2" fill="#D4A574" fillOpacity=".4" />
    <circle cx="90" cy="80" r="1.5" fill="#D4A574" fillOpacity=".25" />
  </svg>
);

const ProjectBuilderModeSelect = ({ onSelect }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const guidedTags = t('projectBuilder.modeSelect.guidedTags', { returnObjects: true }) as string[];
  const expertTags = t('projectBuilder.modeSelect.expertTags', { returnObjects: true }) as string[];
  const browseTags = t('projectBuilder.modeSelect.browseTags', { returnObjects: true }) as string[];

  return (
    <motion.div
      key="mode-select"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between gap-8 mb-10">
        <div>
          <p className="text-[9px] font-display font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {t('projectBuilder.badge')}
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
            {t('projectBuilder.modeSelect.header')}
          </h2>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            {t('projectBuilder.modeSelect.headerDesc')}
          </p>
        </div>
        <div className="hidden md:block flex-shrink-0">
          <TerraceIllustration />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Card 1 — Guided */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => onSelect("guided")}
          className="group relative overflow-hidden border border-border hover:border-foreground/40 rounded-sm bg-background transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-0"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4603A] to-[#C4956A]/60" />
          <div className="flex-1 p-5 md:p-6">
            <div className="flex items-start md:items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-display font-semibold text-muted-foreground/40 tracking-wider">01</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,96,58,0.1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4603A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <p className="font-display font-bold text-sm text-foreground">{t('projectBuilder.modeSelect.guided')}</p>
              <span className="text-[9px] font-display font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 flex-shrink-0">
                {t('projectBuilder.modeSelect.guidedRecommended')}
              </span>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed mb-3 md:max-w-lg">
              {t('projectBuilder.modeSelect.guidedDesc')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(guidedTags) ? guidedTags : []).map((tag) => (
                <span key={tag} className="text-[9px] font-body text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5 md:px-6 md:pb-0 md:border-l md:border-border flex-shrink-0 flex md:items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onSelect("guided"); }}
              className="w-full md:w-auto px-6 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t('projectBuilder.modeSelect.guidedCta')}
            </button>
          </div>
        </motion.div>

        {/* Card 2 — Expert */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          onClick={() => onSelect("expert")}
          className="group relative overflow-hidden border border-border hover:border-foreground/40 rounded-sm bg-background transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-0"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1A2456] to-[#4A90A4]/50" />
          <div className="flex-1 p-5 md:p-6">
            <div className="flex items-start md:items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-display font-semibold text-muted-foreground/40 tracking-wider">02</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(26,36,86,0.08)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A2456" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p className="font-display font-bold text-sm text-foreground">{t('projectBuilder.modeSelect.expert')}</p>
              <span className="text-[9px] font-display font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground flex-shrink-0">
                {t('projectBuilder.modeSelect.expertPro')}
              </span>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed mb-3 md:max-w-lg">
              {t('projectBuilder.modeSelect.expertDesc')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(expertTags) ? expertTags : []).map((tag) => (
                <span key={tag} className="text-[9px] font-body text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5 md:px-6 md:pb-0 md:border-l md:border-border flex-shrink-0 flex md:items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onSelect("expert"); }}
              className="w-full md:w-auto px-6 py-2.5 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              {t('projectBuilder.modeSelect.expertCta')}
            </button>
          </div>
        </motion.div>

        {/* Card 3 — Browse */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/products")}
          className="group relative overflow-hidden border border-border hover:border-foreground/40 rounded-sm bg-background transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-0"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-border" />
          <div className="flex-1 p-5 md:p-6">
            <div className="flex items-start md:items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-display font-semibold text-muted-foreground/40 tracking-wider">03</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-muted-foreground">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p className="font-display font-bold text-sm text-foreground">{t('projectBuilder.modeSelect.browse')}</p>
              <span className="text-[9px] font-display font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground flex-shrink-0">
                {t('projectBuilder.modeSelect.browseQuick')}
              </span>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed mb-3 md:max-w-lg">
              {t('projectBuilder.modeSelect.browseDesc')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(browseTags) ? browseTags : []).map((tag) => (
                <span key={tag} className="text-[9px] font-body text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5 md:px-6 md:pb-0 md:border-l md:border-border flex-shrink-0 flex md:items-center">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/products"); }}
              className="w-full md:w-auto px-6 py-2.5 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              {t('projectBuilder.modeSelect.browseCta')}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <div className="h-px flex-1 bg-border" />
        <p className="text-[10px] font-body text-muted-foreground whitespace-nowrap">
          {t('projectBuilder.modeSelect.footer')}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>
    </motion.div>
  );
};

export default ProjectBuilderModeSelect;
