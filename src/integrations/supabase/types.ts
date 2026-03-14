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
      partner_applications: {
        Row: {
          certifications: string | null
          company_name: string
          contact_email: string
          contact_name: string | null
          country: string
          created_at: string
          id: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          product_category: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          certifications?: string | null
          company_name: string
          contact_email: string
          contact_name?: string | null
          country: string
          created_at?: string
          id?: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          product_category?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          certifications?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          id?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          product_category?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      partner_contact_requests: {
        Row: {
          budget_range: string | null
          contact_company: string | null
          contact_country: string | null
          contact_name: string
          created_at: string
          estimated_quantity: string | null
          id: string
          message: string | null
          partner_id: string
          project_date: string | null
          project_type: string | null
        }
        Insert: {
          budget_range?: string | null
          contact_company?: string | null
          contact_country?: string | null
          contact_name: string
          created_at?: string
          estimated_quantity?: string | null
          id?: string
          message?: string | null
          partner_id: string
          project_date?: string | null
          project_type?: string | null
        }
        Update: {
          budget_range?: string | null
          contact_company?: string | null
          contact_country?: string | null
          contact_name?: string
          created_at?: string
          estimated_quantity?: string | null
          id?: string
          message?: string | null
          partner_id?: string
          project_date?: string | null
          project_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_contact_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          certifications: string[] | null
          city: string | null
          country: string | null
          coverage_zone: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          logo_url: string | null
          materials: string[] | null
          name: string
          partner_subtype: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          priority_order: number | null
          production_capacity: string | null
          project_types: string[] | null
          slug: string
          specialties: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          coverage_zone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          materials?: string[] | null
          name: string
          partner_subtype?: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          priority_order?: number | null
          production_capacity?: string | null
          project_types?: string[] | null
          slug: string
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          coverage_zone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          materials?: string[] | null
          name?: string
          partner_subtype?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"]
          priority_order?: number | null
          production_capacity?: string | null
          project_types?: string[] | null
          slug?: string
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      product_offers: {
        Row: {
          created_at: string
          currency: string | null
          delivery_delay_days: number | null
          id: string
          is_active: boolean | null
          minimum_order: number | null
          notes: string | null
          partner_id: string
          price: number | null
          product_id: string
          purchase_type: string | null
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_id: string
          price?: number | null
          product_id: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_id?: string
          price?: number | null
          product_id?: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ambience_tags: string[] | null
          availability_type: string | null
          available_colors: string[] | null
          brand_source: string | null
          category: string
          collection: string | null
          country_of_manufacture: string | null
          created_at: string
          customizable: boolean | null
          dimensions_height_cm: number | null
          dimensions_length_cm: number | null
          dimensions_width_cm: number | null
          dismountable: boolean | null
          documents: Json | null
          easy_maintenance: boolean | null
          estimated_delivery_days: number | null
          fire_retardant: boolean | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          indicative_price: string | null
          is_chr_heavy_use: boolean | null
          is_outdoor: boolean | null
          is_stackable: boolean | null
          lightweight: boolean | null
          long_description: string | null
          main_color: string | null
          maintenance_info: string | null
          material_seat: string | null
          material_structure: string | null
          material_tags: string[] | null
          name: string
          palette_tags: string[] | null
          popularity_score: number | null
          price_max: number | null
          price_min: number | null
          priority_score: number | null
          product_family: string | null
          requires_assembly: boolean | null
          seat_height_cm: number | null
          secondary_color: string | null
          short_description: string | null
          stock_quantity: number | null
          stock_status: string | null
          style_tags: string[] | null
          subcategory: string | null
          supplier_internal: string | null
          technical_tags: string[] | null
          updated_at: string
          use_case_tags: string[] | null
          uv_resistant: boolean | null
          warranty: string | null
          weather_resistant: boolean | null
          weight_kg: number | null
        }
        Insert: {
          ambience_tags?: string[] | null
          availability_type?: string | null
          available_colors?: string[] | null
          brand_source?: string | null
          category: string
          collection?: string | null
          country_of_manufacture?: string | null
          created_at?: string
          customizable?: boolean | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          easy_maintenance?: boolean | null
          estimated_delivery_days?: number | null
          fire_retardant?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          lightweight?: boolean | null
          long_description?: string | null
          main_color?: string | null
          maintenance_info?: string | null
          material_seat?: string | null
          material_structure?: string | null
          material_tags?: string[] | null
          name: string
          palette_tags?: string[] | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          priority_score?: number | null
          product_family?: string | null
          requires_assembly?: boolean | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          technical_tags?: string[] | null
          updated_at?: string
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          ambience_tags?: string[] | null
          availability_type?: string | null
          available_colors?: string[] | null
          brand_source?: string | null
          category?: string
          collection?: string | null
          country_of_manufacture?: string | null
          created_at?: string
          customizable?: boolean | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          easy_maintenance?: boolean | null
          estimated_delivery_days?: number | null
          fire_retardant?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          lightweight?: boolean | null
          long_description?: string | null
          main_color?: string | null
          maintenance_info?: string | null
          material_seat?: string | null
          material_structure?: string | null
          material_tags?: string[] | null
          name?: string
          palette_tags?: string[] | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          priority_score?: number | null
          product_family?: string | null
          requires_assembly?: boolean | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          technical_tags?: string[] | null
          updated_at?: string
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
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
      partner_type: "brand" | "manufacturer" | "reseller" | "designer"
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
    Enums: {
      partner_type: ["brand", "manufacturer", "reseller", "designer"],
    },
  },
} as const
