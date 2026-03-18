import React from "react";

// Terrassea palette
const TERRACOTTA = "#D4603A";
const TEAK = "#8B7355";
const SAND = "#E8DED1";
const CREAM = "#F5F0EB";
const WHITE = "#FFFFFF";
const DARK = "#3A3A3A";
const LIGHT_LINE = "#C9B99A";

// ═══════════════════════════════════════════════════════════════════════════════
// HERO TOPIC ILLUSTRATIONS (for TopicPhotoCard — aspect ~3:4 / 4:5)
// ═══════════════════════════════════════════════════════════════════════════════

export function IllustrationSeating() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={CREAM} />
      {/* Floor tiles */}
      <rect x="0" y="280" width="320" height="120" fill={SAND} />
      <line x1="0" y1="280" x2="320" y2="280" stroke={LIGHT_LINE} strokeWidth="0.5" />
      <line x1="80" y1="280" x2="80" y2="400" stroke={LIGHT_LINE} strokeWidth="0.3" />
      <line x1="160" y1="280" x2="160" y2="400" stroke={LIGHT_LINE} strokeWidth="0.3" />
      <line x1="240" y1="280" x2="240" y2="400" stroke={LIGHT_LINE} strokeWidth="0.3" />
      {/* Background awning */}
      <path d="M0 60 Q80 30 160 60 Q240 30 320 60 V80 Q240 50 160 80 Q80 50 0 80Z" fill={TERRACOTTA} fillOpacity="0.15" />
      <path d="M0 60 Q80 30 160 60 Q240 30 320 60" stroke={TERRACOTTA} strokeWidth="1" fill="none" strokeOpacity="0.4" />
      {/* Table 1 (left) */}
      <rect x="40" y="220" width="80" height="4" rx="1" fill={TEAK} />
      <rect x="44" y="224" width="3" height="56" fill={TEAK} />
      <rect x="113" y="224" width="3" height="56" fill={TEAK} />
      {/* Chair left-1 */}
      <rect x="30" y="190" width="28" height="3" rx="1" fill={DARK} fillOpacity="0.7" />
      <path d="M32 190 V160 Q46 155 58 160 V190" stroke={DARK} strokeWidth="1.5" fill="none" strokeOpacity="0.7" />
      <rect x="32" y="193" width="2" height="40" fill={DARK} fillOpacity="0.5" />
      <rect x="56" y="193" width="2" height="40" fill={DARK} fillOpacity="0.5" />
      {/* Chair left-2 */}
      <rect x="95" y="190" width="28" height="3" rx="1" fill={DARK} fillOpacity="0.7" />
      <path d="M97 190 V160 Q111 155 123 160 V190" stroke={DARK} strokeWidth="1.5" fill="none" strokeOpacity="0.7" />
      <rect x="97" y="193" width="2" height="40" fill={DARK} fillOpacity="0.5" />
      <rect x="121" y="193" width="2" height="40" fill={DARK} fillOpacity="0.5" />
      {/* Table 2 (right) */}
      <rect x="190" y="200" width="90" height="4" rx="1" fill={TEAK} />
      <rect x="194" y="204" width="3" height="56" fill={TEAK} />
      <rect x="273" y="204" width="3" height="56" fill={TEAK} />
      {/* Chair right-1 */}
      <rect x="195" y="170" width="28" height="3" rx="1" fill={TERRACOTTA} fillOpacity="0.6" />
      <path d="M197 170 V140 Q211 135 223 140 V170" stroke={TERRACOTTA} strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
      <rect x="197" y="173" width="2" height="30" fill={TERRACOTTA} fillOpacity="0.4" />
      <rect x="221" y="173" width="2" height="30" fill={TERRACOTTA} fillOpacity="0.4" />
      {/* Chair right-2 */}
      <rect x="245" y="170" width="28" height="3" rx="1" fill={TERRACOTTA} fillOpacity="0.6" />
      <path d="M247 170 V140 Q261 135 273 140 V170" stroke={TERRACOTTA} strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
      <rect x="247" y="173" width="2" height="30" fill={TERRACOTTA} fillOpacity="0.4" />
      <rect x="271" y="173" width="2" height="30" fill={TERRACOTTA} fillOpacity="0.4" />
      {/* Planter */}
      <rect x="155" y="240" width="20" height="35" rx="3" fill={TERRACOTTA} fillOpacity="0.3" />
      <circle cx="165" cy="232" r="14" fill="#7A9A6B" fillOpacity="0.3" />
      <circle cx="162" cy="228" r="10" fill="#7A9A6B" fillOpacity="0.25" />
      {/* String lights */}
      <path d="M20 100 Q80 120 160 95 Q240 70 300 100" stroke={TEAK} strokeWidth="0.5" fill="none" strokeOpacity="0.5" />
      <circle cx="60" cy="112" r="3" fill={TERRACOTTA} fillOpacity="0.25" />
      <circle cx="120" cy="102" r="3" fill={TERRACOTTA} fillOpacity="0.25" />
      <circle cx="200" cy="86" r="3" fill={TERRACOTTA} fillOpacity="0.25" />
      <circle cx="270" cy="96" r="3" fill={TERRACOTTA} fillOpacity="0.25" />
    </svg>
  );
}

