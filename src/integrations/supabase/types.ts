export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      review_analyses: {
        Row: {
          ai_sentiment: string | null
          ai_summary: string | null
          ai_tags: string[] | null
          confidence_score: number | null
          created_at: string
          id: string
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_tags?: string[] | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_analyses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          ai_sentiment: string | null
          ai_tags: string[] | null
          author_name: string
          created_at: string
          google_review_id: string
          id: string
          location_id: string
          rating: number
          reply_date: string | null
          reply_text: string | null
          review_date: string
          text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_sentiment?: string | null
          ai_tags?: string[] | null
          author_name: string
          created_at?: string
          google_review_id: string
          id?: string
          location_id: string
          rating: number
          reply_date?: string | null
          reply_text?: string | null
          review_date: string
          text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_sentiment?: string | null
          ai_tags?: string[] | null
          author_name?: string
          created_at?: string
          google_review_id?: string
          id?: string
          location_id?: string
          rating?: number
          reply_date?: string | null
          reply_text?: string | null
          review_date?: string
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_reviews: {
        Row: {
          ai_analyzed_at: string | null
          ai_issues: string[] | null
          ai_sentiment: string | null
          ai_suggestions: string[] | null
          ai_tags: string[] | null
          author_name: string
          created_at: string | null
          google_review_id: string
          id: string
          location_id: string
          rating: number
          reply_date: string | null
          reply_text: string | null
          review_date: string
          text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_issues?: string[] | null
          ai_sentiment?: string | null
          ai_suggestions?: string[] | null
          ai_tags?: string[] | null
          author_name: string
          created_at?: string | null
          google_review_id: string
          id?: string
          location_id: string
          rating: number
          reply_date?: string | null
          reply_text?: string | null
          review_date: string
          text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_issues?: string[] | null
          ai_sentiment?: string | null
          ai_suggestions?: string[] | null
          ai_tags?: string[] | null
          author_name?: string
          created_at?: string | null
          google_review_id?: string
          id?: string
          location_id?: string
          rating?: number
          reply_date?: string | null
          reply_text?: string | null
          review_date?: string
          text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          id: string
          plan_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_selected_locations: {
        Row: {
          created_at: string
          google_place_id: string
          id: string
          location_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_place_id: string
          id?: string
          location_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_place_id?: string
          id?: string
          location_name?: string
          updated_at?: string
          user_id?: string
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
