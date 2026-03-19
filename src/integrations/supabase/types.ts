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
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          last_message_at: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          company_name: string
          contact_name: string
          country: string
          created_at: string | null
          delivery_countries: string[] | null
          email: string
          estimated_annual_volume: string | null
          id: string
          message: string | null
          partner_type: string | null
          phone: string | null
          product_categories: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          country: string
          created_at?: string | null
          delivery_countries?: string[] | null
          email: string
          estimated_annual_volume?: string | null
          id?: string
          message?: string | null
          partner_type?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          country?: string
          created_at?: string | null
          delivery_countries?: string[] | null
          email?: string
          estimated_annual_volume?: string | null
          id?: string
          message?: string | null
          partner_type?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          commission_amount: number | null
          commission_rate: number
          created_at: string | null
          id: string
          order_amount: number
          paid_at: string | null
          partner_id: string | null
          product_name: string | null
          quote_request_id: string | null
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate: number
          created_at?: string | null
          id?: string
          order_amount: number
          paid_at?: string | null
          partner_id?: string | null
          product_name?: string | null
          quote_request_id?: string | null
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string | null
          id?: string
          order_amount?: number
          paid_at?: string | null
          partner_id?: string | null
          product_name?: string | null
          quote_request_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_subscriptions: {
        Row: {
          billing_starts_at: string | null
          commission_rate: number | null
          confirmed_orders_count: number | null
          created_at: string | null
          id: string
          max_products: number | null
          partner_id: string | null
          plan: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_starts_at?: string | null
          commission_rate?: number | null
          confirmed_orders_count?: number | null
          created_at?: string | null
          id?: string
          max_products?: number | null
          partner_id?: string | null
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_starts_at?: string | null
          commission_rate?: number | null
          confirmed_orders_count?: number | null
          created_at?: string | null
          id?: string
          max_products?: number | null
          partner_id?: string | null
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          city: string | null
          country: string | null
          cover_photo_url: string | null
          created_at: string | null
          delivery_countries: string[] | null
          description: string | null
          founded_year: number | null
          gallery_urls: string[] | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          logo_url: string | null
          name: string
          partner_type: string | null
          plan: string | null
          priority_order: number | null
          product_categories: string[] | null
          slug: string
          specialty_tags: string[] | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          delivery_countries?: string[] | null
          description?: string | null
          founded_year?: number | null
          gallery_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          partner_type?: string | null
          plan?: string | null
          priority_order?: number | null
          product_categories?: string[] | null
          slug: string
          specialty_tags?: string[] | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          delivery_countries?: string[] | null
          description?: string | null
          founded_year?: number | null
          gallery_urls?: string[] | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          partner_type?: string | null
          plan?: string | null
          priority_order?: number | null
          product_categories?: string[] | null
          slug?: string
          specialty_tags?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      product_archetypes: {
        Row: {
          canonical_ambience_tags: string[] | null
          canonical_frame_material: string | null
          canonical_parasol_type: string | null
          canonical_seat_type: string | null
          canonical_silhouette: string | null
          canonical_style_tags: string[] | null
          canonical_top_material: string | null
          canonical_use_case_tags: string[] | null
          category: string
          compatible_base_slugs: string[] | null
          compatible_table_formats: string[] | null
          compatible_top_slugs: string[] | null
          covers_seats_default: number | null
          created_at: string | null
          diameter_m: number | null
          id: string
          label: string
          product_family: string | null
          seat_height_max_cm: number | null
          seat_height_min_cm: number | null
          slug: string
          stack_max_default: number | null
          subcategory: string | null
          wind_beaufort_min: number | null
        }
        Insert: {
          canonical_ambience_tags?: string[] | null
          canonical_frame_material?: string | null
          canonical_parasol_type?: string | null
          canonical_seat_type?: string | null
          canonical_silhouette?: string | null
          canonical_style_tags?: string[] | null
          canonical_top_material?: string | null
          canonical_use_case_tags?: string[] | null
          category: string
          compatible_base_slugs?: string[] | null
          compatible_table_formats?: string[] | null
          compatible_top_slugs?: string[] | null
          covers_seats_default?: number | null
          created_at?: string | null
          diameter_m?: number | null
          id?: string
          label: string
          product_family?: string | null
          seat_height_max_cm?: number | null
          seat_height_min_cm?: number | null
          slug: string
          stack_max_default?: number | null
          subcategory?: string | null
          wind_beaufort_min?: number | null
        }
        Update: {
          canonical_ambience_tags?: string[] | null
          canonical_frame_material?: string | null
          canonical_parasol_type?: string | null
          canonical_seat_type?: string | null
          canonical_silhouette?: string | null
          canonical_style_tags?: string[] | null
          canonical_top_material?: string | null
          canonical_use_case_tags?: string[] | null
          category?: string
          compatible_base_slugs?: string[] | null
          compatible_table_formats?: string[] | null
          compatible_top_slugs?: string[] | null
          covers_seats_default?: number | null
          created_at?: string | null
          diameter_m?: number | null
          id?: string
          label?: string
          product_family?: string | null
          seat_height_max_cm?: number | null
          seat_height_min_cm?: number | null
          slug?: string
          stack_max_default?: number | null
          subcategory?: string | null
          wind_beaufort_min?: number | null
        }
        Relationships: []
      }
      product_offers: {
        Row: {
          created_at: string | null
          currency: string | null
          delivery_delay_days: number | null
          id: string
          is_active: boolean | null
          minimum_order: number | null
          notes: string | null
          partner_color_name: string | null
          partner_id: string
          partner_ref: string | null
          price: number | null
          product_id: string
          purchase_type: string | null
          stock_quantity: number | null
          stock_status: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_color_name?: string | null
          partner_id: string
          partner_ref?: string | null
          price?: number | null
          product_id: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_color_name?: string | null
          partner_id?: string
          partner_ref?: string | null
          price?: number | null
          product_id?: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
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
          archetype_confidence: number | null
          archetype_id: string | null
          availability_type: string | null
          available_colors: string[] | null
          brand_source: string | null
          category: string
          collection: string | null
          color_variants: Json | null
          combinable: boolean | null
          combined_capacity_if_joined: number | null
          country_of_manufacture: string | null
          created_at: string | null
          customizable: boolean | null
          data_quality_score: number | null
          default_seating_capacity: number | null
          dimensions_height_cm: number | null
          dimensions_length_cm: number | null
          dimensions_width_cm: number | null
          dismountable: boolean | null
          documents: Json | null
          duplicate_of: string | null
          easy_maintenance: boolean | null
          estimated_delivery_days: number | null
          fire_retardant: boolean | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          indicative_price: string | null
          is_canonical_instance: boolean | null
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
          partner_id: string | null
          popularity_score: number | null
          price_max: number | null
          price_min: number | null
          priority_score: number | null
          product_family: string | null
          product_type_tags: Json | null
          publish_status: string | null
          recommended_seating_max: number | null
          recommended_seating_min: number | null
          requires_assembly: boolean | null
          seat_height_cm: number | null
          secondary_color: string | null
          short_description: string | null
          stock_quantity: number | null
          stock_status: string | null
          style_tags: string[] | null
          subcategory: string | null
          supplier_internal: string | null
          table_shape: string | null
          technical_tags: string[] | null
          updated_at: string | null
          use_case_tags: string[] | null
          uv_resistant: boolean | null
          warranty: string | null
          weather_resistant: boolean | null
          weight_kg: number | null
        }
        Insert: {
          ambience_tags?: string[] | null
          archetype_confidence?: number | null
          archetype_id?: string | null
          availability_type?: string | null
          available_colors?: string[] | null
          brand_source?: string | null
          category: string
          collection?: string | null
          color_variants?: Json | null
          combinable?: boolean | null
          combined_capacity_if_joined?: number | null
          country_of_manufacture?: string | null
          created_at?: string | null
          customizable?: boolean | null
          data_quality_score?: number | null
          default_seating_capacity?: number | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          duplicate_of?: string | null
          easy_maintenance?: boolean | null
          estimated_delivery_days?: number | null
          fire_retardant?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_canonical_instance?: boolean | null
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
          partner_id?: string | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          priority_score?: number | null
          product_family?: string | null
          product_type_tags?: Json | null
          publish_status?: string | null
          recommended_seating_max?: number | null
          recommended_seating_min?: number | null
          requires_assembly?: boolean | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          table_shape?: string | null
          technical_tags?: string[] | null
          updated_at?: string | null
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          ambience_tags?: string[] | null
          archetype_confidence?: number | null
          archetype_id?: string | null
          availability_type?: string | null
          available_colors?: string[] | null
          brand_source?: string | null
          category?: string
          collection?: string | null
          color_variants?: Json | null
          combinable?: boolean | null
          combined_capacity_if_joined?: number | null
          country_of_manufacture?: string | null
          created_at?: string | null
          customizable?: boolean | null
          data_quality_score?: number | null
          default_seating_capacity?: number | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          duplicate_of?: string | null
          easy_maintenance?: boolean | null
          estimated_delivery_days?: number | null
          fire_retardant?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_canonical_instance?: boolean | null
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
          partner_id?: string | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          priority_score?: number | null
          product_family?: string | null
          product_type_tags?: Json | null
          publish_status?: string | null
          recommended_seating_max?: number | null
          recommended_seating_min?: number | null
          requires_assembly?: boolean | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          supplier_internal?: string | null
          table_shape?: string | null
          technical_tags?: string[] | null
          updated_at?: string | null
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "product_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cart_items: {
        Row: {
          concept_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          project_request_id: string | null
          quantity: number
        }
        Insert: {
          concept_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          project_request_id?: string | null
          quantity?: number
        }
        Update: {
          concept_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          project_request_id?: string | null
          quantity?: number
        }
        Relationships: [
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
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          detected_attributes: Json | null
          free_text_request: string | null
          id: string
          project_name: string | null
          status: string | null
          timeline: string | null
        }
        Insert: {
          budget_range?: string | null
          city?: string | null
          contact_company?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          detected_attributes?: Json | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          status?: string | null
          timeline?: string | null
        }
        Update: {
          budget_range?: string | null
          city?: string | null
          contact_company?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          detected_attributes?: Json | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          status?: string | null
          timeline?: string | null
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          first_name: string
          fit_status: string | null
          id: string
          last_name: string | null
          message: string | null
          offer_id: string | null
          partner_id: string | null
          partner_name: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          siren: string | null
          status: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          first_name: string
          fit_status?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          offer_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          siren?: string | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          fit_status?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          offer_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          siren?: string | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      tag_definitions: {
        Row: {
          applies_to: string[] | null
          id: string
          label_de: string | null
          label_en: string
          label_es: string | null
          label_fr: string | null
          label_it: string | null
          label_nl: string | null
          notes: string | null
          slug: string
          tag_type: string
        }
        Insert: {
          applies_to?: string[] | null
          id?: string
          label_de?: string | null
          label_en: string
          label_es?: string | null
          label_fr?: string | null
          label_it?: string | null
          label_nl?: string | null
          notes?: string | null
          slug: string
          tag_type: string
        }
        Update: {
          applies_to?: string[] | null
          id?: string
          label_de?: string | null
          label_en?: string
          label_es?: string | null
          label_fr?: string | null
          label_it?: string | null
          label_nl?: string | null
          notes?: string | null
          slug?: string
          tag_type?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          siren: string | null
          user_type: string
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          siren?: string | null
          user_type?: string
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          siren?: string | null
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fuzzy_search_products: {
        Args: {
          category_filter?: string
          lang?: string
          limit_count?: number
          search_query: string
        }
        Returns: {
          category: string
          id: string
          image_urls: string[]
          main_color: string
          name: string
          price_indicator: string
          publish_status: string
          relevance_score: number
        }[]
      }
      search_products_multilang: {
        Args: {
          category_filter?: string
          lang?: string
          limit_count?: number
          search_query: string
        }
        Returns: {
          category: string
          id: string
          image_urls: string[]
          main_color: string
          name: string
          price_indicator: string
          publish_status: string
          relevance_score: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