export function IllustrationMaterials() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={CREAM} />
      {/* Teak section */}
      <rect x="30" y="40" width="120" height="100" rx="4" fill={TEAK} fillOpacity="0.2" />
      <path d="M40 55 Q70 50 140 58" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M40 70 Q90 63 140 72" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.4" />
      <path d="M40 85 Q80 80 140 87" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M40 100 Q85 95 140 102" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.4" />
      <path d="M40 115 Q75 110 140 118" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="90" y="130" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill={TEAK} fillOpacity="0.7">TEAK</text>
      {/* Aluminium section */}
      <rect x="170" y="40" width="120" height="100" rx="4" fill="#B8C0C8" fillOpacity="0.25" />
      {[50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122].map((y, i) => (
        <line key={`al-${i}`} x1="178" y1={y} x2="282" y2={y} stroke="#9AA4AE" strokeWidth="0.3" strokeOpacity="0.4" />
      ))}
      <text x="230" y="130" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#6B7B8A" fillOpacity="0.7">ALUMINIUM</text>
      {/* Rope section */}
      <rect x="30" y="170" width="120" height="100" rx="4" fill={SAND} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <React.Fragment key={`rope-${i}`}>
          <path d={`M38 ${180 + i * 12} Q60 ${175 + i * 12} 80 ${180 + i * 12} Q100 ${185 + i * 12} 142 ${180 + i * 12}`} stroke={TEAK} strokeWidth="1.2" fill="none" strokeOpacity="0.35" />
          <path d={`M38 ${186 + i * 12} Q60 ${191 + i * 12} 80 ${186 + i * 12} Q100 ${181 + i * 12} 142 ${186 + i * 12}`} stroke={TERRACOTTA} strokeWidth="0.8" fill="none" strokeOpacity="0.2" />
        </React.Fragment>
      ))}
      <text x="90" y="260" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill={TEAK} fillOpacity="0.7">ROPE</text>
      {/* Composite section */}
      <rect x="170" y="170" width="120" height="100" rx="4" fill={DARK} fillOpacity="0.08" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(row =>
        [0, 1, 2, 3, 4, 5, 6, 7].map(col => (
          <circle key={`dot-${row}-${col}`} cx={185 + col * 14} cy={185 + row * 11} r="1.5" fill={DARK} fillOpacity="0.12" />
        ))
      )}
      <text x="230" y="260" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill={DARK} fillOpacity="0.5">COMPOSITE</text>
      {/* Connection lines */}
      <path d="M90 140 L90 170" stroke={LIGHT_LINE} strokeWidth="0.5" strokeDasharray="3 3" />
      <path d="M230 140 L230 170" stroke={LIGHT_LINE} strokeWidth="0.5" strokeDasharray="3 3" />
      <path d="M150 90 L170 90" stroke={LIGHT_LINE} strokeWidth="0.5" strokeDasharray="3 3" />
      <path d="M150 220 L170 220" stroke={LIGHT_LINE} strokeWidth="0.5" strokeDasharray="3 3" />
      {/* Bottom swatch strip */}
      <rect x="30" y="310" width="60" height="50" rx="3" fill={TEAK} fillOpacity="0.35" />
      <rect x="100" y="310" width="60" height="50" rx="3" fill="#B8C0C8" fillOpacity="0.3" />
      <rect x="170" y="310" width="60" height="50" rx="3" fill={TERRACOTTA} fillOpacity="0.25" />
      <rect x="240" y="310" width="50" height="50" rx="3" fill={SAND} />
    </svg>
  );
}

