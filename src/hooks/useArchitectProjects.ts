import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

// ── DB Row Types ────────────────────────────────────────────────────────────────

type ArchitectProjectRow = Database["public"]["Tables"]["architect_projects"]["Row"];
type ArchitectProjectInsert = Database["public"]["Tables"]["architect_projects"]["Insert"];
type ArchitectProjectUpdate = Database["public"]["Tables"]["architect_projects"]["Update"];
type ProjectZoneRow = Database["public"]["Tables"]["project_zones"]["Row"];
type ProjectZoneUpdate = Database["public"]["Tables"]["project_zones"]["Update"];
type ProjectZoneProductRow = Database["public"]["Tables"]["project_zone_products"]["Row"];
type ProjectZoneProductUpdate = Database["public"]["Tables"]["project_zone_products"]["Update"];
type AnnotationRow = Database["public"]["Tables"]["project_annotations"]["Row"];
type MaterialBoardRow = Database["public"]["Tables"]["material_boards"]["Row"];
type MaterialBoardUpdate = Database["public"]["Tables"]["material_boards"]["Update"];
type BoardItemRow = Database["public"]["Tables"]["board_items"]["Row"];
type ProjectTemplateRow = Database["public"]["Tables"]["project_templates"]["Row"];

// ── Exported Types ──────────────────────────────────────────────────────────────

export type AnnotationAuthorType = "architect" | "admin" | "client";

/** Legacy-compatible annotation shape used by ProjectAnnotations component */
export interface ProjectAnnotation {
  id: string;
  projectId: string;
  zoneId: string | null;
  zoneName: string | null;
  text: string;
  authorId: string;
  authorName: string;
  authorType: AnnotationAuthorType;
  pinned: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface NewAnnotation {
  text: string;
  zoneId: string | null;
  zoneName: string | null;
}

export interface ZoneWithProducts extends ProjectZoneRow {
  products: (ProjectZoneProductRow & { product?: any })[];
}

export interface ProjectStats {
  total: number;
  draft: number;
  quoting: number;
  inProgress: number;
  delivered: number;
  totalValue: number;
}

export interface MaterialBoardProduct {
  id: string;
  product: any;
  note: string;
  position: number;
}

export interface MaterialBoard {
  id: string;
  name: string;
  description: string;
  projectName: string | null;
  products: MaterialBoardProduct[];
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Convert a DB annotation row into the legacy ProjectAnnotation shape */
function toProjectAnnotation(row: AnnotationRow): ProjectAnnotation {
  return {
    id: row.id,
    projectId: row.project_id,
    zoneId: row.zone_id,
    zoneName: row.zone_id,
    text: row.content,
    authorId: row.author_id,
    authorName: row.author_name || "Unknown",
    authorType: (row.author_type as AnnotationAuthorType) || "architect",
    pinned: row.is_pinned ?? false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. useArchitectProjects
// ═══════════════════════════════════════════════════════════════════════════════

export function useArchitectProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["architect-projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("architect_projects")
        .select("*")
        .eq("architect_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch architect projects:", error.message);
        return [];
      }
      return data as ArchitectProjectRow[];
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (input: Omit<ArchitectProjectInsert, "architect_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("architect_projects")
        .insert({ ...input, architect_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ArchitectProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architect-projects", user?.id] });
    },
    onError: (err: any) => {
      console.error("Failed to create architect project:", err);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ArchitectProjectUpdate) => {
      const { data, error } = await supabase
        .from("architect_projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ArchitectProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architect-projects", user?.id] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("architect_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architect-projects", user?.id] });
    },
  });

  const duplicateProject = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: original, error: fetchErr } = await supabase
        .from("architect_projects")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error("Project not found");

      const { id: _id, created_at, updated_at, ...projectData } = original;
      const { data: newProject, error: insertErr } = await supabase
        .from("architect_projects")
        .insert({ ...projectData, project_name: `Copy of ${original.project_name}` })
        .select()
        .single();
      if (insertErr || !newProject) throw insertErr || new Error("Failed to duplicate project");

