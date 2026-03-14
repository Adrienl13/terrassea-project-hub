import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, X, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";

type ProductFormData = Omit<DBProduct, "id"> & { id?: string };

const emptyProduct: ProductFormData = {
  name: "",
  category: "",
  subcategory: "",
  short_description: "",
  long_description: "",
  indicative_price: "",
  image_url: "",
  gallery_urls: [],
  product_family: "",
  collection: "",
  main_color: "",
  secondary_color: "",
  available_colors: [],
  style_tags: [],
  ambience_tags: [],
  palette_tags: [],
  material_tags: [],
  use_case_tags: [],
  technical_tags: [],
  material_structure: "",
  material_seat: "",
  dimensions_length_cm: null,
  dimensions_width_cm: null,
  dimensions_height_cm: null,
  seat_height_cm: null,
  weight_kg: null,
  is_outdoor: true,
  is_stackable: false,
  is_chr_heavy_use: false,
  uv_resistant: false,
  weather_resistant: false,
  fire_retardant: false,
  lightweight: false,
  easy_maintenance: false,
  customizable: false,
  dismountable: false,
  requires_assembly: false,
  country_of_manufacture: "",
  warranty: "",
  maintenance_info: "",
  stock_status: "available",
  stock_quantity: null,
  estimated_delivery_days: null,
  price_min: null,
  price_max: null,
  popularity_score: 0.5,
  priority_score: 0.5,
  availability_type: "available",
  brand_source: "",
  supplier_internal: "",
  documents: [],
};

const CATEGORIES = ["Chairs", "Armchairs", "Tables", "Bar Stools", "Parasols", "Lounge Seating"];

const Admin = () => {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    try {
      const { id, ...data } = editing;

      if (id) {
        const { error } = await supabase.from("products").update(data).eq("id", id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(data);
        if (error) throw error;
        toast.success("Product created");
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const TagInput = ({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) => (
    <div>
      <label className="text-xs font-body text-muted-foreground block mb-1">{label}</label>
      <input
        type="text"
        value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="tag1, tag2, tag3"
        className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground"
      />
    </div>
  );

  if (editing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {editing.id ? "Edit Product" : "New Product"}
            </h1>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Name *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Category *</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">Select...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Subcategory</label>
                <input type="text" value={editing.subcategory || ""} onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Product Family</label>
                <input type="text" value={editing.product_family || ""} onChange={(e) => setEditing({ ...editing, product_family: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
            </div>

            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Short Description</label>
              <textarea value={editing.short_description || ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} rows={2} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Indicative Price</label>
                <input type="text" value={editing.indicative_price || ""} onChange={(e) => setEditing({ ...editing, indicative_price: e.target.value })} placeholder="From €320" className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Image URL</label>
                <input type="text" value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Main Color</label>
                <input type="text" value={editing.main_color || ""} onChange={(e) => setEditing({ ...editing, main_color: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Secondary Color</label>
                <input type="text" value={editing.secondary_color || ""} onChange={(e) => setEditing({ ...editing, secondary_color: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-display font-semibold text-sm text-foreground mb-3">Tags</h3>
              <div className="space-y-3">
                <TagInput label="Style Tags" value={editing.style_tags} onChange={(v) => setEditing({ ...editing, style_tags: v })} />
                <TagInput label="Ambience Tags" value={editing.ambience_tags} onChange={(v) => setEditing({ ...editing, ambience_tags: v })} />
                <TagInput label="Palette Tags" value={editing.palette_tags} onChange={(v) => setEditing({ ...editing, palette_tags: v })} />
                <TagInput label="Material Tags" value={editing.material_tags} onChange={(v) => setEditing({ ...editing, material_tags: v })} />
                <TagInput label="Use Case Tags" value={editing.use_case_tags} onChange={(v) => setEditing({ ...editing, use_case_tags: v })} />
                <TagInput label="Technical Tags" value={editing.technical_tags} onChange={(v) => setEditing({ ...editing, technical_tags: v })} />
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-display font-semibold text-sm text-foreground mb-3">Properties</h3>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm font-body text-foreground">
                  <input type="checkbox" checked={editing.is_outdoor} onChange={(e) => setEditing({ ...editing, is_outdoor: e.target.checked })} className="rounded" />
                  Outdoor
                </label>
                <label className="flex items-center gap-2 text-sm font-body text-foreground">
                  <input type="checkbox" checked={editing.is_stackable} onChange={(e) => setEditing({ ...editing, is_stackable: e.target.checked })} className="rounded" />
                  Stackable
                </label>
                <label className="flex items-center gap-2 text-sm font-body text-foreground">
                  <input type="checkbox" checked={editing.is_chr_heavy_use} onChange={(e) => setEditing({ ...editing, is_chr_heavy_use: e.target.checked })} className="rounded" />
                  CHR Heavy Use
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Popularity (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={editing.popularity_score} onChange={(e) => setEditing({ ...editing, popularity_score: parseFloat(e.target.value) || 0 })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Priority (0-1)</label>
                <input type="number" step="0.01" min="0" max="1" value={editing.priority_score} onChange={(e) => setEditing({ ...editing, priority_score: parseFloat(e.target.value) || 0 })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Brand Source</label>
                <input type="text" value={editing.brand_source || ""} onChange={(e) => setEditing({ ...editing, brand_source: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Supplier (internal)</label>
                <input type="text" value={editing.supplier_internal || ""} onChange={(e) => setEditing({ ...editing, supplier_internal: e.target.value })} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !editing.name || !editing.category}
                className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Product"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-6 py-3 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">Product Admin</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">{products.length} products in catalogue</p>
          </div>
          <button
            onClick={() => setEditing({ ...emptyProduct })}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search products..."
          className="w-full max-w-sm bg-card rounded-sm px-4 py-2.5 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground mb-6"
        />

        {isLoading ? (
          <p className="text-muted-foreground font-body">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-3 font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="text-left py-3 px-3 font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Style</th>
                  <th className="text-left py-3 px-3 font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Pop.</th>
                  <th className="text-right py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border hover:bg-card/50 transition-colors">
                    <td className="py-3 px-3 font-body text-foreground">{product.name}</td>
                    <td className="py-3 px-3 font-body text-muted-foreground">{product.category}</td>
                    <td className="py-3 px-3 font-body text-muted-foreground">{product.indicative_price}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {product.style_tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] font-body bg-card text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-body text-muted-foreground">{product.popularity_score}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setEditing({ ...product })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