export function IllustrationShade() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={CREAM} />
      <rect x="0" y="0" width="320" height="200" fill="#D6E6F0" fillOpacity="0.2" />
      {/* Pool */}
      <rect x="0" y="280" width="320" height="120" fill="#A8CDE0" fillOpacity="0.2" />
      <path d="M0 290 Q40 285 80 290 Q120 295 160 290 Q200 285 240 290 Q280 295 320 290" stroke="#A8CDE0" strokeWidth="0.5" strokeOpacity="0.3" />
      <path d="M0 310 Q40 305 80 310 Q120 315 160 310 Q200 305 240 310 Q280 315 320 310" stroke="#A8CDE0" strokeWidth="0.5" strokeOpacity="0.25" />
      {/* Pool deck */}
      <rect x="0" y="250" width="320" height="30" fill={SAND} fillOpacity="0.5" />
      {/* Parasol pole */}
      <rect x="58" y="80" width="3" height="170" fill={TEAK} fillOpacity="0.6" />
      {/* Canopy */}
      <path d="M20 80 Q100 40 180 80" fill={TERRACOTTA} fillOpacity="0.25" />
      <path d="M20 80 Q100 40 180 80" stroke={TERRACOTTA} strokeWidth="1" fill="none" strokeOpacity="0.5" />
      <line x1="20" y1="80" x2="100" y2="55" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="180" y1="80" x2="100" y2="55" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="60" y1="71" x2="100" y2="55" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="140" y1="71" x2="100" y2="55" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
      {/* Sun lounger 1 */}
      <rect x="80" y="225" width="60" height="6" rx="1" fill={TEAK} fillOpacity="0.4" />
      <rect x="80" y="233" width="25" height="4" rx="1" fill={TEAK} fillOpacity="0.3" transform="rotate(-20 80 233)" />
      <rect x="82" y="231" width="2" height="18" fill={TEAK} fillOpacity="0.3" />
      <rect x="138" y="231" width="2" height="18" fill={TEAK} fillOpacity="0.3" />
      {/* Sun lounger 2 */}
      <rect x="180" y="215" width="60" height="6" rx="1" fill={TEAK} fillOpacity="0.35" />
      <rect x="180" y="223" width="25" height="4" rx="1" fill={TEAK} fillOpacity="0.25" transform="rotate(-20 180 223)" />
      <rect x="182" y="221" width="2" height="18" fill={TEAK} fillOpacity="0.25" />
      <rect x="238" y="221" width="2" height="18" fill={TEAK} fillOpacity="0.25" />
      {/* Background parasol */}
      <rect x="248" y="120" width="2" height="130" fill={TEAK} fillOpacity="0.3" />
      <path d="M210 120 Q250 95 290 120" fill={TERRACOTTA} fillOpacity="0.12" />
      <path d="M210 120 Q250 95 290 120" stroke={TERRACOTTA} strokeWidth="0.7" fill="none" strokeOpacity="0.25" />
      {/* Sun */}
      <circle cx="280" cy="40" r="20" fill={TERRACOTTA} fillOpacity="0.1" />
      <circle cx="280" cy="40" r="12" fill={TERRACOTTA} fillOpacity="0.08" />
    </svg>
  );
}

