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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_extractions: {
        Row: {
          applied_to_id: string | null
          applied_to_table: string | null
          confidence: number | null
          created_at: string
          extracted_data: Json
          extraction_type: string
          id: string
          message_id: string | null
          model: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["extraction_status"]
        }
        Insert: {
          applied_to_id?: string | null
          applied_to_table?: string | null
          confidence?: number | null
          created_at?: string
          extracted_data: Json
          extraction_type: string
          id?: string
          message_id?: string | null
          model: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Update: {
          applied_to_id?: string | null
          applied_to_table?: string | null
          confidence?: number | null
          created_at?: string
          extracted_data?: Json
          extraction_type?: string
          id?: string
          message_id?: string | null
          model?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extractions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_extractions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: string | null
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          source: string
          storage_bucket: string
          visit_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source?: string
          storage_bucket: string
          visit_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          source?: string
          storage_bucket?: string
          visit_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_whatsapp_message_id_fkey"
            columns: ["whatsapp_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_contacts: {
        Row: {
          created_at: string
          dealer_id: string
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_contacts_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_distributors: {
        Row: {
          created_at: string
          dealer_id: string
          distributor_id: string
          end_date: string | null
          id: string
          is_current: boolean
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          distributor_id: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          distributor_id?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_distributors_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_distributors_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_statuses: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      dealers: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone_number: string | null
          pincode: string | null
          primary_salesman_id: string | null
          state: string | null
          status_key: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone_number?: string | null
          pincode?: string | null
          primary_salesman_id?: string | null
          state?: string | null
          status_key?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone_number?: string | null
          pincode?: string | null
          primary_salesman_id?: string | null
          state?: string | null
          status_key?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealers_primary_salesman_id_fkey"
            columns: ["primary_salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealers_status_key_fkey"
            columns: ["status_key"]
            isOneToOne: false
            referencedRelation: "dealer_statuses"
            referencedColumns: ["key"]
          },
        ]
      }
      distributors: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      followups: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          created_from_visit_id: string | null
          dealer_id: string
          description: string
          due_date: string
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          salesman_id: string
          status: Database["public"]["Enums"]["followup_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          created_from_visit_id?: string | null
          dealer_id: string
          description: string
          due_date: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          salesman_id: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          created_from_visit_id?: string | null
          dealer_id?: string
          description?: string
          due_date?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          salesman_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_created_from_visit_id_fkey"
            columns: ["created_from_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: string
          estimated_quantity: number | null
          estimated_value: number | null
          expected_closing_date: string | null
          id: string
          interest_level: Database["public"]["Enums"]["interest_level"] | null
          notes: string | null
          probability: number | null
          product_id: string | null
          salesman_id: string
          source_visit_id: string | null
          stage_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id: string
          estimated_quantity?: number | null
          estimated_value?: number | null
          expected_closing_date?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          notes?: string | null
          probability?: number | null
          product_id?: string | null
          salesman_id: string
          source_visit_id?: string | null
          stage_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: string
          estimated_quantity?: number | null
          estimated_value?: number | null
          expected_closing_date?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          notes?: string | null
          probability?: number | null
          product_id?: string | null
          salesman_id?: string
          source_visit_id?: string | null
          stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_visit_id_fkey"
            columns: ["source_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_key_fkey"
            columns: ["stage_key"]
            isOneToOne: false
            referencedRelation: "opportunity_stages"
            referencedColumns: ["key"]
          },
        ]
      }
      opportunity_stages: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      salesmen: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salesmen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      visit_products: {
        Row: {
          created_at: string
          id: string
          interest_level: Database["public"]["Enums"]["interest_level"] | null
          notes: string | null
          product_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          notes?: string | null
          product_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          notes?: string | null
          product_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_products_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          ai_summary: string | null
          created_at: string
          created_by: string | null
          dealer_id: string
          id: string
          latitude: number | null
          location_source: Database["public"]["Enums"]["location_source"] | null
          longitude: number | null
          notes: string | null
          salesman_id: string
          updated_at: string
          visit_date: string
          whatsapp_session_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id: string
          id?: string
          latitude?: number | null
          location_source?:
            | Database["public"]["Enums"]["location_source"]
            | null
          longitude?: number | null
          notes?: string | null
          salesman_id: string
          updated_at?: string
          visit_date?: string
          whatsapp_session_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: string
          id?: string
          latitude?: number | null
          location_source?:
            | Database["public"]["Enums"]["location_source"]
            | null
          longitude?: number | null
          notes?: string | null
          salesman_id?: string
          updated_at?: string
          visit_date?: string
          whatsapp_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_whatsapp_session_id_fkey"
            columns: ["whatsapp_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          caption: string | null
          channel_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id: string
          file_name: string | null
          file_path: string | null
          id: string
          item_type: string
          message_timestamp: string
          processing_error: string | null
          processing_status: Database["public"]["Enums"]["message_processing_status"]
          raw_payload: Json
          receiver_number: string
          salesman_id: string | null
          sender_number: string
          session_id: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          caption?: string | null
          channel_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_message_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          item_type: string
          message_timestamp: string
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["message_processing_status"]
          raw_payload: Json
          receiver_number: string
          salesman_id?: string | null
          sender_number: string
          session_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          caption?: string | null
          channel_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          external_message_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          item_type?: string
          message_timestamp?: string
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["message_processing_status"]
          raw_payload?: Json
          receiver_number?: string
          salesman_id?: string | null
          sender_number?: string
          session_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          salesman_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["whatsapp_session_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          salesman_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["whatsapp_session_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          salesman_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["whatsapp_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_salesman_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      actor_type: "user" | "system" | "ai"
      extraction_status: "pending" | "applied" | "rejected" | "needs_review"
      followup_status: "pending" | "completed" | "cancelled"
      interest_level: "low" | "medium" | "high"
      location_source:
        | "whatsapp_location"
        | "browser_location"
        | "manual"
        | "geocoded"
      message_direction: "inbound" | "outbound"
      message_processing_status:
        | "received"
        | "processing"
        | "processed"
        | "failed"
        | "ignored"
      priority_level: "low" | "medium" | "high"
      user_role: "admin" | "manager" | "salesman"
      whatsapp_session_status: "open" | "closed"
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
      actor_type: ["user", "system", "ai"],
      extraction_status: ["pending", "applied", "rejected", "needs_review"],
      followup_status: ["pending", "completed", "cancelled"],
      interest_level: ["low", "medium", "high"],
      location_source: [
        "whatsapp_location",
        "browser_location",
        "manual",
        "geocoded",
      ],
      message_direction: ["inbound", "outbound"],
      message_processing_status: [
        "received",
        "processing",
        "processed",
        "failed",
        "ignored",
      ],
      priority_level: ["low", "medium", "high"],
      user_role: ["admin", "manager", "salesman"],
      whatsapp_session_status: ["open", "closed"],
    },
  },
} as const
