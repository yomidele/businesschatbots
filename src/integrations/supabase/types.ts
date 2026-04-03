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
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_active_at: string | null
          site_id: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          site_id: string
          updated_at?: string
          visitor_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string | null
          site_id?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          search_vector: unknown
          site_id: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          search_vector?: unknown
          site_id: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          site_id?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          business_name: string | null
          created_at: string
          cta_type: string
          description: string | null
          html_content: string
          id: string
          is_published: boolean | null
          products_used: Json | null
          site_id: string
          theme: string
          title: string
          updated_at: string
          url_slug: string | null
          view_count: number | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          cta_type?: string
          description?: string | null
          html_content: string
          id: string
          is_published?: boolean | null
          products_used?: Json | null
          site_id: string
          theme?: string
          title: string
          updated_at?: string
          url_slug?: string | null
          view_count?: number | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          cta_type?: string
          description?: string | null
          html_content?: string
          id?: string
          is_published?: boolean | null
          products_used?: Json | null
          site_id?: string
          theme?: string
          title?: string
          updated_at?: string
          url_slug?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_config: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          instructions: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          instructions?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          instructions?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_config_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          conversation_id: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          payment_reference: string | null
          payment_status: string
          product_id: string | null
          quantity: number
          site_id: string
          total_amount: number
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          site_id: string
          total_amount: number
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          product_id?: string | null
          quantity?: number
          site_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          provider: string
          public_key: string
          secret_key: string
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          public_key: string
          secret_key: string
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          public_key?: string
          secret_key?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_configs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          created_at: string
          customer_email: string
          id: string
          order_id: string
          proof_notes: string | null
          proof_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          id?: string
          order_id: string
          proof_notes?: string | null
          proof_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          id?: string
          order_id?: string
          proof_notes?: string | null
          proof_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string | null
          link: string
          site_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          label?: string | null
          link: string
          site_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string | null
          link?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          site_id: string
          stock: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          site_id: string
          stock?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          site_id?: string
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          ai_model: string
          ai_provider: string
          chat_mode: string | null
          created_at: string
          currency: string
          id: string
          industry: string
          last_crawled_at: string | null
          name: string
          pages_crawled: number
          show_chat_on_landing_page: boolean | null
          show_products_on_landing: boolean | null
          slug: string | null
          status: string
          updated_at: string
          url: string
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          ai_model?: string
          ai_provider?: string
          chat_mode?: string | null
          created_at?: string
          currency?: string
          id?: string
          industry?: string
          last_crawled_at?: string | null
          name: string
          pages_crawled?: number
          show_chat_on_landing_page?: boolean | null
          show_products_on_landing?: boolean | null
          slug?: string | null
          status?: string
          updated_at?: string
          url: string
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          chat_mode?: string | null
          created_at?: string
          currency?: string
          id?: string
          industry?: string
          last_crawled_at?: string | null
          name?: string
          pages_crawled?: number
          show_chat_on_landing_page?: boolean | null
          show_products_on_landing?: boolean | null
          slug?: string | null
          status?: string
          updated_at?: string
          url?: string
          user_id?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_knowledge: {
        Args: { p_limit?: number; p_query: string; p_site_id: string }
        Returns: {
          category: string
          content: string
          id: string
          rank: number
          source_url: string
          title: string
        }[]
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
