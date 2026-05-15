// Reusable Founding Partner badge (silver/gold/platinum/founder).
// Phase 3 Vague 2 Session 2 (Dette 108).
//
// Visuel uniquement, sans logique de fetch. Le parent passe le tier.
// Pour fetch un tier publiquement (page partner publique), utiliser
// `useFoundingBadge(partnerId)` qui appelle la RPC SECURITY DEFINER.

import { Crown, Gem, Trophy, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FoundingTier } from "@/hooks/useFoundingScore";

const TIER_VISUAL: Record<FoundingTier, { label: string; icon: typeof Sparkles; className: string }> = {
  founder:  { label: "Founder",          icon: Sparkles, className: "bg-slate-100 text-slate-700  border-slate-300  hover:bg-slate-100" },
  silver:   { label: "Silver Founder",   icon: Trophy,   className: "bg-zinc-100  text-zinc-800   border-zinc-400   hover:bg-zinc-100"  },
  gold:     { label: "Gold Founder",     icon: Gem,      className: "bg-amber-100 text-amber-800  border-amber-400  hover:bg-amber-100" },
  platinum: { label: "Platinum Founder", icon: Crown,    className: "bg-violet-100 text-violet-800 border-violet-400 hover:bg-violet-100" },
};

interface Props {
  tier: FoundingTier;
  size?: "sm" | "md";
}

export default function FoundingBadge({ tier, size = "md" }: Props) {
  const v = TIER_VISUAL[tier];
  const Icon = v.icon;
  return (
    <Badge className={`gap-1 border font-medium ${v.className} ${size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}>
      <Icon className="h-3 w-3" />
      {v.label}
    </Badge>
  );
}
