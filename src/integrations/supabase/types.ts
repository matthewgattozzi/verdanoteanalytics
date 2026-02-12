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
      ad_accounts: {
        Row: {
          created_at: string
          creative_count: number
          date_range_days: number
          id: string
          is_active: boolean
          iteration_spend_threshold: number
          last_synced_at: string | null
          name: string
          untagged_count: number
          updated_at: string
          winner_roas_threshold: number
        }
        Insert: {
          created_at?: string
          creative_count?: number
          date_range_days?: number
          id: string
          is_active?: boolean
          iteration_spend_threshold?: number
          last_synced_at?: string | null
          name: string
          untagged_count?: number
          updated_at?: string
          winner_roas_threshold?: number
        }
        Update: {
          created_at?: string
          creative_count?: number
          date_range_days?: number
          id?: string
          is_active?: boolean
          iteration_spend_threshold?: number
          last_synced_at?: string | null
          name?: string
          untagged_count?: number
          updated_at?: string
          winner_roas_threshold?: number
        }
        Relationships: []
      }
      creatives: {
        Row: {
          account_id: string
          ad_id: string
          ad_name: string
          ad_status: string | null
          ad_type: string | null
          adset_name: string | null
          ai_analysis: string | null
          ai_cta_notes: string | null
          ai_hook_analysis: string | null
          ai_visual_notes: string | null
          analysis_status: string | null
          analyzed_at: string | null
          campaign_name: string | null
          clicks: number | null
          cpa: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          hold_rate: number | null
          hook: string | null
          impressions: number | null
          person: string | null
          preview_url: string | null
          product: string | null
          purchase_value: number | null
          purchases: number | null
          roas: number | null
          spend: number | null
          style: string | null
          tag_source: string
          theme: string | null
          thumb_stop_rate: number | null
          thumbnail_url: string | null
          unique_code: string | null
          updated_at: string
          video_views: number | null
        }
        Insert: {
          account_id: string
          ad_id: string
          ad_name: string
          ad_status?: string | null
          ad_type?: string | null
          adset_name?: string | null
          ai_analysis?: string | null
          ai_cta_notes?: string | null
          ai_hook_analysis?: string | null
          ai_visual_notes?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          campaign_name?: string | null
          clicks?: number | null
          cpa?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          hold_rate?: number | null
          hook?: string | null
          impressions?: number | null
          person?: string | null
          preview_url?: string | null
          product?: string | null
          purchase_value?: number | null
          purchases?: number | null
          roas?: number | null
          spend?: number | null
          style?: string | null
          tag_source?: string
          theme?: string | null
          thumb_stop_rate?: number | null
          thumbnail_url?: string | null
          unique_code?: string | null
          updated_at?: string
          video_views?: number | null
        }
        Update: {
          account_id?: string
          ad_id?: string
          ad_name?: string
          ad_status?: string | null
          ad_type?: string | null
          adset_name?: string | null
          ai_analysis?: string | null
          ai_cta_notes?: string | null
          ai_hook_analysis?: string | null
          ai_visual_notes?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          campaign_name?: string | null
          clicks?: number | null
          cpa?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          hold_rate?: number | null
          hook?: string | null
          impressions?: number | null
          person?: string | null
          preview_url?: string | null
          product?: string | null
          purchase_value?: number | null
          purchases?: number | null
          roas?: number | null
          spend?: number | null
          style?: string | null
          tag_source?: string
          theme?: string | null
          thumb_stop_rate?: number | null
          thumbnail_url?: string | null
          unique_code?: string | null
          updated_at?: string
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      name_mappings: {
        Row: {
          account_id: string
          ad_type: string | null
          created_at: string
          hook: string | null
          id: string
          person: string | null
          product: string | null
          style: string | null
          theme: string | null
          unique_code: string
          updated_at: string
        }
        Insert: {
          account_id: string
          ad_type?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          person?: string | null
          product?: string | null
          style?: string | null
          theme?: string | null
          unique_code: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          ad_type?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          person?: string | null
          product?: string | null
          style?: string | null
          theme?: string | null
          unique_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          account_id: string | null
          average_cpa: number | null
          average_ctr: number | null
          blended_roas: number | null
          bottom_performers: string | null
          created_at: string
          creative_count: number | null
          date_range_days: number | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          report_name: string
          tags_csv_count: number | null
          tags_manual_count: number | null
          tags_parsed_count: number | null
          tags_untagged_count: number | null
          top_performers: string | null
          total_spend: number | null
          win_rate: number | null
          win_rate_bof: number | null
          win_rate_mof: number | null
          win_rate_tof: number | null
        }
        Insert: {
          account_id?: string | null
          average_cpa?: number | null
          average_ctr?: number | null
          blended_roas?: number | null
          bottom_performers?: string | null
          created_at?: string
          creative_count?: number | null
          date_range_days?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_name: string
          tags_csv_count?: number | null
          tags_manual_count?: number | null
          tags_parsed_count?: number | null
          tags_untagged_count?: number | null
          top_performers?: string | null
          total_spend?: number | null
          win_rate?: number | null
          win_rate_bof?: number | null
          win_rate_mof?: number | null
          win_rate_tof?: number | null
        }
        Update: {
          account_id?: string | null
          average_cpa?: number | null
          average_ctr?: number | null
          blended_roas?: number | null
          bottom_performers?: string | null
          created_at?: string
          creative_count?: number | null
          date_range_days?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_name?: string
          tags_csv_count?: number | null
          tags_manual_count?: number | null
          tags_parsed_count?: number | null
          tags_untagged_count?: number | null
          top_performers?: string | null
          total_spend?: number | null
          win_rate?: number | null
          win_rate_bof?: number | null
          win_rate_mof?: number | null
          win_rate_tof?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          account_id: string
          api_errors: string | null
          completed_at: string | null
          creatives_fetched: number | null
          creatives_upserted: number | null
          date_range_end: string | null
          date_range_start: string | null
          duration_ms: number | null
          id: number
          meta_api_calls: number | null
          started_at: string
          status: string
          sync_type: string
          tags_csv_matched: number | null
          tags_manual_preserved: number | null
          tags_parsed: number | null
          tags_untagged: number | null
        }
        Insert: {
          account_id: string
          api_errors?: string | null
          completed_at?: string | null
          creatives_fetched?: number | null
          creatives_upserted?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          duration_ms?: number | null
          id?: never
          meta_api_calls?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          tags_csv_matched?: number | null
          tags_manual_preserved?: number | null
          tags_parsed?: number | null
          tags_untagged?: number | null
        }
        Update: {
          account_id?: string
          api_errors?: string | null
          completed_at?: string | null
          creatives_fetched?: number | null
          creatives_upserted?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          duration_ms?: number | null
          id?: never
          meta_api_calls?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          tags_csv_matched?: number | null
          tags_manual_preserved?: number | null
          tags_parsed?: number | null
          tags_untagged?: number | null
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
