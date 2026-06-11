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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          id: string
          memo: string | null
          name: string
          phone: string
          shop_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          phone: string
          shop_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          phone?: string
          shop_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          cost_krw: number | null
          created_at: string
          customer_id: string | null
          error_msg: string | null
          id: string
          reservation_id: string | null
          sent_at: string | null
          shop_id: string
          status: Database["public"]["Enums"]["notification_status"]
          template_code: string
        }
        Insert: {
          cost_krw?: number | null
          created_at?: string
          customer_id?: string | null
          error_msg?: string | null
          id?: string
          reservation_id?: string | null
          sent_at?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_code: string
        }
        Update: {
          cost_krw?: number | null
          created_at?: string
          customer_id?: string | null
          error_msg?: string | null
          id?: string
          reservation_id?: string | null
          sent_at?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_logs: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          memo: string | null
          pass_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          memo?: string | null
          pass_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          memo?: string | null
          pass_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pass_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_logs_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      passes: {
        Row: {
          balance: number | null
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          name: string
          remaining: number | null
          shop_id: string
          total_amount: number | null
          total_count: number | null
          type: Database["public"]["Enums"]["pass_type"]
        }
        Insert: {
          balance?: number | null
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          name: string
          remaining?: number | null
          shop_id: string
          total_amount?: number | null
          total_count?: number | null
          type: Database["public"]["Enums"]["pass_type"]
        }
        Update: {
          balance?: number | null
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          name?: string
          remaining?: number | null
          shop_id?: string
          total_amount?: number | null
          total_count?: number | null
          type?: Database["public"]["Enums"]["pass_type"]
        }
        Relationships: [
          {
            foreignKeyName: "passes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          pass_id: string | null
          shop_id: string
          visit_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          pass_id?: string | null
          shop_id: string
          visit_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          pass_id?: string | null
          shop_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          breed: string | null
          caution_memo: string | null
          caution_tags: string[]
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          name: string
          neutered: boolean | null
          photo_url: string | null
          shop_id: string
          size: Database["public"]["Enums"]["pet_size"] | null
          vaccinated: boolean | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          caution_memo?: string | null
          caution_tags?: string[]
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          name: string
          neutered?: boolean | null
          photo_url?: string | null
          shop_id: string
          size?: Database["public"]["Enums"]["pet_size"] | null
          vaccinated?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          caution_memo?: string | null
          caution_tags?: string[]
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          name?: string
          neutered?: boolean | null
          photo_url?: string | null
          shop_id?: string
          size?: Database["public"]["Enums"]["pet_size"] | null
          vaccinated?: boolean | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          memo: string | null
          pet_id: string
          price_quoted: number | null
          service_id: string
          shop_id: string
          staff_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          memo?: string | null
          pet_id: string
          price_quoted?: number | null
          service_id: string
          shop_id: string
          staff_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          memo?: string | null
          pet_id?: string
          price_quoted?: number | null
          service_id?: string
          shop_id?: string
          staff_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_contacts: {
        Row: {
          contacted_at: string
          created_at: string
          id: string
          pet_id: string
          staff_id: string | null
        }
        Insert: {
          contacted_at?: string
          created_at?: string
          id?: string
          pet_id: string
          staff_id?: string | null
        }
        Update: {
          contacted_at?: string
          created_at?: string
          id?: string
          pet_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retention_contacts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_contacts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: Json
          recommend_cycle_weeks: number | null
          shop_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: Json
          recommend_cycle_weeks?: number | null
          shop_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: Json
          recommend_cycle_weeks?: number | null
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          brand_color: string | null
          created_at: string
          default_cycle_weeks: number
          id: string
          logo_url: string | null
          name: string
          open_hours: Json
          phone: string | null
          slot_minutes: number
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          created_at?: string
          default_cycle_weeks?: number
          id?: string
          logo_url?: string | null
          name: string
          open_hours?: Json
          phone?: string | null
          slot_minutes?: number
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          created_at?: string
          default_cycle_weeks?: number
          id?: string
          logo_url?: string | null
          name?: string
          open_hours?: Json
          phone?: string | null
          slot_minutes?: number
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["staff_role"]
          shop_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["staff_role"]
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          after_photos: string[]
          before_photos: string[]
          behavior_memo: string | null
          created_at: string
          id: string
          pet_id: string
          price_final: number | null
          reservation_id: string | null
          service_id: string | null
          shop_id: string
          style_memo: string | null
          visited_at: string
        }
        Insert: {
          after_photos?: string[]
          before_photos?: string[]
          behavior_memo?: string | null
          created_at?: string
          id?: string
          pet_id: string
          price_final?: number | null
          reservation_id?: string | null
          service_id?: string | null
          shop_id: string
          style_memo?: string | null
          visited_at?: string
        }
        Update: {
          after_photos?: string[]
          before_photos?: string[]
          behavior_memo?: string | null
          created_at?: string
          id?: string
          pet_id?: string
          price_final?: number | null
          reservation_id?: string | null
          service_id?: string | null
          shop_id?: string
          style_memo?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_shop_with_owner: {
        Args: { owner_name: string; shop_name: string }
        Returns: string
      }
      deduct_pass_amount: {
        Args: { p_amount: number; p_pass_id: string; p_visit_id: string }
        Returns: undefined
      }
      deduct_pass_count: {
        Args: { p_pass_id: string; p_visit_id: string }
        Returns: undefined
      }
      my_shop_id: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      notification_status: "pending" | "sent" | "failed"
      pass_type: "amount" | "count"
      payment_method: "cash" | "card" | "transfer" | "pass"
      pet_size: "small" | "medium" | "large"
      reservation_status: "confirmed" | "completed" | "no_show" | "cancelled"
      staff_role: "owner" | "staff"
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
      notification_status: ["pending", "sent", "failed"],
      pass_type: ["amount", "count"],
      payment_method: ["cash", "card", "transfer", "pass"],
      pet_size: ["small", "medium", "large"],
      reservation_status: ["confirmed", "completed", "no_show", "cancelled"],
      staff_role: ["owner", "staff"],
    },
  },
} as const
