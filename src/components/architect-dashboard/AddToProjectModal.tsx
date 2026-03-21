import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FolderOpen, MapPin, ChevronRight, CheckCircle2, X, Plus, Package, Loader2,
} from "lucide-react";
import type { DBProduct } from "@/lib/products";
import type { SelectedSupplier } from "@/contexts/ProjectCartContext";
import { useArchitectProjects, useProjectZones } from "@/hooks/useArchitectProjects";
import { toast } from "sonner";

// ── Component ──────────────────────────────────────────────────────────────────

const VENUE_ICONS: Record<string, string> = {
  hotel: "🏨", restaurant: "🍽", bar: "🍸", "beach-club": "🏖", rooftop: "🌇", cafe: "☕",
};

interface AddToProjectModalProps {
  open: boolean;
  onClose: () => void;
  product: DBProduct;
  quantity?: number;
  supplier?: SelectedSupplier | null;
  onConfirm: (projectId: string, projectName: string, zoneName?: string) => void;
}

export default function AddToProjectModal({
  open, onClose, product, quantity = 1, supplier, onConfirm,
}: AddToProjectModalProps) {
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { projects, isLoading: projectsLoading } = useArchitectProjects();
  const { zones, isLoading: zonesLoading, addProductToZone } = useProjectZones(selectedProject ?? undefined);

  if (!open) return null;

  const currentProject = projects.find(p => p.id === selectedProject);

  const handleConfirm = async () => {
    if (!selectedProject || !currentProject) return;
    const zone = zones.find(z => z.id === selectedZone);

    // Persist product to zone in DB if a zone is selected
    if (selectedZone && zone) {
      try {
        await addProductToZone({
          zoneId: selectedZone,
          productId: product.id,
          quantity,
          supplierData: supplier ? {
            supplier_id: supplier.partnerId,
            supplier_name: supplier.partnerName,
            unit_price: supplier.price ?? undefined,
          } : undefined,
        });
      } catch (err: any) {
        console.error("Failed to add product to zone:", err);
        toast.error("Failed to add product to zone");
        return;
      }
    }

    onConfirm(selectedProject, currentProject.project_name, zone?.zone_name);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      setSelectedProject(null);
      setSelectedZone(null);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setSelectedProject(null);
    setSelectedZone(null);
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-sm shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-display font-bold text-sm text-foreground">{t('addToProject.title')}</p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              {quantity}× {product.name}
              {supplier && <> · {supplier.partnerName}</>}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success state */}
        {confirmed ? (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <CheckCircle2 className="h-10 w-10 text-green-600 mb-3" />
            <p className="font-display font-bold text-sm text-foreground text-center">{t('addToProject.added')}</p>
            <p className="text-[10px] font-body text-muted-foreground text-center mt-1">
              {quantity}× {product.name} → {currentProject?.project_name}
              {selectedZone && zones.find(z => z.id === selectedZone) && (
                <> · {zones.find(z => z.id === selectedZone)!.zone_name}</>
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Step 1: Select project */}
              {!selectedProject ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t('addToProject.selectProject')}
                  </p>
                  {projectsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t('addToProject.noProjects', 'No projects found. Create a project first.')}
                    </p>
                  ) : (
                    projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p.id);
                          setSelectedZone(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors text-left"
                      >
                        <span className="text-base">{VENUE_ICONS[p.venue_type || ""] || "📍"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-display font-semibold text-foreground truncate">{p.project_name}</p>
                          <p className="text-[10px] font-body text-muted-foreground">{p.client_name || ""}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Back + project header */}
                  <button
                    onClick={() => { setSelectedProject(null); setSelectedZone(null); }}
                    className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← {t('addToProject.changeProject')}
                  </button>

                  <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-sm border border-border">
                    <span className="text-base">{VENUE_ICONS[currentProject?.venue_type || ""] || "📍"}</span>
                    <div>
                      <p className="text-xs font-display font-semibold text-foreground">{currentProject!.project_name}</p>
                      <p className="text-[10px] font-body text-muted-foreground">{currentProject!.client_name || ""}</p>
                    </div>
                  </div>

                  {/* Step 2: Select zone (if project has zones) */}
                  {zonesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : zones.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {t('addToProject.selectZone')}
                      </p>
                      <div className="space-y-1.5">
                        {zones.map(z => (
                          <button
                            key={z.id}
                            onClick={() => setSelectedZone(z.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-colors text-left ${
                              selectedZone === z.id
                                ? "border-foreground bg-card"
                                : "border-border hover:border-foreground/20"
                            }`}
                          >
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-display font-semibold text-foreground">{z.zone_name}</p>
                              {z.zone_area && <p className="text-[10px] font-body text-muted-foreground">{z.zone_area}</p>}
                            </div>
                            {selectedZone === z.id && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-foreground ml-auto" />
                            )}
                          </button>
                        ))}
                        <button
                          onClick={() => setSelectedZone(null)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-colors text-left ${
                            selectedZone === null && selectedProject
                              ? "border-foreground bg-card"
                              : "border-border hover:border-foreground/20"
                          }`}
                        >
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs font-body text-muted-foreground">{t('addToProject.noZone')}</p>
                          {selectedZone === null && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-foreground ml-auto" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Product summary */}
                  <div className="border border-border rounded-sm p-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm overflow-hidden border border-border shrink-0 bg-muted">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold text-foreground truncate">{product.name}</p>
                        <p className="text-[10px] font-body text-muted-foreground">
                          {quantity}× · {supplier ? supplier.partnerName : t('addToProject.noSupplier')}
                          {supplier?.price && <> · €{supplier.price}/u</>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedProject && (
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={handleConfirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" /> {t('addToProject.confirm')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