export function IllustrationLayout() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={CREAM} />
      {/* Grid lines */}
      {[60, 120, 180, 240, 300].map(x => (
        <line key={`gv-${x}`} x1={x} y1="30" x2={x} y2="370" stroke={LIGHT_LINE} strokeWidth="0.3" strokeOpacity="0.3" />
      ))}
      {[60, 120, 180, 240, 300, 360].map(y => (
        <line key={`gh-${y}`} x1="20" y1={y} x2="300" y2={y} stroke={LIGHT_LINE} strokeWidth="0.3" strokeOpacity="0.3" />
      ))}
      {/* Terrace boundary */}
      <rect x="30" y="40" width="260" height="320" rx="2" fill="none" stroke={DARK} strokeWidth="1" strokeOpacity="0.2" />
      {/* Table + 4 chairs group 1 */}
      <rect x="55" y="70" width="30" height="30" rx="2" fill={TEAK} fillOpacity="0.3" />
      <circle cx="70" cy="60" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="70" cy="110" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="50" cy="85" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="90" cy="85" r="5" fill={DARK} fillOpacity="0.15" />
      {/* Table + 4 chairs group 2 */}
      <rect x="145" y="70" width="30" height="30" rx="2" fill={TEAK} fillOpacity="0.3" />
      <circle cx="160" cy="60" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="160" cy="110" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="140" cy="85" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="180" cy="85" r="5" fill={DARK} fillOpacity="0.15" />
      {/* Table + 2 chairs group 3 */}
      <rect x="235" y="75" width="25" height="25" rx="2" fill={TEAK} fillOpacity="0.25" />
      <circle cx="248" cy="65" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      <circle cx="248" cy="110" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      {/* Table + 4 chairs group 4 */}
      <rect x="55" y="170" width="30" height="30" rx="2" fill={TEAK} fillOpacity="0.3" />
      <circle cx="70" cy="160" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="70" cy="210" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="50" cy="185" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="90" cy="185" r="5" fill={DARK} fillOpacity="0.15" />
      {/* Round table group 5 */}
      <circle cx="160" cy="190" r="16" fill={TEAK} fillOpacity="0.2" />
      <circle cx="160" cy="168" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      <circle cx="160" cy="212" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      <circle cx="140" cy="190" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      <circle cx="180" cy="190" r="5" fill={TERRACOTTA} fillOpacity="0.2" />
      {/* Table + 2 chairs group 6 */}
      <rect x="235" y="180" width="25" height="25" rx="2" fill={TEAK} fillOpacity="0.25" />
      <circle cx="248" cy="170" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="248" cy="215" r="5" fill={DARK} fillOpacity="0.15" />
      {/* Long table group 7 */}
      <rect x="55" y="280" width="80" height="30" rx="2" fill={TEAK} fillOpacity="0.25" />
      <circle cx="70" cy="270" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="95" cy="270" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="120" cy="270" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="70" cy="320" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="95" cy="320" r="5" fill={DARK} fillOpacity="0.15" />
      <circle cx="120" cy="320" r="5" fill={DARK} fillOpacity="0.15" />
      {/* Circulation arrow */}
      <path d="M200 270 L200 330" stroke={TERRACOTTA} strokeWidth="1" strokeDasharray="4 3" strokeOpacity="0.4" />
      <path d="M196 325 L200 332 L204 325" fill={TERRACOTTA} fillOpacity="0.4" />
      {/* Dimension annotation */}
      <line x1="42" y1="70" x2="42" y2="100" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="38" y1="70" x2="46" y2="70" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="38" y1="100" x2="46" y2="100" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="40" y="88" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill={DARK} fillOpacity="0.4">70</text>
    </svg>
  );
}

export function IllustrationRegulations() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={CREAM} />
      {/* Document 1 (back, tilted) */}
      <g transform="rotate(-5 180 180)">
        <rect x="80" y="50" width="160" height="210" rx="3" fill={WHITE} stroke={LIGHT_LINE} strokeWidth="0.8" />
        {[75, 90, 105, 120, 135, 150, 165, 180, 195, 210].map(y => (
          <line key={`d1-${y}`} x1="100" y1={y} x2="220" y2={y} stroke={LIGHT_LINE} strokeWidth="0.3" strokeOpacity="0.5" />
        ))}
      </g>
      {/* Document 2 (front) */}
      <rect x="70" y="60" width="160" height="210" rx="3" fill={WHITE} stroke={DARK} strokeWidth="0.5" strokeOpacity="0.3" />
      <rect x="85" y="75" width="80" height="8" rx="1" fill={DARK} fillOpacity="0.12" />
      <rect x="85" y="90" width="120" height="5" rx="1" fill={DARK} fillOpacity="0.06" />
      <rect x="85" y="100" width="100" height="5" rx="1" fill={DARK} fillOpacity="0.06" />
      {[120, 132, 144, 156, 168, 180, 192, 204, 216, 228].map(y => (
        <line key={`d2-${y}`} x1="85" y1={y} x2={y < 200 ? 210 : 180} y2={y} stroke={LIGHT_LINE} strokeWidth="0.4" strokeOpacity="0.5" />
      ))}
      {/* Certification stamp */}
      <circle cx="190" cy="230" r="22" fill="none" stroke={TERRACOTTA} strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="190" cy="230" r="18" fill="none" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
      <text x="190" y="228" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill={TERRACOTTA} fillOpacity="0.5">EN</text>
      <text x="190" y="237" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill={TERRACOTTA} fillOpacity="0.5">12727</text>
      {/* Checkmark badge */}
      <rect x="60" y="300" width="90" height="60" rx="4" fill={TERRACOTTA} fillOpacity="0.08" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.2" />
      <path d="M85 330 L95 340 L115 315" stroke={TERRACOTTA} strokeWidth="2" fill="none" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="105" y="352" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill={TERRACOTTA} fillOpacity="0.5">CERTIFIED</text>
      {/* Fire rating badge */}
      <rect x="170" y="300" width="90" height="60" rx="4" fill={DARK} fillOpacity="0.04" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.15" />
      <text x="215" y="325" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill={DARK} fillOpacity="0.3">M2</text>
      <text x="215" y="338" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill={DARK} fillOpacity="0.25">Fire rated</text>
      <text x="215" y="352" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill={DARK} fillOpacity="0.2">NF P 92-507</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR PRODUCT ILLUSTRATIONS (for SidebarProductCard — aspect 4:3)
