export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          id: string
          name: string
          subscriber_count: number | null
          url: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          subscriber_count?: number | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subscriber_count?: number | null
          url?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          content_type: string
          created_at: string
          id: string
          published_at: string
          search_vector: unknown | null
          source_id: string | null
          title: string
          transcript: string
          unique_identifier: string
          url: string
        }
        Insert: {
          content_type: string
          created_at?: string
          id: string
          published_at: string
          search_vector?: unknown | null
          source_id?: string | null
          title: string
          transcript: string
          unique_identifier: string
          url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          published_at?: string
          search_vector?: unknown | null
          source_id?: string | null
          title?: string
          transcript?: string
          unique_identifier?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      content_questions: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          question: string
          response: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          question: string
          response?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          question?: string
          response?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          content_id: string
          tag_id: string
        }
        Insert: {
          content_id: string
          tag_id: string
        }
        Update: {
          content_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          status: string | null
          task_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string | null
          task_name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string | null
          task_name?: string
        }
        Relationships: []
      }
      daily_digest: {
        Row: {
          created_at: string
          digest_content: Json | null
          email_sent: boolean | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          digest_content?: Json | null
          email_sent?: boolean | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          digest_content?: Json | null
          email_sent?: boolean | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_digest_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      rss_feeds: {
        Row: {
          created_at: string
          feed_type: Database["public"]["Enums"]["feed_type"]
          feed_url: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          feed_type: Database["public"]["Enums"]["feed_type"]
          feed_url: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          feed_type?: Database["public"]["Enums"]["feed_type"]
          feed_url?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription_id: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          subscription_id: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          subscription_id?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          summary: string
          summary_type: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          summary: string
          summary_type: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          summary?: string
          summary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_summary_history: {
        Row: {
          content_id: string | null
          generated_at: string
          id: string
          summary_id: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          generated_at?: string
          id?: string
          summary_id?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          generated_at?: string
          id?: string
          summary_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_summary_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_summary_history_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_summary_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          channel_id: string
          user_id: string
          vote_time: string
          vote_type: number | null
        }
        Insert: {
          channel_id: string
          user_id: string
          vote_time?: string
          vote_type?: number | null
        }
        Update: {
          channel_id?: string
          user_id?: string
          vote_time?: string
          vote_type?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      feed_type: "youtube" | "podcast"
      subscription_type: "channel" | "feed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
