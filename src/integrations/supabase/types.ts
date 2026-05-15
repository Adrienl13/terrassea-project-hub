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
      architect_projects: {
        Row: {
          address: string | null
          architect_id: string
          client_company: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          constraints: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          estimated_value: number | null
          id: string
          project_name: string
          start_date: string | null
          status: string | null
          style: string | null
          surface_area: string | null
          updated_at: string | null
          venue_type: string | null
        }
        Insert: {
          address?: string | null
          architect_id: string
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          constraints?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          project_name: string
          start_date?: string | null
          status?: string | null
          style?: string | null
          surface_area?: string | null
          updated_at?: string | null
          venue_type?: string | null
        }
        Update: {
          address?: string | null
          architect_id?: string
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          constraints?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          project_name?: string
          start_date?: string | null
          status?: string | null
          style?: string | null
          surface_area?: string | null
          updated_at?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      architect_prospects: {
        Row: {
          analyst_profile: Json | null
          analyst_score: number | null
          city: string | null
          company_id: string
          company_name: string
          competitive_intel: string | null
          contacts: Json
          conversion_date: string | null
          conversion_type: string | null
          converted: boolean | null
          country: string | null
          created_at: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          digital_maturity: string | null
          emails_sent: number | null
          first_contact_date: string | null
          furniture_brands: string[] | null
          generic_email: string | null
          has_replied: boolean | null
          hooks_reserved: Json | null
          id: string
          instagram: string | null
          language: string | null
          last_contact_date: string | null
          last_gmail_message_id: string | null
          last_subject_line: string | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          outdoor_status: string | null
          profile_type: string | null
          project_scale: string | null
          reply_date: string | null
          reply_from: string | null
          reply_sentiment: string | null
          reply_summary: string | null
          scout_score: number | null
          segment: string | null
          status: string | null
          total_contacts_tried: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          city?: string | null
          company_id: string
          company_name: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          digital_maturity?: string | null
          emails_sent?: number | null
          first_contact_date?: string | null
          furniture_brands?: string[] | null
          generic_email?: string | null
          has_replied?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          outdoor_status?: string | null
          profile_type?: string | null
          project_scale?: string | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          segment?: string | null
          status?: string | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          city?: string | null
          company_id?: string
          company_name?: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          digital_maturity?: string | null
          emails_sent?: number | null
          first_contact_date?: string | null
          furniture_brands?: string[] | null
          generic_email?: string | null
          has_replied?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          outdoor_status?: string | null
          profile_type?: string | null
          project_scale?: string | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          segment?: string | null
          status?: string | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      board_items: {
        Row: {
          board_id: string
          created_at: string | null
          id: string
          note: string | null
          position_x: number | null
          position_y: number | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          board_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          board_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "material_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          partner_id: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          partner_id: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          partner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_collections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "brand_collections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_distributors: {
        Row: {
          brand_id: string
          country_code: string
          created_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          is_exclusive: boolean | null
          priority: number | null
        }
        Insert: {
          brand_id: string
          country_code: string
          created_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          priority?: number | null
        }
        Update: {
          brand_id?: string
          country_code?: string
          created_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_distributors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "brand_distributors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_distributors_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "brand_distributors_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_prospects: {
        Row: {
          analyst_profile: Json | null
          analyst_score: number | null
          brand_type: string | null
          city: string | null
          company_id: string
          company_name: string
          competitive_intel: string | null
          contacts: Json
          conversion_date: string | null
          conversion_type: string | null
          converted: boolean | null
          country: string | null
          created_at: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          emails_sent: number | null
          first_contact_date: string | null
          generic_email: string | null
          has_chr_focus: boolean | null
          has_outdoor: boolean | null
          has_replied: boolean | null
          hooks_reserved: Json | null
          id: string
          instagram: string | null
          language: string | null
          last_contact_date: string | null
          last_gmail_message_id: string | null
          last_gmail_thread_id: string | null
          last_subject_line: string | null
          met_at_event: string | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          price_segment: string | null
          product_categories: string[] | null
          reply_date: string | null
          reply_from: string | null
          reply_sentiment: string | null
          reply_summary: string | null
          scout_score: number | null
          signature_materials: string[] | null
          status: string | null
          target_plan: string | null
          total_contacts_tried: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          brand_type?: string | null
          city?: string | null
          company_id: string
          company_name: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          emails_sent?: number | null
          first_contact_date?: string | null
          generic_email?: string | null
          has_chr_focus?: boolean | null
          has_outdoor?: boolean | null
          has_replied?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_gmail_thread_id?: string | null
          last_subject_line?: string | null
          met_at_event?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          price_segment?: string | null
          product_categories?: string[] | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          signature_materials?: string[] | null
          status?: string | null
          target_plan?: string | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          brand_type?: string | null
          city?: string | null
          company_id?: string
          company_name?: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          emails_sent?: number | null
          first_contact_date?: string | null
          generic_email?: string | null
          has_chr_focus?: boolean | null
          has_outdoor?: boolean | null
          has_replied?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_gmail_thread_id?: string | null
          last_subject_line?: string | null
          met_at_event?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          price_segment?: string | null
          product_categories?: string[] | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          signature_materials?: string[] | null
          status?: string | null
          target_plan?: string | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      brand_references: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          location: string | null
          partner_id: string
          photos: string[] | null
          product_ids: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          partner_id: string
          photos?: string[] | null
          product_ids?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          partner_id?: string
          photos?: string[] | null
          product_ids?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_references_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "brand_references_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_users: {
        Row: {
          brand_id: string
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          brand_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          brand_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_users_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "brand_users_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          category: string
          created_at: string
          description_i18n: Json | null
          id: string
          logo_url: string | null
          name: string
          official_website: string | null
          scope: string
          slug: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description_i18n?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          official_website?: string | null
          scope: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description_i18n?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          official_website?: string | null
          scope?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cgv_acceptances: {
        Row: {
          acceptance_type: string
          accepted_at: string
          context: string
          context_reference_id: string | null
          id: string
          ip_address: unknown
          partner_cgv_id: string | null
          partner_id: string | null
          terrassea_terms_id: string | null
          user_agent: string
          user_id: string | null
        }
        Insert: {
          acceptance_type: string
          accepted_at?: string
          context: string
          context_reference_id?: string | null
          id?: string
          ip_address: unknown
          partner_cgv_id?: string | null
          partner_id?: string | null
          terrassea_terms_id?: string | null
          user_agent: string
          user_id?: string | null
        }
        Update: {
          acceptance_type?: string
          accepted_at?: string
          context?: string
          context_reference_id?: string | null
          id?: string
          ip_address?: unknown
          partner_cgv_id?: string | null
          partner_id?: string | null
          terrassea_terms_id?: string | null
          user_agent?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cgv_acceptances_partner_cgv_id_fkey"
            columns: ["partner_cgv_id"]
            isOneToOne: false
            referencedRelation: "partner_cgv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cgv_acceptances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "cgv_acceptances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cgv_acceptances_terrassea_terms_id_fkey"
            columns: ["terrassea_terms_id"]
            isOneToOne: false
            referencedRelation: "terrassea_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cgv_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cgv_url_grants: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          ip_address: unknown
          partner_cgv_id: string
          partner_id: string | null
          signed_url_hash: string
          ttl_seconds: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          partner_cgv_id: string
          partner_id?: string | null
          signed_url_hash: string
          ttl_seconds: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          partner_cgv_id?: string
          partner_id?: string | null
          signed_url_hash?: string
          ttl_seconds?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cgv_url_grants_partner_cgv_id_fkey"
            columns: ["partner_cgv_id"]
            isOneToOne: false
            referencedRelation: "partner_cgv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cgv_url_grants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "cgv_url_grants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cgv_url_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          led_to_cart: boolean | null
          led_to_project: boolean | null
          led_to_quote: boolean | null
          messages_count: number | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          led_to_cart?: boolean | null
          led_to_project?: boolean | null
          led_to_quote?: boolean | null
          messages_count?: number | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          led_to_cart?: boolean | null
          led_to_project?: boolean | null
          led_to_quote?: boolean | null
          messages_count?: number | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_usage: {
        Row: {
          cart_conversions: number | null
          conversations_count: number | null
          estimated_cost_cents: number | null
          id: string
          messages_count: number | null
          quote_conversions: number | null
          usage_date: string
        }
        Insert: {
          cart_conversions?: number | null
          conversations_count?: number | null
          estimated_cost_cents?: number | null
          id?: string
          messages_count?: number | null
          quote_conversions?: number | null
          usage_date?: string
        }
        Update: {
          cart_conversions?: number | null
          conversations_count?: number | null
          estimated_cost_cents?: number | null
          id?: string
          messages_count?: number | null
          quote_conversions?: number | null
          usage_date?: string
        }
        Relationships: []
      }
      chr_clients: {
        Row: {
          city: string | null
          client_name: string | null
          client_type: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          emails_sent: number | null
          estimated_quantity: string | null
          estimated_value_eur: number | null
          first_contact_date: string | null
          has_replied: boolean | null
          id: string
          last_contact_date: string | null
          last_gmail_message_id: string | null
          last_subject_line: string | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          order_date: string | null
          order_placed: boolean | null
          phone: string | null
          product_interest: string | null
          quote_date: string | null
          quote_sent: boolean | null
          reply_date: string | null
          reply_summary: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          client_name?: string | null
          client_type?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          emails_sent?: number | null
          estimated_quantity?: string | null
          estimated_value_eur?: number | null
          first_contact_date?: string | null
          has_replied?: boolean | null
          id?: string
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          order_date?: string | null
          order_placed?: boolean | null
          phone?: string | null
          product_interest?: string | null
          quote_date?: string | null
          quote_sent?: boolean | null
          reply_date?: string | null
          reply_summary?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          client_name?: string | null
          client_type?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          emails_sent?: number | null
          estimated_quantity?: string | null
          estimated_value_eur?: number | null
          first_contact_date?: string | null
          has_replied?: boolean | null
          id?: string
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          order_date?: string | null
          order_placed?: boolean | null
          phone?: string | null
          product_interest?: string | null
          quote_date?: string | null
          quote_sent?: boolean | null
          reply_date?: string | null
          reply_summary?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      colors_canonical: {
        Row: {
          created_at: string
          display_order: number
          family: string | null
          hex: string
          is_active: boolean
          label_i18n: Json
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          family?: string | null
          hex: string
          is_active?: boolean
          label_i18n: Json
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          family?: string | null
          hex?: string
          is_active?: boolean
          label_i18n?: Json
          slug?: string
        }
        Relationships: []
      }
      concept_events: {
        Row: {
          concept_id: string | null
          concept_title: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          quantity: number | null
          session_id: string
          snapshot_id: string | null
          user_id: string | null
        }
        Insert: {
          concept_id?: string | null
          concept_title?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          session_id: string
          snapshot_id?: string | null
          user_id?: string | null
        }
        Update: {
          concept_id?: string | null
          concept_title?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          session_id?: string
          snapshot_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_events_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "concept_funnel"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "concept_events_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "scoring_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
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
          project_name: string | null
          project_ref: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          project_name?: string | null
          project_ref?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          project_name?: string | null
          project_ref?: string | null
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
      distributor_prospects: {
        Row: {
          analyst_profile: Json | null
          analyst_score: number | null
          brands_carried: string[] | null
          city: string | null
          company_id: string
          company_name: string
          competitive_intel: string | null
          contacts: Json
          conversion_date: string | null
          conversion_type: string | null
          converted: boolean | null
          country: string | null
          created_at: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          digital_maturity: string | null
          distributor_type: string | null
          emails_sent: number | null
          estimated_size: string | null
          first_contact_date: string | null
          generic_email: string | null
          geographic_coverage: string[] | null
          has_ecommerce: boolean | null
          has_replied: boolean | null
          has_showroom: boolean | null
          hooks_reserved: Json | null
          id: string
          instagram: string | null
          language: string | null
          last_contact_date: string | null
          last_gmail_message_id: string | null
          last_subject_line: string | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          product_categories: string[] | null
          reply_date: string | null
          reply_from: string | null
          reply_sentiment: string | null
          reply_summary: string | null
          scout_score: number | null
          segment: string | null
          showroom_locations: string | null
          status: string | null
          targets_chr: boolean | null
          total_contacts_tried: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          brands_carried?: string[] | null
          city?: string | null
          company_id: string
          company_name: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          digital_maturity?: string | null
          distributor_type?: string | null
          emails_sent?: number | null
          estimated_size?: string | null
          first_contact_date?: string | null
          generic_email?: string | null
          geographic_coverage?: string[] | null
          has_ecommerce?: boolean | null
          has_replied?: boolean | null
          has_showroom?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          product_categories?: string[] | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          segment?: string | null
          showroom_locations?: string | null
          status?: string | null
          targets_chr?: boolean | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          analyst_profile?: Json | null
          analyst_score?: number | null
          brands_carried?: string[] | null
          city?: string | null
          company_id?: string
          company_name?: string
          competitive_intel?: string | null
          contacts?: Json
          conversion_date?: string | null
          conversion_type?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string | null
          current_contact_email?: string | null
          current_contact_name?: string | null
          digital_maturity?: string | null
          distributor_type?: string | null
          emails_sent?: number | null
          estimated_size?: string | null
          first_contact_date?: string | null
          generic_email?: string | null
          geographic_coverage?: string[] | null
          has_ecommerce?: boolean | null
          has_replied?: boolean | null
          has_showroom?: boolean | null
          hooks_reserved?: Json | null
          id?: string
          instagram?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_gmail_message_id?: string | null
          last_subject_line?: string | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          product_categories?: string[] | null
          reply_date?: string | null
          reply_from?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          scout_score?: number | null
          segment?: string | null
          showroom_locations?: string | null
          status?: string | null
          targets_chr?: boolean | null
          total_contacts_tried?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      financing_requests: {
        Row: {
          admin_notes: string | null
          company: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          desired_duration_months: number | null
          estimated_amount: number | null
          id: string
          project_description: string | null
          project_request_id: string | null
          siren: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          company?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          desired_duration_months?: number | null
          estimated_amount?: number | null
          id?: string
          project_description?: string | null
          project_request_id?: string | null
          siren?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          company?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          desired_duration_months?: number | null
          estimated_amount?: number | null
          id?: string
          project_description?: string | null
          project_request_id?: string | null
          siren?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_requests_project_request_id_fkey"
            columns: ["project_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      finishes_canonical: {
        Row: {
          category: string | null
          created_at: string
          display_order: number
          is_active: boolean
          label_i18n: Json
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_order?: number
          is_active?: boolean
          label_i18n: Json
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          display_order?: number
          is_active?: boolean
          label_i18n?: Json
          slug?: string
        }
        Relationships: []
      }
      founding_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          meta: Json
          partner_id: string
          points: number
          reference_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          meta?: Json
          partner_id: string
          points: number
          reference_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          meta?: Json
          partner_id?: string
          points?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founding_actions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "founding_actions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analyses: {
        Row: {
          analysis_result: Json | null
          created_at: string | null
          id: string
          image_path: string
          matched_product_ids: string[] | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string | null
          id?: string
          image_path: string
          matched_product_ids?: string[] | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string | null
          id?: string
          image_path?: string
          matched_product_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          code: string
          created_at: string
          currency: string
          display_order: number
          is_active: boolean
          label_i18n: Json
        }
        Insert: {
          code: string
          created_at?: string
          currency: string
          display_order?: number
          is_active?: boolean
          label_i18n: Json
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          display_order?: number
          is_active?: boolean
          label_i18n?: Json
        }
        Relationships: []
      }
      material_boards: {
        Row: {
          architect_id: string
          board_name: string
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          palette_tags: string[] | null
          project_id: string | null
          share_token: string | null
          style_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          architect_id: string
          board_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          palette_tags?: string[] | null
          project_id?: string | null
          share_token?: string | null
          style_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          architect_id?: string
          board_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          palette_tags?: string[] | null
          project_id?: string | null
          share_token?: string | null
          style_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "architect_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_brand_certifications: {
        Row: {
          certification_id: string
          created_at: string
          material_brand_id: string
        }
        Insert: {
          certification_id: string
          created_at?: string
          material_brand_id: string
        }
        Update: {
          certification_id?: string
          created_at?: string
          material_brand_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_brand_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_brand_certifications_material_brand_id_fkey"
            columns: ["material_brand_id"]
            isOneToOne: false
            referencedRelation: "material_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      material_brands: {
        Row: {
          category: string
          created_at: string
          description_i18n: Json | null
          id: string
          is_premium: boolean
          is_proprietary: boolean
          logo_url: string | null
          name: string
          official_website: string | null
          parent_brand_id: string | null
          parent_company: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description_i18n?: Json | null
          id?: string
          is_premium?: boolean
          is_proprietary?: boolean
          logo_url?: string | null
          name: string
          official_website?: string | null
          parent_brand_id?: string | null
          parent_company?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description_i18n?: Json | null
          id?: string
          is_premium?: boolean
          is_proprietary?: boolean
          logo_url?: string | null
          name?: string
          official_website?: string | null
          parent_brand_id?: string | null
          parent_company?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_brands_parent_brand_id_fkey"
            columns: ["parent_brand_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "material_brands_parent_brand_id_fkey"
            columns: ["parent_brand_id"]
            isOneToOne: false
            referencedRelation: "partners"
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
          sender_user_id: string | null
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
          sender_user_id?: string | null
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
          sender_user_id?: string | null
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
      order_events: {
        Row: {
          actor: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          auto_delivery_confirmed: boolean | null
          balance_amount: number | null
          balance_due_date: string | null
          balance_paid_at: string | null
          balance_payment_ref: string | null
          client_email: string
          client_user_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          delivered_at: string | null
          delivery_conditions: string | null
          delivery_confirmed_by: string | null
          delivery_delay_days: number | null
          delivery_proof_path: string | null
          deposit_amount: number | null
          deposit_due_date: string | null
          deposit_paid_at: string | null
          deposit_payment_ref: string | null
          deposit_percent: number | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          estimated_delivery_date: string | null
          id: string
          invoice_number: string | null
          invoice_pdf_path: string | null
          partner_conditions: string | null
          partner_id: string | null
          payment_conditions: string | null
          payment_method: string | null
          payment_reference: string | null
          product_id: string | null
          product_name: string
          production_confirmed_at: string | null
          project_request_id: string | null
          quantity: number
          quote_request_id: string | null
          review_requested_at: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          status: string
          stripe_balance_payment_id: string | null
          stripe_payment_id: string | null
          stripe_session_id: string | null
          supplier_payout_balance: number | null
          supplier_payout_balance_at: string | null
          supplier_payout_deposit: number | null
          supplier_payout_deposit_at: string | null
          total_amount: number
          tracking_auto_enabled: boolean | null
          tracking_last_checked: string | null
          tracking_last_event: string | null
          tracking_number: string | null
          tracking_provider: string | null
          tracking_status: string | null
          tracking_url: string | null
          tva_rate: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          auto_delivery_confirmed?: boolean | null
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_at?: string | null
          balance_payment_ref?: string | null
          client_email: string
          client_user_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_conditions?: string | null
          delivery_confirmed_by?: string | null
          delivery_delay_days?: number | null
          delivery_proof_path?: string | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          deposit_paid_at?: string | null
          deposit_payment_ref?: string | null
          deposit_percent?: number | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_path?: string | null
          partner_conditions?: string | null
          partner_id?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_name: string
          production_confirmed_at?: string | null
          project_request_id?: string | null
          quantity?: number
          quote_request_id?: string | null
          review_requested_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: string
          stripe_balance_payment_id?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          supplier_payout_balance?: number | null
          supplier_payout_balance_at?: string | null
          supplier_payout_deposit?: number | null
          supplier_payout_deposit_at?: string | null
          total_amount: number
          tracking_auto_enabled?: boolean | null
          tracking_last_checked?: string | null
          tracking_last_event?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_status?: string | null
          tracking_url?: string | null
          tva_rate?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          auto_delivery_confirmed?: boolean | null
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_at?: string | null
          balance_payment_ref?: string | null
          client_email?: string
          client_user_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_conditions?: string | null
          delivery_confirmed_by?: string | null
          delivery_delay_days?: number | null
          delivery_proof_path?: string | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          deposit_paid_at?: string | null
          deposit_payment_ref?: string | null
          deposit_percent?: number | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_path?: string | null
          partner_conditions?: string | null
          partner_id?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          product_name?: string
          production_confirmed_at?: string | null
          project_request_id?: string | null
          quantity?: number
          quote_request_id?: string | null
          review_requested_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: string
          stripe_balance_payment_id?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          supplier_payout_balance?: number | null
          supplier_payout_balance_at?: string | null
          supplier_payout_deposit?: number | null
          supplier_payout_deposit_at?: string | null
          total_amount?: number
          tracking_auto_enabled?: boolean | null
          tracking_last_checked?: string | null
          tracking_last_event?: string | null
          tracking_number?: string | null
          tracking_provider?: string | null
          tracking_status?: string | null
          tracking_url?: string | null
          tva_rate?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_request_id_fkey"
            columns: ["project_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_supplier_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_analytics: {
        Row: {
          avg_response_hours: number | null
          commission_amount: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          orders_count: number | null
          orders_value: number | null
          partner_id: string
          period_date: string
          quote_requests: number | null
          quotes_accepted: number | null
          quotes_sent: number | null
          views: number | null
        }
        Insert: {
          avg_response_hours?: number | null
          commission_amount?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          orders_count?: number | null
          orders_value?: number | null
          partner_id: string
          period_date: string
          quote_requests?: number | null
          quotes_accepted?: number | null
          quotes_sent?: number | null
          views?: number | null
        }
        Update: {
          avg_response_hours?: number | null
          commission_amount?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          orders_count?: number | null
          orders_value?: number | null
          partner_id?: string
          period_date?: string
          quote_requests?: number | null
          quotes_accepted?: number | null
          quotes_sent?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_analytics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_analytics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_connections: {
        Row: {
          consecutive_errors: number | null
          created_at: string | null
          external_api_headers: Json | null
          external_api_key: string | null
          external_api_url: string | null
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_message: string | null
          last_sync_products_count: number | null
          last_sync_status: string | null
          partner_id: string | null
          pull_interval_minutes: number | null
          sync_mode: string
          terrassea_api_key: string | null
          total_syncs: number | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          consecutive_errors?: number | null
          created_at?: string | null
          external_api_headers?: Json | null
          external_api_key?: string | null
          external_api_url?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_products_count?: number | null
          last_sync_status?: string | null
          partner_id?: string | null
          pull_interval_minutes?: number | null
          sync_mode?: string
          terrassea_api_key?: string | null
          total_syncs?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          consecutive_errors?: number | null
          created_at?: string | null
          external_api_headers?: Json | null
          external_api_key?: string | null
          external_api_url?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_products_count?: number | null
          last_sync_status?: string | null
          partner_id?: string | null
          pull_interval_minutes?: number | null
          sync_mode?: string
          terrassea_api_key?: string | null
          total_syncs?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_connections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_api_connections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          admin_notes: string | null
          company_name: string
          contact_name: string
          country: string
          created_at: string | null
          created_partner_id: string | null
          delivery_countries: string[] | null
          email: string
          estimated_annual_volume: string | null
          id: string
          message: string | null
          partner_mode: string | null
          partner_type: string | null
          phone: string | null
          product_categories: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selected_plan: string | null
          status: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          company_name: string
          contact_name: string
          country: string
          created_at?: string | null
          created_partner_id?: string | null
          delivery_countries?: string[] | null
          email: string
          estimated_annual_volume?: string | null
          id?: string
          message?: string | null
          partner_mode?: string | null
          partner_type?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_plan?: string | null
          status?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          company_name?: string
          contact_name?: string
          country?: string
          created_at?: string | null
          created_partner_id?: string | null
          delivery_countries?: string[] | null
          email?: string
          estimated_annual_volume?: string | null
          id?: string
          message?: string | null
          partner_mode?: string | null
          partner_type?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_plan?: string | null
          status?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_created_partner_id_fkey"
            columns: ["created_partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_applications_created_partner_id_fkey"
            columns: ["created_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_arrival_items: {
        Row: {
          arrival_id: string
          created_at: string | null
          expected_quantity: number
          id: string
          offer_id: string | null
          preorder_reserved: number | null
          product_id: string
          received_quantity: number | null
        }
        Insert: {
          arrival_id: string
          created_at?: string | null
          expected_quantity?: number
          id?: string
          offer_id?: string | null
          preorder_reserved?: number | null
          product_id: string
          received_quantity?: number | null
        }
        Update: {
          arrival_id?: string
          created_at?: string | null
          expected_quantity?: number
          id?: string
          offer_id?: string | null
          preorder_reserved?: number | null
          product_id?: string
          received_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_arrival_items_arrival_id_fkey"
            columns: ["arrival_id"]
            isOneToOne: false
            referencedRelation: "partner_arrivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_arrival_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_arrival_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_arrivals: {
        Row: {
          created_at: string | null
          expected_date: string
          id: string
          name: string
          notes: string | null
          partner_id: string
          preorder_enabled: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_date: string
          id?: string
          name: string
          notes?: string | null
          partner_id: string
          preorder_enabled?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_date?: string
          id?: string
          name?: string
          notes?: string | null
          partner_id?: string
          preorder_enabled?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_arrivals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_arrivals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_certifications: {
        Row: {
          certificate_number: string | null
          certificate_url: string | null
          certification_id: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          partner_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          certificate_number?: string | null
          certificate_url?: string | null
          certification_id: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          certificate_number?: string | null
          certificate_url?: string | null
          certification_id?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_certifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_certifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cgv: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          byte_size: number
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          mime_type: string
          partner_id: string
          sha256: string
          status: string
          storage_path: string
          title: string
          version: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          byte_size: number
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          mime_type?: string
          partner_id: string
          sha256: string
          status: string
          storage_path: string
          title: string
          version: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          byte_size?: number
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          mime_type?: string
          partner_id?: string
          sha256?: string
          status?: string
          storage_path?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_cgv_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cgv_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cgv_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_cgv_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cgv_metadata: {
        Row: {
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          current_cgv_id: string | null
          current_version: number | null
          last_updated_at: string
          needs_renewal: boolean
          partner_id: string
          renewal_reason: string | null
        }
        Insert: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          current_cgv_id?: string | null
          current_version?: number | null
          last_updated_at?: string
          needs_renewal?: boolean
          partner_id: string
          renewal_reason?: string | null
        }
        Update: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          current_cgv_id?: string | null
          current_version?: number | null
          last_updated_at?: string
          needs_renewal?: boolean
          partner_id?: string
          renewal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_cgv_metadata_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cgv_metadata_current_cgv_id_fkey"
            columns: ["current_cgv_id"]
            isOneToOne: false
            referencedRelation: "partner_cgv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cgv_metadata_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_cgv_metadata_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_supplier_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contact_requests: {
        Row: {
          budget_range: string | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          partner_id: string | null
          phone: string | null
          project_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          partner_id?: string | null
          phone?: string | null
          project_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          partner_id?: string | null
          phone?: string | null
          project_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_contact_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_contact_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_featured_products: {
        Row: {
          boosted_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          partner_id: string
          position: number | null
          product_id: string
        }
        Insert: {
          boosted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id: string
          position?: number | null
          product_id: string
        }
        Update: {
          boosted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_featured_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_featured_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_loyalty: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number | null
          partner_id: string
          points_balance: number | null
          tier: string | null
          tier_locked_until: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          partner_id: string
          points_balance?: number | null
          tier?: string | null
          tier_locked_until?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          partner_id?: string
          points_balance?: number | null
          tier?: string | null
          tier_locked_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_loyalty_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_loyalty_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_points_history: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          partner_id: string
          points: number
          reference_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          partner_id: string
          points: number
          reference_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          partner_id?: string
          points?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_points_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_points_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_ratings: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          order_id: string | null
          partner_id: string
          project_request_id: string | null
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          order_id?: string | null
          partner_id: string
          project_request_id?: string | null
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          order_id?: string | null
          partner_id?: string
          project_request_id?: string | null
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_ratings_project_request_id_fkey"
            columns: ["project_request_id"]
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
          engagement_months: number | null
          id: string
          max_featured: number | null
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
          engagement_months?: number | null
          id?: string
          max_featured?: number | null
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
          engagement_months?: number | null
          id?: string
          max_featured?: number | null
          max_products?: number | null
          partner_id?: string | null
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          admin_notes: string | null
          admin_visibility_override: boolean | null
          application_id: string | null
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          country_code: string | null
          cover_photo_url: string | null
          created_at: string | null
          deleted_at: string | null
          delivery_countries: string[] | null
          description: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          founded_year: number | null
          founding_joined_at: string | null
          founding_tier: string | null
          founding_tier_rank: number | null
          founding_total_points: number
          gallery_urls: string[] | null
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          is_founding: boolean
          is_public: boolean | null
          logo_url: string | null
          name: string
          partner_mode: string
          partner_type: string | null
          plan: string | null
          priority_order: number | null
          product_categories: string[] | null
          profile_completed: boolean | null
          profile_review_notes: string | null
          profile_reviewed_at: string | null
          profile_reviewed_by: string | null
          profile_status: string | null
          profile_submitted: boolean | null
          profile_submitted_at: string | null
          showroom_address: string | null
          siren: string | null
          slug: string
          specialties: string[] | null
          specialty_tags: string[] | null
          user_id: string | null
          vat_number: string | null
          video_url: string | null
          visibility_level: string | null
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_visibility_override?: boolean | null
          application_id?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          country_code?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_countries?: string[] | null
          description?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          founded_year?: number | null
          founding_joined_at?: string | null
          founding_tier?: string | null
          founding_tier_rank?: number | null
          founding_total_points?: number
          gallery_urls?: string[] | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_founding?: boolean
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          partner_mode?: string
          partner_type?: string | null
          plan?: string | null
          priority_order?: number | null
          product_categories?: string[] | null
          profile_completed?: boolean | null
          profile_review_notes?: string | null
          profile_reviewed_at?: string | null
          profile_reviewed_by?: string | null
          profile_status?: string | null
          profile_submitted?: boolean | null
          profile_submitted_at?: string | null
          showroom_address?: string | null
          siren?: string | null
          slug: string
          specialties?: string[] | null
          specialty_tags?: string[] | null
          user_id?: string | null
          vat_number?: string | null
          video_url?: string | null
          visibility_level?: string | null
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_visibility_override?: boolean | null
          application_id?: string | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          country_code?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_countries?: string[] | null
          description?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          founded_year?: number | null
          founding_joined_at?: string | null
          founding_tier?: string | null
          founding_tier_rank?: number | null
          founding_total_points?: number
          gallery_urls?: string[] | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_founding?: boolean
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          partner_mode?: string
          partner_type?: string | null
          plan?: string | null
          priority_order?: number | null
          product_categories?: string[] | null
          profile_completed?: boolean | null
          profile_review_notes?: string | null
          profile_reviewed_at?: string | null
          profile_reviewed_by?: string | null
          profile_status?: string | null
          profile_submitted?: boolean | null
          profile_submitted_at?: string | null
          showroom_address?: string | null
          siren?: string | null
          slug?: string
          specialties?: string[] | null
          specialty_tags?: string[] | null
          user_id?: string | null
          vat_number?: string | null
          video_url?: string | null
          visibility_level?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          key: string
          label: string | null
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          key: string
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          key?: string
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      preorders: {
        Row: {
          arrival_item_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          status: string | null
          user_id: string
        }
        Insert: {
          arrival_item_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          status?: string | null
          user_id: string
        }
        Update: {
          arrival_item_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preorders_arrival_item_id_fkey"
            columns: ["arrival_item_id"]
            isOneToOne: false
            referencedRelation: "partner_arrival_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_service_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_service_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pro_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_service_matches: {
        Row: {
          admin_notes: string | null
          admin_validated_at: string | null
          admin_validated_by: string | null
          commission_rate: number | null
          created_at: string | null
          estimated_order_value: number | null
          id: string
          partner_id: string
          partner_responded_at: string | null
          partner_response: string | null
          request_id: string
          score_capacity: number | null
          score_category: number | null
          score_location: number | null
          score_plan: number | null
          score_rating: number | null
          score_style: number | null
          score_total: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          commission_rate?: number | null
          created_at?: string | null
          estimated_order_value?: number | null
          id?: string
          partner_id: string
          partner_responded_at?: string | null
          partner_response?: string | null
          request_id: string
          score_capacity?: number | null
          score_category?: number | null
          score_location?: number | null
          score_plan?: number | null
          score_rating?: number | null
          score_style?: number | null
          score_total?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          commission_rate?: number | null
          created_at?: string | null
          estimated_order_value?: number | null
          id?: string
          partner_id?: string
          partner_responded_at?: string | null
          partner_response?: string | null
          request_id?: string
          score_capacity?: number | null
          score_category?: number | null
          score_location?: number | null
          score_plan?: number | null
          score_rating?: number | null
          score_style?: number | null
          score_total?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_service_matches_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "pro_service_matches_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_service_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pro_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_service_requests: {
        Row: {
          accompaniment_type: string | null
          admin_notes: string | null
          architect_id: string | null
          budget_range: string | null
          categories_needed: string[] | null
          client_company: string | null
          client_email: string
          client_function: string | null
          client_name: string
          client_phone: string | null
          client_user_id: string | null
          colors_preferred: string | null
          completed_at: string | null
          constraints_text: string | null
          created_at: string | null
          description: string | null
          desired_date: string | null
          establishment_name: string | null
          id: string
          matched_at: string | null
          materials_preferred: string[] | null
          outdoor_required: boolean | null
          project_city: string | null
          project_country: string | null
          project_nature: string | null
          project_title: string
          project_type: string
          quantity_estimate: number | null
          referral_source: string | null
          siren: string | null
          special_requirements: string | null
          status: string | null
          style_preferences: string[] | null
          surface_area: number | null
          timeline: string | null
          updated_at: string | null
        }
        Insert: {
          accompaniment_type?: string | null
          admin_notes?: string | null
          architect_id?: string | null
          budget_range?: string | null
          categories_needed?: string[] | null
          client_company?: string | null
          client_email: string
          client_function?: string | null
          client_name: string
          client_phone?: string | null
          client_user_id?: string | null
          colors_preferred?: string | null
          completed_at?: string | null
          constraints_text?: string | null
          created_at?: string | null
          description?: string | null
          desired_date?: string | null
          establishment_name?: string | null
          id?: string
          matched_at?: string | null
          materials_preferred?: string[] | null
          outdoor_required?: boolean | null
          project_city?: string | null
          project_country?: string | null
          project_nature?: string | null
          project_title: string
          project_type: string
          quantity_estimate?: number | null
          referral_source?: string | null
          siren?: string | null
          special_requirements?: string | null
          status?: string | null
          style_preferences?: string[] | null
          surface_area?: number | null
          timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          accompaniment_type?: string | null
          admin_notes?: string | null
          architect_id?: string | null
          budget_range?: string | null
          categories_needed?: string[] | null
          client_company?: string | null
          client_email?: string
          client_function?: string | null
          client_name?: string
          client_phone?: string | null
          client_user_id?: string | null
          colors_preferred?: string | null
          completed_at?: string | null
          constraints_text?: string | null
          created_at?: string | null
          description?: string | null
          desired_date?: string | null
          establishment_name?: string | null
          id?: string
          matched_at?: string | null
          materials_preferred?: string[] | null
          outdoor_required?: boolean | null
          project_city?: string | null
          project_country?: string | null
          project_nature?: string | null
          project_title?: string
          project_type?: string
          quantity_estimate?: number | null
          referral_source?: string | null
          siren?: string | null
          special_requirements?: string | null
          status?: string | null
          style_preferences?: string[] | null
          surface_area?: number | null
          timeline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pro_service_responses: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          delivery_weeks: number | null
          estimated_amount: number | null
          id: string
          is_selected: boolean | null
          message: string | null
          partner_id: string
          products: Json | null
          request_id: string
          updated_at: string | null
          warranty: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          delivery_weeks?: number | null
          estimated_amount?: number | null
          id?: string
          is_selected?: boolean | null
          message?: string | null
          partner_id: string
          products?: Json | null
          request_id: string
          updated_at?: string | null
          warranty?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          delivery_weeks?: number | null
          estimated_amount?: number | null
          id?: string
          is_selected?: boolean | null
          message?: string | null
          partner_id?: string
          products?: Json | null
          request_id?: string
          updated_at?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_service_responses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "pro_service_responses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_service_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pro_service_requests"
            referencedColumns: ["id"]
          },
        ]
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
      product_certifications: {
        Row: {
          certification_id: string
          created_at: string
          id: string
          issued_at: string | null
          lab_name: string | null
          notes: string | null
          product_id: string
          pv_document_url: string | null
          pv_number: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          certification_id: string
          created_at?: string
          id?: string
          issued_at?: string | null
          lab_name?: string | null
          notes?: string | null
          product_id: string
          pv_document_url?: string | null
          pv_number?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          certification_id?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          lab_name?: string | null
          notes?: string | null
          product_id?: string
          pv_document_url?: string | null
          pv_number?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_certifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text_i18n: Json | null
          bytes: number | null
          created_at: string
          display_order: number
          height_px: number | null
          id: string
          is_primary: boolean
          kind: string
          product_id: string | null
          updated_at: string
          url: string
          variant_id: string | null
          width_px: number | null
        }
        Insert: {
          alt_text_i18n?: Json | null
          bytes?: number | null
          created_at?: string
          display_order?: number
          height_px?: number | null
          id?: string
          is_primary?: boolean
          kind: string
          product_id?: string | null
          updated_at?: string
          url: string
          variant_id?: string | null
          width_px?: number | null
        }
        Update: {
          alt_text_i18n?: Json | null
          bytes?: number | null
          created_at?: string
          display_order?: number
          height_px?: number | null
          id?: string
          is_primary?: boolean
          kind?: string
          product_id?: string | null
          updated_at?: string
          url?: string
          variant_id?: string | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          collection_name: string | null
          created_at: string | null
          currency: string | null
          delivery_delay_days: number | null
          dimension_tag: string | null
          id: string
          is_active: boolean | null
          minimum_order: number | null
          notes: string | null
          partner_color_name: string | null
          partner_id: string
          partner_ref: string | null
          price: number | null
          pricing_mode: string
          product_id: string
          purchase_type: string | null
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string | null
        }
        Insert: {
          collection_name?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_delay_days?: number | null
          dimension_tag?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_color_name?: string | null
          partner_id: string
          partner_ref?: string | null
          price?: number | null
          pricing_mode?: string
          product_id: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
        }
        Update: {
          collection_name?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_delay_days?: number | null
          dimension_tag?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order?: number | null
          notes?: string | null
          partner_color_name?: string | null
          partner_id?: string
          partner_ref?: string | null
          price?: number | null
          pricing_mode?: string
          product_id?: string
          purchase_type?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
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
      product_reviews: {
        Row: {
          created_at: string | null
          id: string
          is_verified_purchase: boolean | null
          order_id: string | null
          product_id: string
          quote_request_id: string | null
          rating: number
          review: string | null
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id: string
          quote_request_id?: string | null
          rating: number
          review?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id?: string
          quote_request_id?: string | null
          rating?: number
          review?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_supplier_view"
            referencedColumns: ["id"]
          },
        ]
      }
      product_submissions: {
        Row: {
          admin_feedback: Json | null
          admin_notes: string | null
          approved_product_id: string | null
          created_at: string | null
          detected_duplicate_id: string | null
          existing_description: string | null
          feedback_sent_at: string | null
          id: string
          merge_status: string | null
          merged_description: string | null
          original_description: string | null
          partner_id: string
          product_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number | null
          status: string | null
          submission_type: string
          target_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          admin_feedback?: Json | null
          admin_notes?: string | null
          approved_product_id?: string | null
          created_at?: string | null
          detected_duplicate_id?: string | null
          existing_description?: string | null
          feedback_sent_at?: string | null
          id?: string
          merge_status?: string | null
          merged_description?: string | null
          original_description?: string | null
          partner_id: string
          product_data: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string | null
          submission_type?: string
          target_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_feedback?: Json | null
          admin_notes?: string | null
          approved_product_id?: string | null
          created_at?: string | null
          detected_duplicate_id?: string | null
          existing_description?: string | null
          feedback_sent_at?: string | null
          id?: string
          merge_status?: string | null
          merged_description?: string | null
          original_description?: string | null
          partner_id?: string
          product_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string | null
          submission_type?: string
          target_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_submissions_approved_product_id_fkey"
            columns: ["approved_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_detected_duplicate_id_fkey"
            columns: ["detected_duplicate_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "product_submissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          available_in_markets: string[] | null
          confidence_score: number | null
          configuration_module: string | null
          created_at: string
          delivery_weeks_max: number | null
          delivery_weeks_min: number | null
          depth_cm: number | null
          diameter_cm: number | null
          discontinued_at: string | null
          extracted_at: string | null
          fabric_color_hex: string | null
          fabric_color_label_i18n: Json | null
          fabric_color_slug: string | null
          frame_finish_label_i18n: Json | null
          frame_finish_slug: string | null
          has_armrests: boolean | null
          has_cushion: boolean | null
          has_wheels: boolean | null
          height_cm: number | null
          id: string
          in_stock: boolean
          is_default: boolean
          is_made_to_order: boolean
          is_published: boolean
          is_stackable: boolean | null
          material_brand_id: string | null
          price_currency: string
          price_eur: number | null
          primary_media_id: string | null
          product_id: string
          shape: string | null
          sku: string | null
          source_type: string | null
          source_url: string | null
          stock_quantity: number | null
          subdivision: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          variant_name: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          available_in_markets?: string[] | null
          confidence_score?: number | null
          configuration_module?: string | null
          created_at?: string
          delivery_weeks_max?: number | null
          delivery_weeks_min?: number | null
          depth_cm?: number | null
          diameter_cm?: number | null
          discontinued_at?: string | null
          extracted_at?: string | null
          fabric_color_hex?: string | null
          fabric_color_label_i18n?: Json | null
          fabric_color_slug?: string | null
          frame_finish_label_i18n?: Json | null
          frame_finish_slug?: string | null
          has_armrests?: boolean | null
          has_cushion?: boolean | null
          has_wheels?: boolean | null
          height_cm?: number | null
          id?: string
          in_stock?: boolean
          is_default?: boolean
          is_made_to_order?: boolean
          is_published?: boolean
          is_stackable?: boolean | null
          material_brand_id?: string | null
          price_currency?: string
          price_eur?: number | null
          primary_media_id?: string | null
          product_id: string
          shape?: string | null
          sku?: string | null
          source_type?: string | null
          source_url?: string | null
          stock_quantity?: number | null
          subdivision?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant_name?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          available_in_markets?: string[] | null
          confidence_score?: number | null
          configuration_module?: string | null
          created_at?: string
          delivery_weeks_max?: number | null
          delivery_weeks_min?: number | null
          depth_cm?: number | null
          diameter_cm?: number | null
          discontinued_at?: string | null
          extracted_at?: string | null
          fabric_color_hex?: string | null
          fabric_color_label_i18n?: Json | null
          fabric_color_slug?: string | null
          frame_finish_label_i18n?: Json | null
          frame_finish_slug?: string | null
          has_armrests?: boolean | null
          has_cushion?: boolean | null
          has_wheels?: boolean | null
          height_cm?: number | null
          id?: string
          in_stock?: boolean
          is_default?: boolean
          is_made_to_order?: boolean
          is_published?: boolean
          is_stackable?: boolean | null
          material_brand_id?: string | null
          price_currency?: string
          price_eur?: number | null
          primary_media_id?: string | null
          product_id?: string
          shape?: string | null
          sku?: string | null
          source_type?: string | null
          source_url?: string | null
          stock_quantity?: number | null
          subdivision?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant_name?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_fabric_color_slug_fkey"
            columns: ["fabric_color_slug"]
            isOneToOne: false
            referencedRelation: "colors_canonical"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "product_variants_frame_finish_slug_fkey"
            columns: ["frame_finish_slug"]
            isOneToOne: false
            referencedRelation: "finishes_canonical"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "product_variants_material_brand_id_fkey"
            columns: ["material_brand_id"]
            isOneToOne: false
            referencedRelation: "material_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_primary_media_id_fkey"
            columns: ["primary_media_id"]
            isOneToOne: false
            referencedRelation: "product_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          acoustic_nrc: number | null
          ambience_tags: string[] | null
          archetype_confidence: number | null
          archetype_id: string | null
          availability_type: string | null
          available_colors: string[] | null
          available_modules: Json | null
          brand_source: string | null
          built_in_umbrella_hole: boolean | null
          category: string
          chair_structure_type: string | null
          chlorine_resistance: boolean | null
          collection: string | null
          color_variants: Json | null
          combinable: boolean | null
          combined_capacity_if_joined: number | null
          country_of_manufacture: string | null
          created_at: string | null
          cushion_quick_dry: boolean | null
          cushion_replacement_available: boolean | null
          customizable: boolean | null
          data_quality_score: number | null
          default_seating_capacity: number | null
          dimension_variants: Json | null
          dimensions_height_cm: number | null
          dimensions_length_cm: number | null
          dimensions_width_cm: number | null
          dismountable: boolean | null
          documents: Json | null
          duplicate_of: string | null
          easy_maintenance: boolean | null
          environment_urls: string[] | null
          estimated_delivery_days: number | null
          extension_capability: boolean | null
          extension_max_length_cm: number | null
          fabric_certification: string | null
          fabric_g_m2: number | null
          fire_retardant: boolean | null
          footrest: boolean | null
          gallery_urls: string[] | null
          has_armrests: boolean | null
          heating_compatible: boolean | null
          id: string
          image_url: string | null
          indicative_price: string | null
          is_canonical_instance: boolean | null
          is_chr_heavy_use: boolean | null
          is_outdoor: boolean | null
          is_stackable: boolean | null
          is_tippable: boolean | null
          lightweight: boolean | null
          long_description: string | null
          long_description_es: string | null
          long_description_fr: string | null
          long_description_it: string | null
          main_color: string | null
          maintenance_info: string | null
          maintenance_info_es: string | null
          maintenance_info_fr: string | null
          maintenance_info_it: string | null
          material_seat: string | null
          material_structure: string | null
          material_tags: string[] | null
          min_base_weight_kg: number | null
          name: string
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          nesting_capacity: number | null
          outdoor_anchor_compatible: boolean | null
          outdoor_classification: string | null
          owner_brand_id: string | null
          palette_tags: string[] | null
          partner_id: string | null
          pole_diameter_mm: number | null
          popularity_score: number | null
          price_max: number | null
          price_min: number | null
          primary_designer: string | null
          priority_score: number | null
          product_family: string | null
          product_slug: string
          product_type_tags: Json | null
          publish_status: string | null
          recommended_seating_max: number | null
          recommended_seating_min: number | null
          requires_assembly: boolean | null
          salt_water_resistance: boolean | null
          sand_drainage: boolean | null
          seat_depth_cm: number | null
          seat_height_cm: number | null
          secondary_color: string | null
          short_description: string | null
          short_description_es: string | null
          short_description_fr: string | null
          short_description_it: string | null
          stock_quantity: number | null
          stock_status: string | null
          style_tags: string[] | null
          subcategory: string | null
          subdivision: string | null
          supplier_internal: string | null
          swivel: boolean | null
          table_shape: string | null
          table_top_height_cm: number | null
          technical_tags: string[] | null
          top_thickness_cm: number | null
          umbrella_hole_diameter_mm: number | null
          updated_at: string | null
          usage_mode: string | null
          use_case_tags: string[] | null
          uv_resistant: boolean | null
          warranty: string | null
          weather_resistant: boolean | null
          weight_kg: number | null
          wind_beaufort_max: number | null
        }
        Insert: {
          acoustic_nrc?: number | null
          ambience_tags?: string[] | null
          archetype_confidence?: number | null
          archetype_id?: string | null
          availability_type?: string | null
          available_colors?: string[] | null
          available_modules?: Json | null
          brand_source?: string | null
          built_in_umbrella_hole?: boolean | null
          category: string
          chair_structure_type?: string | null
          chlorine_resistance?: boolean | null
          collection?: string | null
          color_variants?: Json | null
          combinable?: boolean | null
          combined_capacity_if_joined?: number | null
          country_of_manufacture?: string | null
          created_at?: string | null
          cushion_quick_dry?: boolean | null
          cushion_replacement_available?: boolean | null
          customizable?: boolean | null
          data_quality_score?: number | null
          default_seating_capacity?: number | null
          dimension_variants?: Json | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          duplicate_of?: string | null
          easy_maintenance?: boolean | null
          environment_urls?: string[] | null
          estimated_delivery_days?: number | null
          extension_capability?: boolean | null
          extension_max_length_cm?: number | null
          fabric_certification?: string | null
          fabric_g_m2?: number | null
          fire_retardant?: boolean | null
          footrest?: boolean | null
          gallery_urls?: string[] | null
          has_armrests?: boolean | null
          heating_compatible?: boolean | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_canonical_instance?: boolean | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          is_tippable?: boolean | null
          lightweight?: boolean | null
          long_description?: string | null
          long_description_es?: string | null
          long_description_fr?: string | null
          long_description_it?: string | null
          main_color?: string | null
          maintenance_info?: string | null
          maintenance_info_es?: string | null
          maintenance_info_fr?: string | null
          maintenance_info_it?: string | null
          material_seat?: string | null
          material_structure?: string | null
          material_tags?: string[] | null
          min_base_weight_kg?: number | null
          name: string
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          nesting_capacity?: number | null
          outdoor_anchor_compatible?: boolean | null
          outdoor_classification?: string | null
          owner_brand_id?: string | null
          palette_tags?: string[] | null
          partner_id?: string | null
          pole_diameter_mm?: number | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          primary_designer?: string | null
          priority_score?: number | null
          product_family?: string | null
          product_slug: string
          product_type_tags?: Json | null
          publish_status?: string | null
          recommended_seating_max?: number | null
          recommended_seating_min?: number | null
          requires_assembly?: boolean | null
          salt_water_resistance?: boolean | null
          sand_drainage?: boolean | null
          seat_depth_cm?: number | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          short_description_es?: string | null
          short_description_fr?: string | null
          short_description_it?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          subdivision?: string | null
          supplier_internal?: string | null
          swivel?: boolean | null
          table_shape?: string | null
          table_top_height_cm?: number | null
          technical_tags?: string[] | null
          top_thickness_cm?: number | null
          umbrella_hole_diameter_mm?: number | null
          updated_at?: string | null
          usage_mode?: string | null
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
          wind_beaufort_max?: number | null
        }
        Update: {
          acoustic_nrc?: number | null
          ambience_tags?: string[] | null
          archetype_confidence?: number | null
          archetype_id?: string | null
          availability_type?: string | null
          available_colors?: string[] | null
          available_modules?: Json | null
          brand_source?: string | null
          built_in_umbrella_hole?: boolean | null
          category?: string
          chair_structure_type?: string | null
          chlorine_resistance?: boolean | null
          collection?: string | null
          color_variants?: Json | null
          combinable?: boolean | null
          combined_capacity_if_joined?: number | null
          country_of_manufacture?: string | null
          created_at?: string | null
          cushion_quick_dry?: boolean | null
          cushion_replacement_available?: boolean | null
          customizable?: boolean | null
          data_quality_score?: number | null
          default_seating_capacity?: number | null
          dimension_variants?: Json | null
          dimensions_height_cm?: number | null
          dimensions_length_cm?: number | null
          dimensions_width_cm?: number | null
          dismountable?: boolean | null
          documents?: Json | null
          duplicate_of?: string | null
          easy_maintenance?: boolean | null
          environment_urls?: string[] | null
          estimated_delivery_days?: number | null
          extension_capability?: boolean | null
          extension_max_length_cm?: number | null
          fabric_certification?: string | null
          fabric_g_m2?: number | null
          fire_retardant?: boolean | null
          footrest?: boolean | null
          gallery_urls?: string[] | null
          has_armrests?: boolean | null
          heating_compatible?: boolean | null
          id?: string
          image_url?: string | null
          indicative_price?: string | null
          is_canonical_instance?: boolean | null
          is_chr_heavy_use?: boolean | null
          is_outdoor?: boolean | null
          is_stackable?: boolean | null
          is_tippable?: boolean | null
          lightweight?: boolean | null
          long_description?: string | null
          long_description_es?: string | null
          long_description_fr?: string | null
          long_description_it?: string | null
          main_color?: string | null
          maintenance_info?: string | null
          maintenance_info_es?: string | null
          maintenance_info_fr?: string | null
          maintenance_info_it?: string | null
          material_seat?: string | null
          material_structure?: string | null
          material_tags?: string[] | null
          min_base_weight_kg?: number | null
          name?: string
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          nesting_capacity?: number | null
          outdoor_anchor_compatible?: boolean | null
          outdoor_classification?: string | null
          owner_brand_id?: string | null
          palette_tags?: string[] | null
          partner_id?: string | null
          pole_diameter_mm?: number | null
          popularity_score?: number | null
          price_max?: number | null
          price_min?: number | null
          primary_designer?: string | null
          priority_score?: number | null
          product_family?: string | null
          product_slug?: string
          product_type_tags?: Json | null
          publish_status?: string | null
          recommended_seating_max?: number | null
          recommended_seating_min?: number | null
          requires_assembly?: boolean | null
          salt_water_resistance?: boolean | null
          sand_drainage?: boolean | null
          seat_depth_cm?: number | null
          seat_height_cm?: number | null
          secondary_color?: string | null
          short_description?: string | null
          short_description_es?: string | null
          short_description_fr?: string | null
          short_description_it?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          style_tags?: string[] | null
          subcategory?: string | null
          subdivision?: string | null
          supplier_internal?: string | null
          swivel?: boolean | null
          table_shape?: string | null
          table_top_height_cm?: number | null
          technical_tags?: string[] | null
          top_thickness_cm?: number | null
          umbrella_hole_diameter_mm?: number | null
          updated_at?: string | null
          usage_mode?: string | null
          use_case_tags?: string[] | null
          uv_resistant?: boolean | null
          warranty?: string | null
          weather_resistant?: boolean | null
          weight_kg?: number | null
          wind_beaufort_max?: number | null
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
            foreignKeyName: "products_owner_brand_id_fkey"
            columns: ["owner_brand_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "products_owner_brand_id_fkey"
            columns: ["owner_brand_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
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
      project_annotations: {
        Row: {
          author_id: string
          author_name: string | null
          author_type: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          project_id: string
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          author_id: string
          author_name?: string | null
          author_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          project_id: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string | null
          author_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          project_id?: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "architect_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_annotations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "project_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_briefs: {
        Row: {
          brand_partner_id: string
          budget_range: string | null
          capacity: number | null
          client_user_id: string | null
          collections_interest: string[] | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          establishment_type: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message: string | null
          product_id: string | null
          project_type: string | null
          qualification_score: number | null
          quantity_estimate: number | null
          routed_to_partner_id: string | null
          siren: string | null
          stars_or_class: string | null
          status: string | null
          timeline: string | null
          updated_at: string | null
        }
        Insert: {
          brand_partner_id: string
          budget_range?: string | null
          capacity?: number | null
          client_user_id?: string | null
          collections_interest?: string[] | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          establishment_type?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          product_id?: string | null
          project_type?: string | null
          qualification_score?: number | null
          quantity_estimate?: number | null
          routed_to_partner_id?: string | null
          siren?: string | null
          stars_or_class?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_partner_id?: string
          budget_range?: string | null
          capacity?: number | null
          client_user_id?: string | null
          collections_interest?: string[] | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          establishment_type?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          product_id?: string | null
          project_type?: string | null
          qualification_score?: number | null
          quantity_estimate?: number | null
          routed_to_partner_id?: string | null
          siren?: string | null
          stars_or_class?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_brand_partner_id_fkey"
            columns: ["brand_partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "project_briefs_brand_partner_id_fkey"
            columns: ["brand_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_routed_to_partner_id_fkey"
            columns: ["routed_to_partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "project_briefs_routed_to_partner_id_fkey"
            columns: ["routed_to_partner_id"]
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
          selected_delivery_days: number | null
          selected_dimension_tag: string | null
          selected_offer_id: string | null
          selected_partner_id: string | null
          selected_partner_name: string | null
          selected_price: number | null
          selected_stock_status: string | null
          variant_id: string | null
        }
        Insert: {
          concept_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          project_request_id?: string | null
          quantity?: number
          selected_delivery_days?: number | null
          selected_dimension_tag?: string | null
          selected_offer_id?: string | null
          selected_partner_id?: string | null
          selected_partner_name?: string | null
          selected_price?: number | null
          selected_stock_status?: string | null
          variant_id?: string | null
        }
        Update: {
          concept_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          project_request_id?: string | null
          quantity?: number
          selected_delivery_days?: number | null
          selected_dimension_tag?: string | null
          selected_offer_id?: string | null
          selected_partner_id?: string | null
          selected_partner_name?: string | null
          selected_price?: number | null
          selected_stock_status?: string | null
          variant_id?: string | null
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
          {
            foreignKeyName: "project_cart_items_selected_offer_id_fkey"
            columns: ["selected_offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cart_items_selected_partner_id_fkey"
            columns: ["selected_partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "project_cart_items_selected_partner_id_fkey"
            columns: ["selected_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
          estimated_value: number | null
          free_text_request: string | null
          id: string
          project_name: string | null
          status: string | null
          timeline: string | null
          updated_at: string | null
          user_id: string | null
          venue_type: string | null
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
          estimated_value?: number | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_type?: string | null
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
          estimated_value?: number | null
          free_text_request?: string | null
          id?: string
          project_name?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          architect_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          product_config: Json | null
          style: string | null
          template_name: string
          use_count: number | null
          venue_type: string | null
          zone_config: Json | null
        }
        Insert: {
          architect_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          product_config?: Json | null
          style?: string | null
          template_name: string
          use_count?: number | null
          venue_type?: string | null
          zone_config?: Json | null
        }
        Update: {
          architect_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          product_config?: Json | null
          style?: string | null
          template_name?: string
          use_count?: number | null
          venue_type?: string | null
          zone_config?: Json | null
        }
        Relationships: []
      }
      project_zone_products: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          project_id: string
          quantity: number | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit_price: number | null
          zone_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          project_id: string
          quantity?: number | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_price?: number | null
          zone_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          project_id?: string
          quantity?: number | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_price?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_zone_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_zone_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "architect_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_zone_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "project_zone_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_zone_products_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "project_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          project_id: string
          sort_order: number | null
          zone_area: string | null
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number | null
          zone_area?: string | null
          zone_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number | null
          zone_area?: string | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "architect_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          quote_request_id: string | null
          signature_provider: string | null
          signature_reference: string | null
          signed_at: string | null
          signed_by: string | null
          uploaded_by: string | null
          uploader_type: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          quote_request_id?: string | null
          signature_provider?: string | null
          signature_reference?: string | null
          signed_at?: string | null
          signed_by?: string | null
          uploaded_by?: string | null
          uploader_type: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          quote_request_id?: string | null
          signature_provider?: string | null
          signature_reference?: string | null
          signed_at?: string | null
          signed_by?: string | null
          uploaded_by?: string | null
          uploader_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_documents_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests_supplier_view"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          client_anonymous_id: string | null
          client_city: string | null
          client_country_code: string | null
          client_first_name: string | null
          client_user_id: string | null
          company: string | null
          created_at: string | null
          delivery_conditions: string | null
          delivery_delay_days: number | null
          email: string
          first_name: string
          fit_status: string | null
          id: string
          last_name: string | null
          last_reminder_sent_at: string | null
          latest_pdf_path: string | null
          message: string | null
          offer_id: string | null
          partner_conditions: string | null
          partner_id: string | null
          partner_name: string | null
          payment_conditions: string | null
          product_id: string | null
          product_name: string | null
          project_request_id: string | null
          quantity: number | null
          replied_at: string | null
          selected_dimension_tag: string | null
          signed_at: string | null
          signed_by: string | null
          signed_pdf_path: string | null
          siren: string | null
          status: string | null
          supplier_country_code: string | null
          total_price: number | null
          tva_rate: number | null
          unit_price: number | null
          validity_days: number | null
          validity_expires_at: string | null
          variant_id: string | null
        }
        Insert: {
          client_anonymous_id?: string | null
          client_city?: string | null
          client_country_code?: string | null
          client_first_name?: string | null
          client_user_id?: string | null
          company?: string | null
          created_at?: string | null
          delivery_conditions?: string | null
          delivery_delay_days?: number | null
          email: string
          first_name: string
          fit_status?: string | null
          id?: string
          last_name?: string | null
          last_reminder_sent_at?: string | null
          latest_pdf_path?: string | null
          message?: string | null
          offer_id?: string | null
          partner_conditions?: string | null
          partner_id?: string | null
          partner_name?: string | null
          payment_conditions?: string | null
          product_id?: string | null
          product_name?: string | null
          project_request_id?: string | null
          quantity?: number | null
          replied_at?: string | null
          selected_dimension_tag?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_pdf_path?: string | null
          siren?: string | null
          status?: string | null
          supplier_country_code?: string | null
          total_price?: number | null
          tva_rate?: number | null
          unit_price?: number | null
          validity_days?: number | null
          validity_expires_at?: string | null
          variant_id?: string | null
        }
        Update: {
          client_anonymous_id?: string | null
          client_city?: string | null
          client_country_code?: string | null
          client_first_name?: string | null
          client_user_id?: string | null
          company?: string | null
          created_at?: string | null
          delivery_conditions?: string | null
          delivery_delay_days?: number | null
          email?: string
          first_name?: string
          fit_status?: string | null
          id?: string
          last_name?: string | null
          last_reminder_sent_at?: string | null
          latest_pdf_path?: string | null
          message?: string | null
          offer_id?: string | null
          partner_conditions?: string | null
          partner_id?: string | null
          partner_name?: string | null
          payment_conditions?: string | null
          product_id?: string | null
          product_name?: string | null
          project_request_id?: string | null
          quantity?: number | null
          replied_at?: string | null
          selected_dimension_tag?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_pdf_path?: string | null
          siren?: string | null
          status?: string | null
          supplier_country_code?: string | null
          total_price?: number | null
          tva_rate?: number | null
          unit_price?: number | null
          validity_days?: number | null
          validity_expires_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "quote_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_project_request_id_fkey"
            columns: ["project_request_id"]
            isOneToOne: false
            referencedRelation: "project_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      salone_2026_visits: {
        Row: {
          brand_id: string
          id: string
          mail: string | null
          nom: string | null
          notes: string | null
          poste: string | null
          prenom: string | null
          rdv: boolean | null
          updated_at: string | null
          visited: boolean | null
        }
        Insert: {
          brand_id: string
          id?: string
          mail?: string | null
          nom?: string | null
          notes?: string | null
          poste?: string | null
          prenom?: string | null
          rdv?: boolean | null
          updated_at?: string | null
          visited?: boolean | null
        }
        Update: {
          brand_id?: string
          id?: string
          mail?: string | null
          nom?: string | null
          notes?: string | null
          poste?: string | null
          prenom?: string | null
          rdv?: boolean | null
          updated_at?: string | null
          visited?: boolean | null
        }
        Relationships: []
      }
      saved_carts: {
        Row: {
          cart_data: Json
          created_at: string | null
          id: string
          item_count: number | null
          last_synced_at: string | null
          notes: string | null
          reminder_count: number | null
          reminder_sent_at: string | null
          submitted_at: string | null
          total_estimated: number | null
          user_id: string
        }
        Insert: {
          cart_data?: Json
          created_at?: string | null
          id?: string
          item_count?: number | null
          last_synced_at?: string | null
          notes?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          submitted_at?: string | null
          total_estimated?: number | null
          user_id: string
        }
        Update: {
          cart_data?: Json
          created_at?: string | null
          id?: string
          item_count?: number | null
          last_synced_at?: string | null
          notes?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          submitted_at?: string | null
          total_estimated?: number | null
          user_id?: string
        }
        Relationships: []
      }
      scoring_snapshots: {
        Row: {
          concept_ids: string[]
          concept_titles: string[]
          created_at: string
          generation_context: Json | null
          id: string
          parameters: Json
          scoring_version: string
          selected_product_ids: string[]
          session_id: string
          user_id: string | null
        }
        Insert: {
          concept_ids?: string[]
          concept_titles?: string[]
          created_at?: string
          generation_context?: Json | null
          id?: string
          parameters: Json
          scoring_version: string
          selected_product_ids?: string[]
          session_id: string
          user_id?: string | null
        }
        Update: {
          concept_ids?: string[]
          concept_titles?: string[]
          created_at?: string
          generation_context?: Json | null
          id?: string
          parameters?: Json
          scoring_version?: string
          selected_product_ids?: string[]
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stock_sync_logs: {
        Row: {
          connection_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          partner_id: string | null
          products_failed: number | null
          products_updated: number | null
          request_payload: Json | null
          status: string
          sync_mode: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          partner_id?: string | null
          products_failed?: number | null
          products_updated?: number | null
          request_payload?: Json | null
          status: string
          sync_mode: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          partner_id?: string | null
          products_failed?: number | null
          products_updated?: number | null
          request_payload?: Json | null
          status?: string
          sync_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "partner_api_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_sync_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "stock_sync_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_call_needs: {
        Row: {
          call_id: string
          category: string
          description: string
          id: string
          priority: string
          qty: number | null
          sort_order: number
        }
        Insert: {
          call_id: string
          category: string
          description?: string
          id?: string
          priority?: string
          qty?: number | null
          sort_order?: number
        }
        Update: {
          call_id?: string
          category?: string
          description?: string
          id?: string
          priority?: string
          qty?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_call_needs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "supplier_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_call_response_products: {
        Row: {
          id: string
          image: string | null
          name: string
          qty: number
          response_id: string
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          image?: string | null
          name: string
          qty?: number
          response_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          image?: string | null
          name?: string
          qty?: number
          response_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_call_response_products_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "supplier_call_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_call_responses: {
        Row: {
          attachments: string[] | null
          call_id: string
          created_at: string
          delivery_weeks: number
          estimated_amount: number
          id: string
          message: string
          selected: boolean
          supplier_company: string
          supplier_id: string | null
          supplier_name: string
          warranty: string | null
        }
        Insert: {
          attachments?: string[] | null
          call_id: string
          created_at?: string
          delivery_weeks?: number
          estimated_amount?: number
          id?: string
          message?: string
          selected?: boolean
          supplier_company?: string
          supplier_id?: string | null
          supplier_name?: string
          warranty?: string | null
        }
        Update: {
          attachments?: string[] | null
          call_id?: string
          created_at?: string
          delivery_weeks?: number
          estimated_amount?: number
          id?: string
          message?: string
          selected?: boolean
          supplier_company?: string
          supplier_id?: string | null
          supplier_name?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_call_responses_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "supplier_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_calls: {
        Row: {
          ambiance: string | null
          architect_id: string
          brief: string
          budget: string
          clicks: number
          client_name: string
          constraints: string | null
          created_at: string
          deadline: string
          id: string
          materials: string[] | null
          project_id: string | null
          project_name: string
          seating_capacity: number | null
          status: string
          style: string | null
          surface_area: string | null
          updated_at: string
          urgency: string
          venue_type: string
          views: number
        }
        Insert: {
          ambiance?: string | null
          architect_id: string
          brief?: string
          budget?: string
          clicks?: number
          client_name?: string
          constraints?: string | null
          created_at?: string
          deadline?: string
          id?: string
          materials?: string[] | null
          project_id?: string | null
          project_name: string
          seating_capacity?: number | null
          status?: string
          style?: string | null
          surface_area?: string | null
          updated_at?: string
          urgency?: string
          venue_type?: string
          views?: number
        }
        Update: {
          ambiance?: string | null
          architect_id?: string
          brief?: string
          budget?: string
          clicks?: number
          client_name?: string
          constraints?: string | null
          created_at?: string
          deadline?: string
          id?: string
          materials?: string[] | null
          project_id?: string | null
          project_name?: string
          seating_capacity?: number | null
          status?: string
          style?: string | null
          surface_area?: string | null
          updated_at?: string
          urgency?: string
          venue_type?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_calls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "architect_projects"
            referencedColumns: ["id"]
          },
        ]
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
      terrassea_terms: {
        Row: {
          created_at: string
          created_by: string | null
          en_sha256: string | null
          en_source_path: string | null
          fr_sha256: string
          fr_source_path: string
          git_commit_sha: string
          id: string
          legal_review_status: string
          notes: string | null
          published_at: string
          supersedes_version: number | null
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          en_sha256?: string | null
          en_source_path?: string | null
          fr_sha256: string
          fr_source_path: string
          git_commit_sha: string
          id?: string
          legal_review_status: string
          notes?: string | null
          published_at: string
          supersedes_version?: number | null
          title: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          en_sha256?: string | null
          en_source_path?: string | null
          fr_sha256?: string
          fr_source_path?: string
          git_commit_sha?: string
          id?: string
          legal_review_status?: string
          notes?: string | null
          published_at?: string
          supersedes_version?: number | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "terrassea_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favourites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company: string | null
          country: string | null
          country_code: string | null
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
          country_code?: string | null
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
          country_code?: string | null
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
      concept_funnel: {
        Row: {
          budget_level: string | null
          concepts_generated: number | null
          distinct_concepts_expanded: number | null
          establishment_type: string | null
          expansions: number | null
          generated_at: string | null
          products_added: number | null
          quotes_requested: number | null
          scoring_version: string | null
          seating_capacity: number | null
          snapshot_id: string | null
          views: number | null
        }
        Relationships: []
      }
      founding_partner_scores: {
        Row: {
          actions_count: number | null
          founding_joined_at: string | null
          is_founding: boolean | null
          partner_id: string | null
          partner_name: string | null
          slug: string | null
          tier: string | null
          total_points: number | null
        }
        Relationships: []
      }
      partner_ratings_summary: {
        Row: {
          avg_rating: number | null
          partner_id: string | null
          total_ratings: number | null
          verified_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      product_review_stats: {
        Row: {
          avg_rating: number | null
          product_id: string | null
          review_count: number | null
          stars_1: number | null
          stars_2: number | null
          stars_3: number | null
          stars_4: number | null
          stars_5: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects_45d_summary: {
        Row: {
          active_last_45d: number | null
          bounced: number | null
          contacted_last_45d: number | null
          new_last_45d: number | null
          replied_last_45d: number | null
          reply_rate_pct: number | null
          segment: string | null
          total_prospects: number | null
          total_replied: number | null
        }
        Relationships: []
      }
      prospects_actions_this_week: {
        Row: {
          company_name: string | null
          country: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          days_overdue: number | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          segment: string | null
          status: string | null
        }
        Relationships: []
      }
      prospects_activity_summary: {
        Row: {
          company_id: string | null
          company_name: string | null
          country: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          emails_sent: number | null
          first_contact_date: string | null
          has_replied: boolean | null
          last_contact_date: string | null
          met_at_event: string | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          reply_date: string | null
          reply_sentiment: string | null
          segment: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      prospects_awaiting_reply: {
        Row: {
          company_name: string | null
          country: string | null
          current_contact_email: string | null
          current_contact_name: string | null
          days_since_reply: number | null
          next_action_type: string | null
          notes: string | null
          reply_date: string | null
          reply_sentiment: string | null
          segment: string | null
        }
        Relationships: []
      }
      quote_requests_supplier_view: {
        Row: {
          client_display_name: string | null
          client_reference: string | null
          created_at: string | null
          delivery_city: string | null
          id: string | null
          message: string | null
          partner_id: string | null
          product_id: string | null
          quantity: number | null
          status: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          client_display_name?: string | null
          client_reference?: string | null
          created_at?: string | null
          delivery_city?: string | null
          id?: string | null
          message?: string | null
          partner_id?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          client_display_name?: string | null
          client_reference?: string | null
          created_at?: string | null
          delivery_city?: string | null
          id?: string | null
          message?: string | null
          partner_id?: string | null
          product_id?: string | null
          quantity?: number | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "founding_partner_scores"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "quote_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _email_application_info_requested: {
        Args: {
          p_admin_message: string
          p_app_short: string
          p_company_name: string
          p_contact_name: string
          p_locale: string
        }
        Returns: Json
      }
      _email_order_delivered_client: {
        Args: {
          p_client_name: string
          p_locale: string
          p_order_short: string
          p_product_name: string
        }
        Returns: Json
      }
      _email_order_payment_instructions_client: {
        Args: {
          p_bank_name: string
          p_beneficiary: string
          p_bic: string
          p_client_name: string
          p_deposit_amount: number
          p_deposit_due_date?: string
          p_iban: string
          p_locale: string
          p_order_short: string
          p_payment_reference: string
          p_product_name: string
          p_total_amount: number
        }
        Returns: Json
      }
      _email_order_quote_accepted_partner: {
        Args: {
          p_locale: string
          p_order_short: string
          p_partner_name: string
          p_product_name: string
          p_quantity: number
          p_total_amount: number
        }
        Returns: Json
      }
      _email_pro_service_request_created: {
        Args: {
          p_client_name: string
          p_establishment: string
          p_locale: string
          p_project_type: string
          p_request_short: string
        }
        Returns: Json
      }
      _email_quote_assigned_partner: {
        Args: {
          p_locale: string
          p_partner_name: string
          p_product_name: string
        }
        Returns: Json
      }
      _email_quote_created_client: {
        Args: { p_locale: string; p_name: string; p_product_name: string }
        Returns: Json
      }
      _email_quote_replied_client: {
        Args: { p_locale: string; p_name: string; p_product_name: string }
        Returns: Json
      }
      approve_product_submission_as_new: {
        Args: {
          p_offers?: Json
          p_product: Json
          p_submission_id: string
          p_variants: Json
        }
        Returns: Json
      }
      create_admin_notification: {
        Args: {
          p_body?: string
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_body: string
          p_link?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_order_notification_to_client: {
        Args: {
          p_body?: string
          p_link?: string
          p_order_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_partner_notification_to_admins: {
        Args: {
          p_body?: string
          p_event_type: string
          p_link?: string
          p_partner_id: string
          p_title: string
        }
        Returns: number
      }
      create_quote_notification_to_admins: {
        Args: {
          p_body?: string
          p_link?: string
          p_quote_id: string
          p_title: string
          p_type: string
        }
        Returns: string[]
      }
      create_quote_notification_to_client: {
        Args: {
          p_body?: string
          p_link?: string
          p_quote_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_quote_notification_to_partner: {
        Args: {
          p_body?: string
          p_link?: string
          p_quote_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_self_notification: {
        Args: {
          p_body?: string
          p_link?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      delete_partner_cascade: { Args: { p_partner_id: string }; Returns: Json }
      delete_partner_cgv: { Args: { p_cgv_id: string }; Returns: Json }
      expire_overdue_quotes: { Args: never; Returns: number }
      format_currency_locale: {
        Args: { p_amount: number; p_locale: string }
        Returns: string
      }
      format_date_locale: {
        Args: { p_date: string; p_locale: string }
        Returns: string
      }
      founding_tier_to_rank: { Args: { p_tier: string }; Returns: number }
      fuzzy_search_products: {
        Args: {
          category_filter?: string
          lang?: string
          limit_count?: number
          search_query: string
        }
        Returns: {
          acoustic_nrc: number | null
          ambience_tags: string[] | null
          archetype_confidence: number | null
          archetype_id: string | null
          availability_type: string | null
          available_colors: string[] | null
          available_modules: Json | null
          brand_source: string | null
          built_in_umbrella_hole: boolean | null
          category: string
          chair_structure_type: string | null
          chlorine_resistance: boolean | null
          collection: string | null
          color_variants: Json | null
          combinable: boolean | null
          combined_capacity_if_joined: number | null
          country_of_manufacture: string | null
          created_at: string | null
          cushion_quick_dry: boolean | null
          cushion_replacement_available: boolean | null
          customizable: boolean | null
          data_quality_score: number | null
          default_seating_capacity: number | null
          dimension_variants: Json | null
          dimensions_height_cm: number | null
          dimensions_length_cm: number | null
          dimensions_width_cm: number | null
          dismountable: boolean | null
          documents: Json | null
          duplicate_of: string | null
          easy_maintenance: boolean | null
          environment_urls: string[] | null
          estimated_delivery_days: number | null
          extension_capability: boolean | null
          extension_max_length_cm: number | null
          fabric_certification: string | null
          fabric_g_m2: number | null
          fire_retardant: boolean | null
          footrest: boolean | null
          gallery_urls: string[] | null
          has_armrests: boolean | null
          heating_compatible: boolean | null
          id: string
          image_url: string | null
          indicative_price: string | null
          is_canonical_instance: boolean | null
          is_chr_heavy_use: boolean | null
          is_outdoor: boolean | null
          is_stackable: boolean | null
          is_tippable: boolean | null
          lightweight: boolean | null
          long_description: string | null
          long_description_es: string | null
          long_description_fr: string | null
          long_description_it: string | null
          main_color: string | null
          maintenance_info: string | null
          maintenance_info_es: string | null
          maintenance_info_fr: string | null
          maintenance_info_it: string | null
          material_seat: string | null
          material_structure: string | null
          material_tags: string[] | null
          min_base_weight_kg: number | null
          name: string
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          nesting_capacity: number | null
          outdoor_anchor_compatible: boolean | null
          outdoor_classification: string | null
          owner_brand_id: string | null
          palette_tags: string[] | null
          partner_id: string | null
          pole_diameter_mm: number | null
          popularity_score: number | null
          price_max: number | null
          price_min: number | null
          primary_designer: string | null
          priority_score: number | null
          product_family: string | null
          product_slug: string
          product_type_tags: Json | null
          publish_status: string | null
          recommended_seating_max: number | null
          recommended_seating_min: number | null
          requires_assembly: boolean | null
          salt_water_resistance: boolean | null
          sand_drainage: boolean | null
          seat_depth_cm: number | null
          seat_height_cm: number | null
          secondary_color: string | null
          short_description: string | null
          short_description_es: string | null
          short_description_fr: string | null
          short_description_it: string | null
          stock_quantity: number | null
          stock_status: string | null
          style_tags: string[] | null
          subcategory: string | null
          subdivision: string | null
          supplier_internal: string | null
          swivel: boolean | null
          table_shape: string | null
          table_top_height_cm: number | null
          technical_tags: string[] | null
          top_thickness_cm: number | null
          umbrella_hole_diameter_mm: number | null
          updated_at: string | null
          usage_mode: string | null
          use_case_tags: string[] | null
          uv_resistant: boolean | null
          warranty: string | null
          weather_resistant: boolean | null
          weight_kg: number | null
          wind_beaufort_max: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_partner_slug: { Args: { company: string }; Returns: string }
      get_partner_founding_tier: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      infer_email_locale: { Args: { p_country_code: string }; Returns: string }
      invoke_scheduled_tasks: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_brand_member: {
        Args: { check_brand_id: string; check_user_id: string }
        Returns: boolean
      }
      is_brand_owner: {
        Args: { check_brand_id: string; check_user_id: string }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: string }
      next_payment_reference: { Args: never; Returns: string }
      record_cgv_acceptance: {
        Args: {
          p_acceptance_type: string
          p_context: string
          p_context_reference_id?: string
          p_partner_cgv_id?: string
          p_terrassea_terms_id?: string
        }
        Returns: string
      }
      record_founding_action: {
        Args: {
          p_action_type: string
          p_meta?: Json
          p_partner_id: string
          p_reference_id?: string
        }
        Returns: string
      }
      render_transactional_email: {
        Args: {
          p_body: string
          p_cta_text?: string
          p_cta_url?: string
          p_locale: string
          p_title: string
        }
        Returns: string
      }
      request_partner_application_info: {
        Args: { p_admin_message: string; p_application_id: string }
        Returns: Json
      }
      reserve_preorder: {
        Args: {
          p_arrival_item_id: string
          p_product_id: string
          p_quantity: number
          p_user_id: string
        }
        Returns: undefined
      }
      run_reminder_notifications: { Args: never; Returns: undefined }
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
      send_transactional_email: {
        Args: {
          p_body_html: string
          p_body_text: string
          p_subject: string
          p_to: string
        }
        Returns: number
      }
      slugify: { Args: { input: string }; Returns: string }
      update_order_as_partner: {
        Args: {
          p_order_id: string
          p_shipping_carrier?: string
          p_status?: string
          p_tracking_number?: string
          p_tracking_url?: string
        }
        Returns: Json
      }
      update_own_profile: {
        Args: {
          p_company?: string
          p_country?: string
          p_country_code?: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_siren?: string
        }
        Returns: undefined
      }
      verify_partner_as_admin: {
        Args: {
          p_action: string
          p_email_html?: string
          p_email_subject?: string
          p_email_text?: string
          p_partner_id: string
          p_review_notes?: string
        }
        Returns: Json
      }
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