// ═══════════════════════════════════════════════════════════════════════════════

export function IllustrationBistrotChair() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(60, 15)">
        <path d="M20 10 Q40 2 60 10 V50 H20 Z" fill={DARK} fillOpacity="0.08" stroke={DARK} strokeWidth="1" strokeOpacity="0.35" />
        <rect x="15" y="50" width="50" height="5" rx="1.5" fill={DARK} fillOpacity="0.12" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="20" y1="55" x2="18" y2="120" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="60" y1="55" x2="62" y2="120" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.35" />
        <path d="M22 10 Q10 50 18 120" stroke={DARK} strokeWidth="1.2" fill="none" strokeOpacity="0.25" />
        <path d="M58 10 Q70 50 62 120" stroke={DARK} strokeWidth="1.2" fill="none" strokeOpacity="0.25" />
        <line x1="25" y1="90" x2="55" y2="90" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.2" />
      </g>
    </svg>
  );
}

export function IllustrationRopeArmchair() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(45, 10)">
        <path d="M15 40 Q15 5 55 5 Q95 5 95 40" stroke={TEAK} strokeWidth="1.5" fill="none" strokeOpacity="0.5" />
        <path d="M18 38 Q18 12 55 12 Q92 12 92 38 V55 H18 Z" fill={SAND} />
        {[20, 27, 34, 41, 48].map(y => (
          <path key={`rw-${y}`} d={`M22 ${y} Q55 ${y - 3} 88 ${y}`} stroke={TEAK} strokeWidth="0.5" fill="none" strokeOpacity="0.3" />
        ))}
        <path d="M15 40 L8 55 L8 60" stroke={TEAK} strokeWidth="1.5" fill="none" strokeOpacity="0.4" />
        <path d="M95 40 L102 55 L102 60" stroke={TEAK} strokeWidth="1.5" fill="none" strokeOpacity="0.4" />
        <rect x="15" y="55" width="80" height="10" rx="3" fill={TERRACOTTA} fillOpacity="0.15" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="18" y1="65" x2="12" y2="125" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="92" y1="65" x2="98" y2="125" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="40" y1="65" x2="38" y2="125" stroke={TEAK} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="70" y1="65" x2="72" y2="125" stroke={TEAK} strokeWidth="1" strokeOpacity="0.3" />
      </g>
    </svg>
  );
}

export function IllustrationBarStool() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(65, 5)">
        <path d="M15 20 Q35 12 55 20 V35 H15 Z" fill={TEAK} fillOpacity="0.1" stroke={TEAK} strokeWidth="1" strokeOpacity="0.4" />
        <rect x="10" y="35" width="50" height="6" rx="2" fill={TEAK} fillOpacity="0.15" stroke={TEAK} strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="15" y1="41" x2="8" y2="135" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="55" y1="41" x2="62" y2="135" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <rect x="18" y="95" width="34" height="3" rx="1" fill={TEAK} fillOpacity="0.2" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="13" y1="70" x2="57" y2="70" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.15" />
      </g>
    </svg>
  );
}

export function IllustrationAluminiumChair() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(60, 15)">
        <rect x="18" y="8" width="44" height="48" rx="2" fill="none" stroke="#8A9AA8" strokeWidth="1" strokeOpacity="0.35" />
        {[15, 22, 29, 36, 43].map(y => (
          <line key={`sl-${y}`} x1="22" y1={y} x2="58" y2={y} stroke="#8A9AA8" strokeWidth="1.5" strokeOpacity="0.2" />
        ))}
        <rect x="14" y="56" width="52" height="5" rx="1.5" fill="#B8C0C8" fillOpacity="0.2" stroke="#8A9AA8" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="18" y1="61" x2="14" y2="120" stroke="#8A9AA8" strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="62" y1="61" x2="66" y2="120" stroke="#8A9AA8" strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="20" y1="8" x2="14" y2="120" stroke="#8A9AA8" strokeWidth="1" strokeOpacity="0.2" />
        <line x1="60" y1="8" x2="66" y2="120" stroke="#8A9AA8" strokeWidth="1" strokeOpacity="0.2" />
      </g>
    </svg>
  );
}

