// 임시 타입 — `supabase gen types typescript`로 교체 예정
export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          open_hours: Record<string, unknown>;
          slot_minutes: number;
          logo_url: string | null;
          brand_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          open_hours?: Record<string, unknown>;
          slot_minutes?: number;
          logo_url?: string | null;
          brand_color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          open_hours?: Record<string, unknown>;
          slot_minutes?: number;
          logo_url?: string | null;
          brand_color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          role: "owner" | "staff";
          created_at: string;
        };
        Insert: {
          id: string;
          shop_id: string;
          name: string;
          role?: "owner" | "staff";
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          role?: "owner" | "staff";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          phone: string;
          memo: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          phone: string;
          memo?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          phone?: string;
          memo?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      pets: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          name: string;
          breed: string | null;
          size: "small" | "medium" | "large" | null;
          birth_date: string | null;
          weight_kg: number | null;
          photo_url: string | null;
          caution_tags: string[];
          caution_memo: string | null;
          vaccinated: boolean | null;
          neutered: boolean | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          customer_id: string;
          name: string;
          breed?: string | null;
          size?: "small" | "medium" | "large" | null;
          birth_date?: string | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          caution_tags?: string[];
          caution_memo?: string | null;
          vaccinated?: boolean | null;
          neutered?: boolean | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          customer_id?: string;
          name?: string;
          breed?: string | null;
          size?: "small" | "medium" | "large" | null;
          birth_date?: string | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          caution_tags?: string[];
          caution_memo?: string | null;
          vaccinated?: boolean | null;
          neutered?: boolean | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pets_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          duration_minutes: number;
          price: Record<string, unknown>;
          recommend_cycle_weeks: number | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          duration_minutes?: number;
          price?: Record<string, unknown>;
          recommend_cycle_weeks?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          duration_minutes?: number;
          price?: Record<string, unknown>;
          recommend_cycle_weeks?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          shop_id: string;
          pet_id: string;
          service_id: string;
          staff_id: string | null;
          starts_at: string;
          ends_at: string;
          status: "confirmed" | "completed" | "no_show" | "cancelled";
          price_quoted: number | null;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          pet_id: string;
          service_id: string;
          staff_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: "confirmed" | "completed" | "no_show" | "cancelled";
          price_quoted?: number | null;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          pet_id?: string;
          service_id?: string;
          staff_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: "confirmed" | "completed" | "no_show" | "cancelled";
          price_quoted?: number | null;
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      visits: {
        Row: {
          id: string;
          shop_id: string;
          pet_id: string;
          reservation_id: string | null;
          service_id: string | null;
          visited_at: string;
          before_photos: string[];
          after_photos: string[];
          style_memo: string | null;
          behavior_memo: string | null;
          price_final: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          pet_id: string;
          reservation_id?: string | null;
          service_id?: string | null;
          visited_at?: string;
          before_photos?: string[];
          after_photos?: string[];
          style_memo?: string | null;
          behavior_memo?: string | null;
          price_final?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          pet_id?: string;
          reservation_id?: string | null;
          service_id?: string | null;
          visited_at?: string;
          before_photos?: string[];
          after_photos?: string[];
          style_memo?: string | null;
          behavior_memo?: string | null;
          price_final?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "visits_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      passes: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string;
          type: "amount" | "count";
          name: string;
          total_amount: number | null;
          balance: number | null;
          total_count: number | null;
          remaining: number | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          customer_id: string;
          type: "amount" | "count";
          name: string;
          total_amount?: number | null;
          balance?: number | null;
          total_count?: number | null;
          remaining?: number | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          customer_id?: string;
          type?: "amount" | "count";
          name?: string;
          total_amount?: number | null;
          balance?: number | null;
          total_count?: number | null;
          remaining?: number | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "passes_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "passes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      pass_logs: {
        Row: {
          id: string;
          pass_id: string;
          visit_id: string | null;
          delta: number;
          memo: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pass_id: string;
          visit_id?: string | null;
          delta: number;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pass_id?: string;
          visit_id?: string | null;
          delta?: number;
          memo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pass_logs_pass_id_fkey";
            columns: ["pass_id"];
            isOneToOne: false;
            referencedRelation: "passes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pass_logs_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pass_logs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          shop_id: string;
          visit_id: string;
          method: "cash" | "card" | "transfer" | "pass";
          amount: number;
          pass_id: string | null;
          paid_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          visit_id: string;
          method: "cash" | "card" | "transfer" | "pass";
          amount: number;
          pass_id?: string | null;
          paid_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          visit_id?: string;
          method?: "cash" | "card" | "transfer" | "pass";
          amount?: number;
          pass_id?: string | null;
          paid_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_pass_id_fkey";
            columns: ["pass_id"];
            isOneToOne: false;
            referencedRelation: "passes";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          shop_id: string;
          customer_id: string | null;
          reservation_id: string | null;
          template_code: string;
          status: "pending" | "sent" | "failed";
          cost_krw: number | null;
          sent_at: string | null;
          error_msg: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          customer_id?: string | null;
          reservation_id?: string | null;
          template_code: string;
          status?: "pending" | "sent" | "failed";
          cost_krw?: number | null;
          sent_at?: string | null;
          error_msg?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          customer_id?: string | null;
          reservation_id?: string | null;
          template_code?: string;
          status?: "pending" | "sent" | "failed";
          cost_krw?: number | null;
          sent_at?: string | null;
          error_msg?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_shop_with_owner: {
        Args: { shop_name: string; owner_name: string };
        Returns: string;
      };
      my_shop_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      reservation_status: "confirmed" | "completed" | "no_show" | "cancelled";
      pet_size: "small" | "medium" | "large";
      payment_method: "cash" | "card" | "transfer" | "pass";
      pass_type: "amount" | "count";
      notification_status: "pending" | "sent" | "failed";
      staff_role: "owner" | "staff";
    };
    CompositeTypes: Record<string, never>;
  };
};
