import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Pin, PinOff, Pencil, Trash2, Send, StickyNote, MapPin, Check, X,
} from "lucide-react";
import { useProjectAnnotations } from "@/hooks/useArchitectProjects";
import type { ProjectAnnotation } from "@/hooks/useArchitectProjects";

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(isoDate: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("annotations.just_now");
  if (minutes < 60) return t("annotations.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("annotations.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("annotations.days_ago", { count: days });
  const months = Math.floor(days / 30);
  return t("annotations.months_ago", { count: months });
}

const AUTHOR_BADGE_STYLES: Record<string, string> = {
  architect: "bg-blue-100 text-blue-700",
  admin: "bg-amber-100 text-amber-700",
  client: "bg-emerald-100 text-emerald-700",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  zoneId?: string | null;
  zoneName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProjectAnnotations({ projectId, zoneId = null, zoneName }: Props) {
  const { t } = useTranslation();
  const {
    annotations, isLoading, currentUserId, zones,
    addAnnotation, updateAnnotation, deleteAnnotation, togglePin,
  } = useProjectAnnotations(projectId);

  // ── Input state ────────────────────────────────────────────────────────────
  const [newText, setNewText] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(zoneId ?? null);

  // ── Filter state (only when showing all zones) ─────────────────────────────
  const [activeTab, setActiveTab] = useState<string | null>(null); // null = "All"

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // ── Derived ────────────────────────────────────────────────────────────────
  const showAllZones = zoneId === null || zoneId === undefined;

  const filteredAnnotations = useMemo(() => {
    let list = annotations;

    // If component is scoped to a specific zone, filter by it
    if (!showAllZones && zoneId) {
      list = list.filter((a) => a.zoneId === zoneId);
    }

    // If showing all but user picked a zone tab, filter
    if (showAllZones && activeTab) {
      list = list.filter((a) => a.zoneId === activeTab);
    }

    // Sort: pinned first, then newest first
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [annotations, zoneId, showAllZones, activeTab]);

  // ── Zone name resolver ─────────────────────────────────────────────────────
  const zoneNameForId = (id: string | null): string | null => {
    if (!id) return null;
    if (zoneName && id === zoneId) return zoneName;
    return zones.find((z) => z.id === id)?.name ?? null;
  };

  // Resolve zone name for selector
  const selectedZoneName = selectedZoneId
    ? zoneNameForId(selectedZoneId) ?? selectedZoneId
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePost = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    addAnnotation({
      text: trimmed,
      zoneId: showAllZones ? selectedZoneId : (zoneId ?? null),
      zoneName: showAllZones ? selectedZoneName : (zoneName ?? null),
    });
    setNewText("");
  };

  const handleStartEdit = (annotation: ProjectAnnotation) => {
    setEditingId(annotation.id);
    setEditText(annotation.text);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      updateAnnotation(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("annotations.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Comment input ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t("annotations.placeholder")}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex items-center justify-between gap-2">
          {/* Zone selector when showing all zones */}
          {showAllZones && zones.length > 0 ? (
            <select
              value={selectedZoneId ?? ""}
              onChange={(e) => setSelectedZoneId(e.target.value || null)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("annotations.project_level")}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">
              {zoneName ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {zoneName}
                </span>
              ) : (
                t("annotations.project_level")
              )}
            </span>
          )}
          <button
            onClick={handlePost}
            disabled={!newText.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {t("annotations.post")}
          </button>
        </div>
      </div>

      {/* ── Zone filter tabs (only when showing all) ──────────────────────── */}
      {showAllZones && zones.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("annotations.all")}
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setActiveTab(z.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === z.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Comment list ──────────────────────────────────────────────────── */}
      {filteredAnnotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <StickyNote className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("annotations.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`rounded-lg border p-3 text-sm transition-colors ${
                annotation.pinned ? "border-amber-200 bg-amber-50/50" : "bg-card"
              }`}
            >
              {/* Header row */}
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {annotation.pinned && (
                    <Pin className="h-3 w-3 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate font-medium text-foreground">
                    {annotation.authorName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                      AUTHOR_BADGE_STYLES[annotation.authorType] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t(`annotations.role_${annotation.authorType}`)}
                  </span>
                  {showAllZones && annotation.zoneName && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      <MapPin className="h-2.5 w-2.5" />
                      {annotation.zoneName}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {relativeTime(annotation.createdAt, t)}
                  {annotation.updatedAt && (
                    <span className="ml-1 italic">
                      ({t("annotations.edited")})
                    </span>
                  )}
                </span>
              </div>

              {/* Body / edit mode */}
              {editingId === annotation.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editText.trim()}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      {t("annotations.save")}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                    >
                      <X className="h-3 w-3" />
                      {t("annotations.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {annotation.text}
                </p>
              )}

              {/* Actions */}
              {editingId !== annotation.id && (
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => togglePin(annotation.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={annotation.pinned ? t("annotations.unpin") : t("annotations.pin")}
                  >
                    {annotation.pinned ? (
                      <PinOff className="h-3 w-3" />
                    ) : (
                      <Pin className="h-3 w-3" />
                    )}
                    {annotation.pinned ? t("annotations.unpin") : t("annotations.pin")}
                  </button>
                  {annotation.authorId === currentUserId && (
                    <>
                      <button
                        onClick={() => handleStartEdit(annotation)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                        {t("annotations.edit")}
                      </button>
                      <button
                        onClick={() => deleteAnnotation(annotation.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("annotations.delete")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