export function IllustrationTeakTable() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(30, 25)">
        <path d="M10 30 L60 15 L140 30 L90 45 Z" fill={TEAK} fillOpacity="0.2" stroke={TEAK} strokeWidth="0.8" strokeOpacity="0.4" />
        <path d="M25 33 L75 22" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.25" />
        <path d="M35 37 L100 25" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.2" />
        <path d="M50 40 L120 29" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.2" />
        <path d="M10 30 L10 35 L90 50 L140 35 L140 30" fill={TEAK} fillOpacity="0.12" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.3" />
        <line x1="20" y1="35" x2="20" y2="110" stroke={TEAK} strokeWidth="1.5" strokeOpacity="0.35" />
        <line x1="80" y1="48" x2="80" y2="115" stroke={TEAK} strokeWidth="1.5" strokeOpacity="0.35" />
        <line x1="130" y1="35" x2="130" y2="110" stroke={TEAK} strokeWidth="1.5" strokeOpacity="0.3" />
      </g>
    </svg>
  );
}

export function IllustrationRopeArmchairAlt() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(45, 12)">
        <path d="M10 35 Q10 8 55 8 Q100 8 100 35" stroke={TEAK} strokeWidth="1.2" fill="none" strokeOpacity="0.45" />
        <path d="M12 33 Q12 14 55 14 Q98 14 98 33 V58 H12 Z" fill={SAND} />
        {[22, 30, 38, 46, 54].map(y => (
          <path key={`rw2-${y}`} d={`M16 ${y} Q55 ${y - 4} 94 ${y}`} stroke={TERRACOTTA} strokeWidth="0.6" fill="none" strokeOpacity="0.25" />
        ))}
        <rect x="10" y="58" width="90" height="8" rx="3" fill={TERRACOTTA} fillOpacity="0.12" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.25" />
        <rect x="2" y="45" width="10" height="22" rx="2" fill={TEAK} fillOpacity="0.12" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.25" />
        <rect x="98" y="45" width="10" height="22" rx="2" fill={TEAK} fillOpacity="0.12" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.25" />
        <line x1="15" y1="66" x2="10" y2="125" stroke={TEAK} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="95" y1="66" x2="100" y2="125" stroke={TEAK} strokeWidth="1" strokeOpacity="0.35" />
      </g>
    </svg>
  );
}

export function IllustrationCantileverParasol() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <rect x="30" y="30" width="3" height="105" fill={TEAK} fillOpacity="0.4" />
      <line x1="32" y1="30" x2="110" y2="22" stroke={TEAK} strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M40 28 Q110 8 170 28" fill={TERRACOTTA} fillOpacity="0.2" />
      <path d="M40 28 Q110 8 170 28" stroke={TERRACOTTA} strokeWidth="1" fill="none" strokeOpacity="0.45" />
      <line x1="65" y1="24" x2="110" y2="14" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.25" />
      <line x1="140" y1="23" x2="110" y2="14" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.25" />
      <rect x="20" y="132" width="24" height="8" rx="2" fill={DARK} fillOpacity="0.15" />
      <ellipse cx="110" cy="138" rx="55" ry="5" fill={DARK} fillOpacity="0.04" />
    </svg>
  );
}

export function IllustrationSunLounger() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(20, 35)">
        <rect x="15" y="50" width="130" height="7" rx="2" fill={TEAK} fillOpacity="0.15" stroke={TEAK} strokeWidth="0.8" strokeOpacity="0.35" />
        <path d="M15 50 L5 20" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <path d="M50 50 L40 20" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.4" />
        <rect x="5" y="20" width="35" height="30" rx="2" fill={SAND} fillOpacity="0.6" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.25" />
        {[28, 35, 42].map(y => (
          <line key={`mesh-${y}`} x1="8" y1={y} x2="38" y2={y} stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.2" />
        ))}
        <rect x="50" y="45" width="90" height="6" rx="2" fill={TERRACOTTA} fillOpacity="0.1" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.2" />
        <line x1="30" y1="57" x2="30" y2="90" stroke={TEAK} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="80" y1="57" x2="80" y2="90" stroke={TEAK} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="130" y1="57" x2="130" y2="90" stroke={TEAK} strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="140" cy="90" r="4" fill="none" stroke={TEAK} strokeWidth="0.8" strokeOpacity="0.25" />
      </g>
    </svg>
  );
}