      const { data: zones } = await supabase
        .from("project_zones")
        .select("*")
        .eq("project_id", id);

      if (zones && zones.length > 0) {
        const zoneIdMap: Record<string, string> = {};

        for (const zone of zones) {
          const { id: zoneId, created_at: _zca, ...zoneData } = zone;
          const { data: newZone, error: zoneErr } = await supabase
            .from("project_zones")
            .insert({ ...zoneData, project_id: newProject.id })
            .select()
            .single();
          if (zoneErr || !newZone) throw zoneErr || new Error("Failed to duplicate zone");
          zoneIdMap[zoneId] = newZone.id;
        }

        const { data: products } = await supabase
          .from("project_zone_products")
          .select("*")
          .eq("project_id", id);

        if (products && products.length > 0) {
          const newProducts = products.map((p) => {
            const { id: _pid, created_at: _pca, ...pData } = p;
            return {
              ...pData,
              project_id: newProject.id,
              zone_id: zoneIdMap[p.zone_id] || p.zone_id,
            };
          });
          const { error: prodErr } = await supabase
            .from("project_zone_products")
            .insert(newProducts);
          if (prodErr) throw prodErr;
        }
      }

      return newProject as ArchitectProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architect-projects", user?.id] });
    },
  });

  const stats: ProjectStats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === "draft").length,
    quoting: projects.filter((p) => p.status === "quoting").length,
    inProgress: projects.filter((p) => p.status === "in_progress").length,
    delivered: projects.filter((p) => p.status === "delivered").length,
    totalValue: projects.reduce((sum, p) => sum + Number(p.estimated_value || 0), 0),
  };

  return {
    projects,
    isLoading,
    createProject: createProject.mutateAsync,
    updateProject: updateProject.mutateAsync,
    deleteProject: deleteProject.mutateAsync,
    duplicateProject: duplicateProject.mutateAsync,
    stats,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. useProjectZones
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectZones(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["project-zones", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data: zoneRows, error: zoneErr } = await supabase
        .from("project_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (zoneErr) {
        console.error("Failed to fetch zones:", zoneErr.message);
        return [];
      }

      const { data: productRows, error: prodErr } = await supabase
        .from("project_zone_products")
        .select("*, product:product_id(id, name, image, category, subcategory, price)")
        .eq("project_id", projectId);
      if (prodErr) console.error("Failed to fetch zone products:", prodErr.message);

      const productsByZone: Record<string, (ProjectZoneProductRow & { product?: any })[]> = {};
      (productRows || []).forEach((p: any) => {
        if (!productsByZone[p.zone_id]) productsByZone[p.zone_id] = [];
        productsByZone[p.zone_id].push(p);
      });

      return (zoneRows || []).map((z) => ({
        ...z,
        products: productsByZone[z.id] || [],
      })) as ZoneWithProducts[];
    },
    enabled: !!projectId,
  });

  const addZone = useMutation({
    mutationFn: async (input: { name: string; area?: string; description?: string }) => {
      if (!projectId) throw new Error("No project ID");
      const { data, error } = await supabase
        .from("project_zones")
        .insert({
          project_id: projectId,
          zone_name: input.name,
          zone_area: input.area || null,
          description: input.description || null,
          sort_order: zones.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectZoneRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({ zoneId, ...updates }: { zoneId: string } & ProjectZoneUpdate) => {
      const { data, error } = await supabase
        .from("project_zones")
        .update(updates)
        .eq("id", zoneId)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectZoneRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (zoneId: string) => {
      await supabase.from("project_zone_products").delete().eq("zone_id", zoneId);
      const { error } = await supabase.from("project_zones").delete().eq("id", zoneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  const addProductToZone = useMutation({
    mutationFn: async (input: {
      zoneId: string;
      productId: string;
      quantity: number;
      supplierData?: { supplier_id?: string; supplier_name?: string; unit_price?: number };
    }) => {
      if (!projectId) throw new Error("No project ID");
      const { data, error } = await supabase
        .from("project_zone_products")
        .insert({
          project_id: projectId,
          zone_id: input.zoneId,
          product_id: input.productId,
          quantity: input.quantity,
          supplier_id: input.supplierData?.supplier_id || null,
          supplier_name: input.supplierData?.supplier_name || null,
          unit_price: input.supplierData?.unit_price || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectZoneProductRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  const updateZoneProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ProjectZoneProductUpdate) => {
      const { data, error } = await supabase
        .from("project_zone_products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectZoneProductRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  const removeProductFromZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_zone_products")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-zones", projectId] });
    },
  });

  return {
    zones,
    isLoading,
    addZone: addZone.mutateAsync,
    updateZone: updateZone.mutateAsync,
    deleteZone: deleteZone.mutateAsync,
    addProductToZone: addProductToZone.mutateAsync,
    updateZoneProduct: updateZoneProduct.mutateAsync,
    removeProductFromZone: removeProductFromZone.mutateAsync,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. useProjectAnnotations
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectAnnotations(projectId: string | undefined) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: annotations = [], isLoading } = useQuery({
    queryKey: ["project-annotations", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_annotations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch annotations:", error.message);
        return [];
      }
      return (data || []).map(toProjectAnnotation);
    },
    enabled: !!projectId,
  });

  const addAnnotation = useMutation({
    mutationFn: async (input: NewAnnotation | { content: string; zoneId?: string }) => {
      if (!user || !projectId) throw new Error("Not authenticated or no project");
      const authorName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.email ||
        "Unknown";
      const content = "text" in input ? input.text : input.content;
      const zoneId = "text" in input ? input.zoneId : (input.zoneId || null);
      const { data, error } = await supabase
        .from("project_annotations")
        .insert({
          project_id: projectId,
          author_id: user.id,
          author_name: authorName,
          author_type: profile?.user_type || null,
          content,
          zone_id: zoneId,
        })
        .select()
        .single();
      if (error) throw error;
      return toProjectAnnotation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-annotations", projectId] });
    },
  });

  const updateAnnotation = useMutation({
    mutationFn: async (input: { id: string; content: string }) => {
      const { id, content } = input;
      const { data, error } = await supabase
        .from("project_annotations")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return toProjectAnnotation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-annotations", projectId] });
    },
  });

  const deleteAnnotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_annotations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-annotations", projectId] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async (id: string) => {
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) throw new Error("Annotation not found");
      const { data, error } = await supabase
        .from("project_annotations")
        .update({ is_pinned: !annotation.pinned })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return toProjectAnnotation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-annotations", projectId] });
    },
  });

  // Group by zone_id (null key = project-level)
  const annotationsByZone: Record<string, ProjectAnnotation[]> = {};
  annotations.forEach((a) => {
    const key = a.zoneId || "__project__";
    if (!annotationsByZone[key]) annotationsByZone[key] = [];
    annotationsByZone[key].push(a);
  });

  const currentUserId = user?.id || "";

  // Derive unique zones from annotations for backward compat
  const zonesFromAnnotations = (() => {
    const map = new Map<string, string>();
    for (const a of annotations) {
      if (a.zoneId && a.zoneName) map.set(a.zoneId, a.zoneName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  })();

  return {
    annotations,
    isLoading,
    currentUserId,
    zones: zonesFromAnnotations,
    addAnnotation: addAnnotation.mutateAsync,
    updateAnnotation: ((idOrObj: string | { id: string; content: string }, content?: string) => {
      if (typeof idOrObj === "string") {
        return updateAnnotation.mutateAsync({ id: idOrObj, content: content! });
      }
      return updateAnnotation.mutateAsync(idOrObj);
    }) as (id: string, content: string) => Promise<ProjectAnnotation>,
    deleteAnnotation: deleteAnnotation.mutateAsync,
    togglePin: togglePin.mutateAsync,
    annotationsByZone,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. useMaterialBoards
// ═══════════════════════════════════════════════════════════════════════════════

export function useMaterialBoards(projectId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["material-boards", user?.id, projectId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("material_boards")
        .select("*, items:board_items(*, product:product_id(*))")
        .eq("architect_id", user.id)
        .order("updated_at", { ascending: false });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Failed to fetch material boards:", error.message);
        return [];
      }
      return data as (MaterialBoardRow & { items: BoardItemRow[] })[];
    },
    enabled: !!user,
  });

  const invalidateBoards = () => {
    queryClient.invalidateQueries({ queryKey: ["material-boards", user?.id] });
  };

  const createBoard = useMutation({
    mutationFn: async (input: { name: string; projectId?: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("material_boards")
        .insert({
          architect_id: user.id,
          board_name: input.name,
          project_id: input.projectId || null,
          description: input.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MaterialBoardRow;
    },
    onSuccess: invalidateBoards,
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & MaterialBoardUpdate) => {
      const { data, error } = await supabase
        .from("material_boards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MaterialBoardRow;
    },
    onSuccess: invalidateBoards,
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("board_items").delete().eq("board_id", id);
      const { error } = await supabase.from("material_boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateBoards,
  });

  const duplicateBoard = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: original, error: fetchErr } = await supabase
        .from("material_boards")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error("Board not found");

      const { id: _id, created_at, updated_at, share_token, ...boardData } = original;
      const { data: newBoard, error: insertErr } = await supabase
        .from("material_boards")
        .insert({ ...boardData, board_name: `Copy of ${original.board_name}` })
        .select()
        .single();
      if (insertErr || !newBoard) throw insertErr || new Error("Failed to duplicate board");

      const { data: items } = await supabase
        .from("board_items")
        .select("*")
        .eq("board_id", id);

      if (items && items.length > 0) {
        const newItems = items.map((item) => {
          const { id: _itemId, created_at: _ica, ...itemData } = item;
          return { ...itemData, board_id: newBoard.id };
        });
        const { error: itemErr } = await supabase.from("board_items").insert(newItems);
        if (itemErr) throw itemErr;
      }

      return newBoard as MaterialBoardRow;
    },
    onSuccess: invalidateBoards,
  });

  const addItem = useMutation({
    mutationFn: async (input: { boardId: string; productId: string; note?: string }) => {
      const { data, error } = await supabase
        .from("board_items")
        .insert({
          board_id: input.boardId,
          product_id: input.productId,
          note: input.note || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BoardItemRow;
    },
    onSuccess: invalidateBoards,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("board_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidateBoards,
  });

  const updateItemNote = useMutation({
    mutationFn: async ({ itemId, note }: { itemId: string; note: string }) => {
      const { data, error } = await supabase
        .from("board_items")
        .update({ note })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data as BoardItemRow;
    },
    onSuccess: invalidateBoards,
  });

  const reorderItems = useMutation({
    mutationFn: async ({ boardId: _boardId, itemIds }: { boardId: string; itemIds: string[] }) => {
      const updates = itemIds.map((id, index) =>
        supabase.from("board_items").update({ sort_order: index }).eq("id", id),
      );
      await Promise.all(updates);
    },
    onSuccess: invalidateBoards,
  });

  const generateShareLink = useMutation({
    mutationFn: async (boardId: string) => {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from("material_boards")
        .update({ share_token: token })
        .eq("id", boardId);
      if (error) throw error;
      return `${window.location.origin}/boards/shared/${token}`;
    },
    onSuccess: invalidateBoards,
  });

  return {
    boards,
    isLoading,
    createBoard: createBoard.mutateAsync,
    updateBoard: updateBoard.mutateAsync,
    deleteBoard: deleteBoard.mutateAsync,
    duplicateBoard: duplicateBoard.mutateAsync,
    addItem: addItem.mutateAsync,
    removeItem: removeItem.mutateAsync,
    updateItemNote: updateItemNote.mutateAsync,
    reorderItems: reorderItems.mutateAsync,
    generateShareLink: generateShareLink.mutateAsync,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. useProjectTemplates
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["project-templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .or(`architect_id.eq.${user.id},is_public.eq.true`)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch templates:", error.message);
        return [];
      }
      return data as ProjectTemplateRow[];
    },
    enabled: !!user,
  });

  const saveAsTemplate = useMutation({
    mutationFn: async ({ projectId, templateName }: { projectId: string; templateName: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: project, error: projErr } = await supabase
        .from("architect_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (projErr || !project) throw projErr || new Error("Project not found");

      const { data: zones } = await supabase
        .from("project_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      const { data: products } = await supabase
        .from("project_zone_products")
        .select("*")
        .eq("project_id", projectId);

      const zoneConfig = (zones || []).map((z) => ({
        zone_name: z.zone_name,
        zone_area: z.zone_area,
        description: z.description,
        sort_order: z.sort_order,
      }));

      const productConfig = (products || []).map((p) => ({
        product_id: p.product_id,
        zone_name: (zones || []).find((z) => z.id === p.zone_id)?.zone_name || null,
        quantity: p.quantity,
        unit_price: p.unit_price,
      }));

      const { data, error } = await supabase
        .from("project_templates")
        .insert({
          architect_id: user.id,
          template_name: templateName,
          venue_type: project.venue_type,
          style: project.style,
          description: project.description,
          zone_config: zoneConfig as any,
          product_config: productConfig as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTemplateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates", user?.id] });
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: async ({ templateId, projectName }: { templateId: string; projectName: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: template, error: tplErr } = await supabase
        .from("project_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (tplErr || !template) throw tplErr || new Error("Template not found");

      await supabase
        .from("project_templates")
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq("id", templateId);

      const { data: newProject, error: projErr } = await supabase
        .from("architect_projects")
        .insert({
          architect_id: user.id,
          project_name: projectName,
          venue_type: template.venue_type,
          style: template.style,
          description: template.description,
        })
        .select()
        .single();
      if (projErr || !newProject) throw projErr || new Error("Failed to create project");

      const zoneConfig = (template.zone_config as any[]) || [];
      const zoneNameToId: Record<string, string> = {};

      for (const zc of zoneConfig) {
        const { data: newZone, error: zoneErr } = await supabase
          .from("project_zones")
          .insert({
            project_id: newProject.id,
            zone_name: zc.zone_name,
            zone_area: zc.zone_area || null,
            description: zc.description || null,
            sort_order: zc.sort_order || 0,
          })
          .select()
          .single();
        if (zoneErr || !newZone) throw zoneErr || new Error("Failed to create zone from template");
        zoneNameToId[zc.zone_name] = newZone.id;
      }

      const productConfig = (template.product_config as any[]) || [];
      if (productConfig.length > 0) {
        const productInserts = productConfig
          .filter((pc: any) => pc.zone_name && zoneNameToId[pc.zone_name])
          .map((pc: any) => ({
            project_id: newProject.id,
            zone_id: zoneNameToId[pc.zone_name],
            product_id: pc.product_id,
            quantity: pc.quantity || 1,
            unit_price: pc.unit_price || null,
          }));
        if (productInserts.length > 0) {
          const { error: prodErr } = await supabase
            .from("project_zone_products")
            .insert(productInserts);
          if (prodErr) throw prodErr;
        }
      }

      return newProject as ArchitectProjectRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architect-projects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["project-templates", user?.id] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates", user?.id] });
    },
  });

  return {
    templates,
    isLoading,
    saveAsTemplate: saveAsTemplate.mutateAsync,
    createFromTemplate: createFromTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
  };
}
