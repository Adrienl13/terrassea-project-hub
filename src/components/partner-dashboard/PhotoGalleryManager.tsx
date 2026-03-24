import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, X, Upload } from "lucide-react";

export interface GalleryPhoto {
  name: string;
  url: string;
  created_at: string;
}

export function usePartnerGallery(partnerId: string | null) {
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["partner-gallery", partnerId],
    queryFn: async () => {
      const folder = `partner-gallery/${partnerId}`;
      const { data, error } = await supabase.storage.from("product-images").list(folder, {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error || !data) return [];
      return data
        .filter(f => !f.name.startsWith("."))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from("product-images").getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
          created_at: f.created_at || "",
        }));
    },
    enabled: !!partnerId,
  });

  const uploadPhotos = async (files: File[]) => {
    const folder = `partner-gallery/${partnerId}`;
    let uploaded = 0;
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const slug = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
      const path = `${folder}/${Date.now()}-${slug}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (!error) uploaded++;
    }
    queryClient.invalidateQueries({ queryKey: ["partner-gallery", partnerId] });
    return uploaded;
  };

  const deletePhoto = async (name: string) => {
    const path = `partner-gallery/${partnerId}/${name}`;
    await supabase.storage.from("product-images").remove([path]);
    queryClient.invalidateQueries({ queryKey: ["partner-gallery", partnerId] });
  };

  return { photos, isLoading, uploadPhotos, deletePhoto };
}

interface Props {
  partnerId: string;
  onClose: () => void;
}

export default function PhotoGalleryManager({ partnerId, onClose }: Props) {
  const { photos, isLoading, uploadPhotos, deletePhoto } = usePartnerGallery(partnerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const count = await uploadPhotos(files);
      toast.success(`${count} photo${count > 1 ? "s" : ""} uploadée${count > 1 ? "s" : ""}`);
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await deletePhoto(name);
      toast.success("Photo supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> Galerie photos
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              {photos.length} photo{photos.length > 1 ? "s" : ""} — Uploadez vos photos puis associez-les à vos produits
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            {uploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs font-display font-semibold text-foreground">Ajouter des photos</p>
                <p className="text-[10px] font-body text-muted-foreground mt-0.5">JPG, PNG, WebP — sélection multiple</p>
              </>
            )}
          </div>

          {/* Gallery grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12">
              <ImagePlus className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs font-body text-muted-foreground">Aucune photo. Commencez par uploader vos images produit.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {photos.map(photo => (
                <div key={photo.name} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo.name); }}
                    disabled={deleting === photo.name}
                    className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deleting === photo.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
