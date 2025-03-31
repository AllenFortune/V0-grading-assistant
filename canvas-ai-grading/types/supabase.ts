export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          institution: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          institution?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          institution?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_sync: boolean | null
          canvas_token: string | null
          canvas_token_name: string | null
          canvas_url: string | null
          email_notifications: boolean | null
          id: string
          notifications_enabled: boolean | null
          sync_frequency: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_sync?: boolean | null
          canvas_token?: string | null
          canvas_token_name?: string | null
          canvas_url?: string | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_sync?: boolean | null
          canvas_token?: string | null
          canvas_token_name?: string | null
          canvas_url?: string | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_updated_at_column: {
        Args: {
          tablename: string
        }
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