export function IllustrationCentrePoleParasol() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <rect x="98" y="25" width="4" height="110" fill={TEAK} fillOpacity="0.4" />
      <path d="M25 35 Q100 5 175 35" fill={TERRACOTTA} fillOpacity="0.18" />
      <path d="M25 35 Q100 5 175 35" stroke={TERRACOTTA} strokeWidth="1" fill="none" strokeOpacity="0.4" />
      <line x1="50" y1="28" x2="100" y2="15" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="75" y1="24" x2="100" y2="15" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="125" y1="24" x2="100" y2="15" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="150" y1="28" x2="100" y2="15" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.2" />
      <circle cx="100" cy="13" r="3" fill={TEAK} fillOpacity="0.3" />
      <rect x="85" y="133" width="30" height="6" rx="2" fill={DARK} fillOpacity="0.1" />
      <ellipse cx="100" cy="140" rx="60" ry="4" fill={DARK} fillOpacity="0.04" />
    </svg>
  );
}

export function IllustrationSquareTable() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(40, 20)">
        <path d="M10 30 L50 18 L120 30 L80 42 Z" fill={DARK} fillOpacity="0.06" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.25" />
        <path d="M10 30 L10 34 L80 46 L120 34 L120 30" fill={DARK} fillOpacity="0.04" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.2" />
        <line x1="15" y1="34" x2="15" y2="110" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.25" />
        <line x1="75" y1="44" x2="75" y2="115" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.25" />
        <line x1="115" y1="34" x2="115" y2="110" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.2" />
        {[25, 30, 35].map(y => [30, 50, 70, 90].map(x => (
          <circle key={`hpl-${x}-${y}`} cx={x} cy={y} r="0.5" fill={DARK} fillOpacity="0.06" />
        )))}
      </g>
    </svg>
  );
}

export function IllustrationRectTable() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(25, 25)">
        <path d="M5 30 L60 15 L150 30 L95 45 Z" fill={TEAK} fillOpacity="0.18" stroke={TEAK} strokeWidth="0.8" strokeOpacity="0.35" />
        <path d="M20 33 L80 22" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.2" />
        <path d="M40 38 L110 26" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.18" />
        <path d="M55 42 L130 30" stroke={TEAK} strokeWidth="0.3" strokeOpacity="0.15" />
        <path d="M5 30 L5 35 L95 50 L150 35 L150 30" fill={TEAK} fillOpacity="0.1" stroke={TEAK} strokeWidth="0.5" strokeOpacity="0.25" />
        <line x1="12" y1="35" x2="12" y2="105" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.3" />
        <line x1="88" y1="48" x2="88" y2="110" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.3" />
        <line x1="142" y1="35" x2="142" y2="105" stroke={TEAK} strokeWidth="1.2" strokeOpacity="0.25" />
      </g>
    </svg>
  );
}

export function IllustrationHighTable() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(55, 8)">
        <rect x="10" y="15" width="70" height="5" rx="1.5" fill={DARK} fillOpacity="0.1" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.3" />
        <rect x="10" y="20" width="70" height="3" rx="1" fill={DARK} fillOpacity="0.06" />
        <line x1="18" y1="23" x2="15" y2="130" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.3" />
        <line x1="72" y1="23" x2="75" y2="130" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.3" />
        <line x1="20" y1="105" x2="70" y2="105" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.2" />
        <rect x="22" y="85" width="46" height="3" rx="1" fill={DARK} fillOpacity="0.08" stroke={DARK} strokeWidth="0.5" strokeOpacity="0.15" />
        <line x1="92" y1="15" x2="92" y2="130" stroke={TERRACOTTA} strokeWidth="0.5" strokeDasharray="3 3" strokeOpacity="0.3" />
        <text x="94" y="75" fontFamily="sans-serif" fontSize="7" fill={TERRACOTTA} fillOpacity="0.4">110cm</text>
      </g>
    </svg>
  );
}

export function IllustrationCertifiedChair() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(45, 12)">
        <path d="M25 15 Q45 8 65 15 V55 H25 Z" fill={DARK} fillOpacity="0.06" stroke={DARK} strokeWidth="0.8" strokeOpacity="0.3" />
        <rect x="22" y="55" width="46" height="5" rx="1.5" fill={DARK} fillOpacity="0.08" stroke={DARK} strokeWidth="0.6" strokeOpacity="0.25" />
        <line x1="25" y1="60" x2="22" y2="110" stroke={DARK} strokeWidth="1" strokeOpacity="0.25" />
        <line x1="65" y1="60" x2="68" y2="110" stroke={DARK} strokeWidth="1" strokeOpacity="0.25" />
      </g>
      {/* Certification badge */}
      <circle cx="150" cy="30" r="18" fill={TERRACOTTA} fillOpacity="0.1" stroke={TERRACOTTA} strokeWidth="1" strokeOpacity="0.35" />
      <text x="150" y="28" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fontWeight="bold" fill={TERRACOTTA} fillOpacity="0.6">EN</text>
      <text x="150" y="36" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill={TERRACOTTA} fillOpacity="0.5">12727</text>
      <text x="150" y="55" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill={DARK} fillOpacity="0.25">Level 4</text>
    </svg>
  );
}

