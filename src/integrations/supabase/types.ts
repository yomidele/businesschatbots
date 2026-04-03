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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          application_deadline: string
          applications_locked: boolean | null
          id: string
          result_release_date: string | null
          selection_scheduled: string | null
          updated_at: string | null
        }
        Insert: {
          application_deadline: string
          applications_locked?: boolean | null
          id?: string
          result_release_date?: string | null
          selection_scheduled?: string | null
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string
          applications_locked?: boolean | null
          id?: string
          result_release_date?: string | null
          selection_scheduled?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          admission_round: number | null
          admission_type: Database["public"]["Enums"]["admission_type"]
          date_of_birth: string
          email: string
          full_name: string
          gpa: number
          id: string
          matriculation_number: string | null
          nin: string
          passport_photo_url: string | null
          phone: string
          program_id: string
          rank: number | null
          scholarship_status: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          submitted_at: string | null
          test_score: number
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          admission_round?: number | null
          admission_type?: Database["public"]["Enums"]["admission_type"]
          date_of_birth: string
          email: string
          full_name: string
          gpa: number
          id?: string
          matriculation_number?: string | null
          nin: string
          passport_photo_url?: string | null
          phone: string
          program_id: string
          rank?: number | null
          scholarship_status?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          submitted_at?: string | null
          test_score: number
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          admission_round?: number | null
          admission_type?: Database["public"]["Enums"]["admission_type"]
          date_of_birth?: string
          email?: string
          full_name?: string
          gpa?: number
          id?: string
          matriculation_number?: string | null
          nin?: string
          passport_photo_url?: string | null
          phone?: string
          program_id?: string
          rank?: number | null
          scholarship_status?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          submitted_at?: string | null
          test_score?: number
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculation_sequences: {
        Row: {
          current_sequence: number | null
          id: string
          program_id: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          current_sequence?: number | null
          id?: string
          program_id: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          current_sequence?: number | null
          id?: string
          program_id?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculation_sequences_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          code: string
          created_at: string | null
          cutoff: number
          description: string | null
          id: string
          name: string
          slots: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          cutoff?: number
          description?: string | null
          id?: string
          name: string
          slots?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          cutoff?: number
          description?: string | null
          id?: string
          name?: string
          slots?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      selection_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          cutoffs_used: Json | null
          executed_at: string | null
          id: string
          rounds: Json | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cutoffs_used?: Json | null
          executed_at?: string | null
          id?: string
          rounds?: Json | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cutoffs_used?: Json | null
          executed_at?: string | null
          id?: string
          rounds?: Json | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_matriculation_number: {
        Args: { p_program_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admission_type: "regular" | "early_decision" | "transfer"
      app_role: "admin" | "super_admin"
      application_status:
        | "submitted"
        | "under_review"
        | "selection_pending"
        | "admitted"
        | "waitlisted"
        | "rejected"
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
      admission_type: ["regular", "early_decision", "transfer"],
      app_role: ["admin", "super_admin"],
      application_status: [
        "submitted",
        "under_review",
        "selection_pending",
        "admitted",
        "waitlisted",
        "rejected",
      ],
    },
  },
} as const
