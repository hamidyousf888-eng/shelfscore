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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          branding: Json
          business_hours: Json
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          default_tax_rate: number
          email: string | null
          id: string
          legal_name: string | null
          locale: string
          logo_url: string | null
          name: string
          numbering_settings: Json
          phone: string | null
          receipt_settings: Json
          slug: string
          status: string
          tax_inclusive_pricing: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branding?: Json
          business_hours?: Json
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_tax_rate?: number
          email?: string | null
          id?: string
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          name: string
          numbering_settings?: Json
          phone?: string | null
          receipt_settings?: Json
          slug: string
          status?: string
          tax_inclusive_pricing?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branding?: Json
          business_hours?: Json
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_tax_rate?: number
          email?: string | null
          id?: string
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          name?: string
          numbering_settings?: Json
          phone?: string | null
          receipt_settings?: Json
          slug?: string
          status?: string
          tax_inclusive_pricing?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role_id: string | null
          status: string
          store_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role_id?: string | null
          status?: string
          store_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role_id?: string | null
          status?: string
          store_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          register_id: string | null
          scope: string
          store_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          register_id?: string | null
          scope?: string
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          register_id?: string | null
          scope?: string
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_groups: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchise_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "franchise_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          pin_hash: string | null
          role_id: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          pin_hash?: string | null
          role_id: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pin_hash?: string | null
          role_id?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          severity: string
          store_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          store_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          store_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          description: string
          key: string
        }
        Insert: {
          category: string
          description: string
          key: string
        }
        Update: {
          category?: string
          description?: string
          key?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          base_price_cents: number
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          per_register_price_cents: number
          per_user_price_cents: number
          slug: string
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          base_price_cents?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          per_register_price_cents?: number
          per_user_price_cents?: number
          slug: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          per_register_price_cents?: number
          per_user_price_cents?: number
          slug?: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registers: {
        Row: {
          active_user_id: string | null
          code: string | null
          company_id: string
          created_at: string
          device_type: string
          hardware: Json
          id: string
          last_seen_at: string | null
          name: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          active_user_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          device_type?: string
          hardware?: Json
          id?: string
          last_seen_at?: string | null
          name: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          active_user_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          device_type?: string
          hardware?: Json
          id?: string
          last_seen_at?: string | null
          name?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          email: string | null
          franchise_group_id: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          settings: Json
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          franchise_group_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          settings?: Json
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          franchise_group_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          settings?: Json
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_franchise_group_id_fkey"
            columns: ["franchise_group_id"]
            isOneToOne: false
            referencedRelation: "franchise_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          currency: string
          due_at: string | null
          id: string
          issued_at: string
          line_items: Json
          number: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount_cents?: number
          company_id: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          issued_at?: string
          line_items?: Json
          number: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          issued_at?: string
          line_items?: Json
          number?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          alert_channels: string[]
          alert_lead_days: number
          billing_model: string
          cancelled_at: string | null
          company_id: string
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string
          custom_alert_enabled: boolean
          custom_alert_message: string | null
          expires_at: string | null
          fixed_alert_enabled: boolean
          grace_days: number
          id: string
          plan_id: string
          provider: string
          provider_ref: string | null
          register_count: number
          seats: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          alert_channels?: string[]
          alert_lead_days?: number
          billing_model?: string
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          custom_alert_enabled?: boolean
          custom_alert_message?: string | null
          expires_at?: string | null
          fixed_alert_enabled?: boolean
          grace_days?: number
          id?: string
          plan_id: string
          provider?: string
          provider_ref?: string | null
          register_count?: number
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          alert_channels?: string[]
          alert_lead_days?: number
          billing_model?: string
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          custom_alert_enabled?: boolean
          custom_alert_message?: string | null
          expires_at?: string | null
          fixed_alert_enabled?: boolean
          grace_days?: number
          id?: string
          plan_id?: string
          provider?: string
          provider_ref?: string | null
          register_count?: number
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_meters: {
        Row: {
          company_id: string
          id: string
          metric: string
          period_start: string
          recorded_at: string
          value: number
        }
        Insert: {
          company_id: string
          id?: string
          metric: string
          period_start?: string
          recorded_at?: string
          value?: number
        }
        Update: {
          company_id?: string
          id?: string
          metric?: string
          period_start?: string
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_meters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _company: string; _permission: string; _uid?: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company: string; _uid?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _uid?: string }; Returns: boolean }
      provision_company_roles: {
        Args: { _company: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
