import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Check, ImagePlus, Star, Trash2, Loader2 } from "lucide-react";
import { usePartnerGallery, type GalleryPhoto } from "./PhotoGalleryManager";

interface Props {
  productId: string;
  productName: string;
  currentImageUrl: string | null;
  currentGalleryUrls: string[];
  partnerId: string;
  onClose: () => void;
}

export default function ProductPhotoLinker({
  productId, productName, currentImageUrl, currentGalleryUrls, partnerId, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const { photos, isLoading } = usePartnerGallery(partnerId);
  const [mainImage, setMainImage] = useState<string | null>(currentImageUrl);
  const [gallery, setGallery] = useState<string[]>(currentGalleryUrls || []);
  const [saving, setSaving] = useState(false);

  const allSelected = new Set([mainImage, ...gallery].filter(Boolean));

  const togglePhoto = (url: string) => {
    if (mainImage === url) {
      // Remove as main → if gallery has items, promote first
      if (gallery.length > 0) {
        setMainImage(gallery[0]);
        setGallery(gallery.slice(1));
      } else {
        setMainImage(null);
      }
    } else if (gallery.includes(url)) {
      setGallery(gallery.filter(u => u !== url));
    } else {
      // Add photo
      if (!mainImage) {
        setMainImage(url);
      } else {
        setGallery([...gallery, url]);
      }
    }
  };

  const setAsMain = (url: string) => {
    const newGallery = [mainImage, ...gallery].filter((u): u is string => !!u && u !== url);
    setMainImage(url);
    setGallery(newGallery);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({
        image_url: mainImage,
        gallery_urls: gallery,
      }).eq("id", productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Photos associées au produit");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-sm text-foreground">
              Photos — {productName}
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              Sélectionnez les photos depuis votre galerie. La première sélectionnée sera la photo principale.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current selection preview */}
          <div className="border border-border rounded-xl p-3 space-y-2">
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Photos sélectionnées ({(mainImage ? 1 : 0) + gallery.length})
            </p>
            {!mainImage && gallery.length === 0 ? (
              <p className="text-[10px] font-body text-muted-foreground italic py-2">Aucune photo associée</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {mainImage && (
                  <div className="relative">
                    <img src={mainImage} alt="Principal" className="w-16 h-16 rounded-lg object-cover border-2 border-foreground" />
                    <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
                      <Star className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
                    </span>
                  </div>
                )}
                {gallery.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Gallery ${i}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => setAsMain(url)}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-muted-foreground/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Définir comme principale"
                    >
                      <Star className="h-2.5 w-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gallery grid */}
          <div>
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Votre galerie ({photos.length} photos)
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <ImagePlus className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[10px] font-body text-muted-foreground">Aucune photo dans votre galerie.</p>
                <p className="text-[10px] font-body text-muted-foreground">Ouvrez la galerie pour uploader des photos d'abord.</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {photos.map(photo => {
                  const isSelected = allSelected.has(photo.url);
                  const isMain = mainImage === photo.url;
                  return (
                    <button
                      key={photo.name}
                      onClick={() => togglePhoto(photo.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isMain ? "border-foreground ring-2 ring-foreground/20" :
                        isSelected ? "border-blue-500 ring-2 ring-blue-200" :
                        "border-transparent hover:border-foreground/20"
                      }`}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          isMain ? "bg-foreground" : "bg-blue-500"
                        }`}>
                          {isMain ? (
                            <Star className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
                          ) : (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground/30 transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-display font-bold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40 transition-all">
            <Check className="h-3.5 w-3.5" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