export function IllustrationFireCushion() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(40, 30)">
        <rect x="15" y="25" width="90" height="55" rx="6" fill={TERRACOTTA} fillOpacity="0.1" stroke={TERRACOTTA} strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="45" y1="28" x2="45" y2="77" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.15" />
        <line x1="75" y1="28" x2="75" y2="77" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.15" />
        <line x1="18" y1="50" x2="102" y2="50" stroke={TERRACOTTA} strokeWidth="0.4" strokeOpacity="0.15" />
        <path d="M15 80 L15 85 Q60 90 105 85 L105 80" fill={TERRACOTTA} fillOpacity="0.06" stroke={TERRACOTTA} strokeWidth="0.5" strokeOpacity="0.2" />
      </g>
      {/* Fire badge */}
      <circle cx="155" cy="28" r="16" fill="none" stroke={TERRACOTTA} strokeWidth="1" strokeOpacity="0.35" />
      <text x="155" y="26" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fontWeight="bold" fill={TERRACOTTA} fillOpacity="0.55">NF P</text>
      <text x="155" y="34" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill={TERRACOTTA} fillOpacity="0.45">92-507</text>
    </svg>
  );
}

export function IllustrationContractArmchair() {
  return (
    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="200" height="150" fill={CREAM} />
      <g transform="translate(45, 10)">
        <path d="M10 30 Q10 5 55 5 Q100 5 100 30 V55 H10 Z" fill={DARK} fillOpacity="0.06" stroke={DARK} strokeWidth="1" strokeOpacity="0.3" />
        <rect x="2" y="40" width="12" height="20" rx="2" fill={DARK} fillOpacity="0.05" stroke={DARK} strokeWidth="0.6" strokeOpacity="0.2" />
        <rect x="96" y="40" width="12" height="20" rx="2" fill={DARK} fillOpacity="0.05" stroke={DARK} strokeWidth="0.6" strokeOpacity="0.2" />
        <rect x="8" y="55" width="94" height="8" rx="3" fill={DARK} fillOpacity="0.08" stroke={DARK} strokeWidth="0.6" strokeOpacity="0.25" />
        <line x1="14" y1="63" x2="8" y2="120" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.25" />
        <line x1="96" y1="63" x2="102" y2="120" stroke={DARK} strokeWidth="1.2" strokeOpacity="0.25" />
      </g>
      {/* Warranty badge */}
      <rect x="135" y="15" width="45" height="22" rx="3" fill={TEAK} fillOpacity="0.08" stroke={TEAK} strokeWidth="0.6" strokeOpacity="0.25" />
      <text x="157" y="28" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill={TEAK} fillOpacity="0.5">3-year</text>
      <text x="157" y="35" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill={TEAK} fillOpacity="0.4">warranty</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP MAPS
// ═══════════════════════════════════════════════════════════════════════════════

export const TOPIC_ILLUSTRATIONS: Record<string, React.FC> = {
  seating: IllustrationSeating,
  materials: IllustrationMaterials,
  shade: IllustrationShade,
  layout: IllustrationLayout,
  regulations: IllustrationRegulations,
};

export const SIDEBAR_ILLUSTRATIONS: Record<string, React.FC> = {
  "Bistrot Stackable Chair": IllustrationBistrotChair,
  "Rope Armchair": IllustrationRopeArmchair,
  "Teak Bar Stool": IllustrationBarStool,
  "Marine-grade Aluminium": IllustrationAluminiumChair,
  "FSC Teak Collection": IllustrationTeakTable,
  "Rope-woven Armchair": IllustrationRopeArmchairAlt,
  "Cantilever Parasol 3m": IllustrationCantileverParasol,
  "Pool Sun Lounger": IllustrationSunLounger,
  "Centre-pole Parasol 4m": IllustrationCentrePoleParasol,
  "HPL Dining Table 70×70": IllustrationSquareTable,
  "Teak Table 120×70": IllustrationRectTable,
  "High Table 80×80 Bar": IllustrationHighTable,
  "EN 12727 Certified Chair": IllustrationCertifiedChair,
  "Fire-retardant Cushion": IllustrationFireCushion,
  "CHR Contract Armchair": IllustrationContractArmchair,
};
