export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      products: {
        Row: {
          ambience_tags: string[] | null
          availability_type: string | null
          brand_source: string | null
          category: string
          created_at: string
          id: string
          image_url: string | null
          indicative_price: string | null
          is_chr_heavy_use: boolean | null
          is_outdoor: boolean | null
          is_stackable: boolean | null
          main_color: string | null
          material_tags: string[] | null
          name: string
          palette_tags: string[] | null
          popularity_score: number | null
          priority_score: number | null
          product_family: string | null
          secondary_color: string | null
          short_description: string | null
          style_tags: string[] | null
          subcategory: string | null
          supplier_internal: string | null
          technical_tags: string[] | null
          updated_at: string
          use_case_tags: string[] | null
        }
        Insert: {
          ambience_tags?: string[] | null
          availability_type?: string | null
          brand_source?: string | null
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          main_color?: string | null
          material_tags?: string[] | null
          name: string
          palette_tags?: string[] | null
          popularity_score?: number | null
          priority_score?: number | null
          product_family?: string | null
          secondary_color?: string | null
          short_description?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          technical_tags?: string[] | null
          updated_at?: string
          use_case_tags?: string[] | null
        }
        Update: {
          ambience_tags?: string[] | null
          availability_type?: string | null
          brand_source?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          main_color?: string | null
          material_tags?: string[] | null
          name?: string
          palette_tags?: string[] | null
          popularity_score?: number | null
          priority_score?: number | null
          product_family?: string | null
          secondary_color?: string | null
          short_description?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          technical_tags?: string[] | null
          updated_at?: string
          use_case_tags?: string[] | null
        }
        Relationships: []
      }
      project_cart_items: {
        Row: {
          concept_name: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          project_request_id: string | null
          quantity: number
        }
        Insert: {
          concept_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          project_request_id?: string | null
          quantity?: number
        }
        Update: {
          concept_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          project_request_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cart_items_project_request_id_fkey"
            columns: ["project_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          budget_range: string | null
          city: string | null
          contact_company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          desired_ambience: string | null
          desired_palette: string | null
          desired_style: string | null
          detected_attributes: Json | null
          establishment_type: string | null
          free_text_request: string | null
          id: string
          project_name: string | null
          project_zone: string | null
          seating_capacity: number | null
          timeline: string | null
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          city?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          desired_ambience?: string | null
          desired_palette?: string | null
          desired_style?: string | null
          detected_attributes?: Json | null
          establishment_type?: string | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          project_zone?: string | null
          seating_capacity?: number | null
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          city?: string | null
          contact_company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          desired_ambience?: string | null
          desired_palette?: string | null
          desired_style?: string | null
          detected_attributes?: Json | null
          establishment_type?: string | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          project_zone?: string | null
          seating_capacity?: number | null
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
