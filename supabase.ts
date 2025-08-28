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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string
          total_seats: number | null
          total_seats_purchased: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier: string
          total_seats?: number | null
          total_seats_purchased?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          total_seats?: number | null
          total_seats_purchased?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          title: string
          type: string
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          action: string
          actor_avatar: string | null
          actor_id: string
          actor_name: string
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_avatar?: string | null
          actor_id: string
          actor_name: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_avatar?: string | null
          actor_id?: string
          actor_name?: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          can_manage_tiers: boolean | null
          can_view_analytics: boolean | null
          created_at: string | null
          id: string
          is_super_admin: boolean | null
          user_id: string
        }
        Insert: {
          can_manage_tiers?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          user_id: string
        }
        Update: {
          can_manage_tiers?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          cost_per_1k_input: number | null
          cost_per_1k_output: number | null
          created_at: string | null
          deprecation_date: string | null
          id: string
          is_active: boolean | null
          is_deprecated: boolean | null
          max_tokens: number | null
          model_category: string | null
          model_id: string
          model_name: string
          provider: Database["public"]["Enums"]["ai_provider"]
          supports_functions: boolean | null
          supports_streaming: boolean | null
          supports_vision: boolean | null
          updated_at: string | null
        }
        Insert: {
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          created_at?: string | null
          deprecation_date?: string | null
          id?: string
          is_active?: boolean | null
          is_deprecated?: boolean | null
          max_tokens?: number | null
          model_category?: string | null
          model_id: string
          model_name: string
          provider: Database["public"]["Enums"]["ai_provider"]
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          created_at?: string | null
          deprecation_date?: string | null
          id?: string
          is_active?: boolean | null
          is_deprecated?: boolean | null
          max_tokens?: number | null
          model_category?: string | null
          model_id?: string
          model_name?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_key_usage: {
        Row: {
          api_key_id: string
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string
          request_body_size: number | null
          response_body_size: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_body_size?: number | null
          response_body_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_body_size?: number | null
          response_body_size?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_ips: Json | null
          allowed_origins: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at: string | null
          last_used_ip: unknown | null
          name: string
          rate_limit_per_day: number | null
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scopes: Json | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          allowed_ips?: Json | null
          allowed_origins?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          name: string
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: Json | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          allowed_ips?: Json | null
          allowed_origins?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_four?: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          name?: string
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: Json | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      chain_alert_history: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_results: Json | null
          actions_executed: Json | null
          alert_id: string
          alert_type: string
          chain_run_id: string | null
          details: Json | null
          id: string
          message: string
          metrics: Json | null
          notes: string | null
          severity: string
          triggered_at: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_results?: Json | null
          actions_executed?: Json | null
          alert_id: string
          alert_type: string
          chain_run_id?: string | null
          details?: Json | null
          id?: string
          message: string
          metrics?: Json | null
          notes?: string | null
          severity: string
          triggered_at?: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_results?: Json | null
          actions_executed?: Json | null
          alert_id?: string
          alert_type?: string
          chain_run_id?: string | null
          details?: Json | null
          id?: string
          message?: string
          metrics?: Json | null
          notes?: string | null
          severity?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "chain_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_alert_history_chain_run_id_fkey"
            columns: ["chain_run_id"]
            isOneToOne: false
            referencedRelation: "prompt_chain_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_alerts: {
        Row: {
          actions: Json
          chain_id: string | null
          conditions: Json
          cooldown_period: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          severity: string
          threshold: number | null
          time_window: number | null
          trigger_count: number | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions: Json
          chain_id?: string | null
          conditions: Json
          cooldown_period?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          severity: string
          threshold?: number | null
          time_window?: number | null
          trigger_count?: number | null
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions?: Json
          chain_id?: string | null
          conditions?: Json
          cooldown_period?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          severity?: string
          threshold?: number | null
          time_window?: number | null
          trigger_count?: number | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_alerts_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "prompt_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_execution_logs: {
        Row: {
          chain_run_id: string | null
          completed_at: string | null
          cost: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          retry_count: number | null
          started_at: string
          status: string
          step_id: string
          step_type: string
          tokens_used: number | null
        }
        Insert: {
          chain_run_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
          status: string
          step_id: string
          step_type: string
          tokens_used?: number | null
        }
        Update: {
          chain_run_id?: string | null
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: string
          step_id?: string
          step_type?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_execution_logs_chain_run_id_fkey"
            columns: ["chain_run_id"]
            isOneToOne: false
            referencedRelation: "prompt_chain_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_executions: {
        Row: {
          chain_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          executed_by: string | null
          id: string
          inputs: Json | null
          outputs: Json | null
          started_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          chain_id: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          executed_by?: string | null
          id?: string
          inputs?: Json | null
          outputs?: Json | null
          started_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          chain_id?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          executed_by?: string | null
          id?: string
          inputs?: Json | null
          outputs?: Json | null
          started_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_executions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_runs: {
        Row: {
          chain_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          status: string | null
          step_outputs: Json[] | null
          total_cost: number | null
          total_tokens: number | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          chain_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string | null
          step_outputs?: Json[] | null
          total_cost?: number | null
          total_tokens?: number | null
          user_id: string
          workspace_id: string
        }
        Update: {
          chain_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string | null
          step_outputs?: Json[] | null
          total_cost?: number | null
          total_tokens?: number | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_runs_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "prompt_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_templates: {
        Row: {
          author: string | null
          category: string | null
          created_at: string | null
          created_by: string
          default_inputs: Json | null
          description: string | null
          documentation: string | null
          examples: Json | null
          id: string
          is_public: boolean | null
          name: string
          rating_count: number | null
          rating_sum: number | null
          steps: Json
          tags: Json | null
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
          version: string | null
          workspace_id: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string | null
          created_by: string
          default_inputs?: Json | null
          description?: string | null
          documentation?: string | null
          examples?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          rating_count?: number | null
          rating_sum?: number | null
          steps: Json
          tags?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
          version?: string | null
          workspace_id?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string
          default_inputs?: Json | null
          description?: string | null
          documentation?: string | null
          examples?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          rating_count?: number | null
          rating_sum?: number | null
          steps?: Json
          tags?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
          version?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_versions: {
        Row: {
          chain_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          steps: Json
          trigger: string
          trigger_config: Json | null
          version: number
        }
        Insert: {
          chain_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          steps: Json
          trigger: string
          trigger_config?: Json | null
          version: number
        }
        Update: {
          chain_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          trigger?: string
          trigger_config?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "chain_versions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_webhook_logs: {
        Row: {
          body: Json | null
          chain_id: string
          created_at: string
          execution_id: string | null
          headers: Json | null
          id: string
          ip_address: string | null
          method: string
          response: Json | null
          status_code: number | null
        }
        Insert: {
          body?: Json | null
          chain_id: string
          created_at?: string
          execution_id?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          method: string
          response?: Json | null
          status_code?: number | null
        }
        Update: {
          body?: Json | null
          chain_id?: string
          created_at?: string
          execution_id?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          method?: string
          response?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_webhook_logs_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_webhook_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "chain_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_webhooks: {
        Row: {
          chain_id: string | null
          created_at: string | null
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          method: string | null
          name: string
          secret: string | null
          trigger_on: Json | null
          updated_at: string | null
          url: string
          workspace_id: string | null
        }
        Insert: {
          chain_id?: string | null
          created_at?: string | null
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          method?: string | null
          name: string
          secret?: string | null
          trigger_on?: Json | null
          updated_at?: string | null
          url: string
          workspace_id?: string | null
        }
        Update: {
          chain_id?: string | null
          created_at?: string | null
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          method?: string | null
          name?: string
          secret?: string | null
          trigger_on?: Json | null
          updated_at?: string | null
          url?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_webhooks_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "prompt_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_webhooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chains: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          slug: string
          steps: Json
          trigger: string
          trigger_config: Json | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          slug: string
          steps?: Json
          trigger?: string
          trigger_config?: Json | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          steps?: Json
          trigger?: string
          trigger_config?: Json | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connection_logs: {
        Row: {
          bytes_transferred: string | null
          chain_id: string | null
          connection_id: string
          created_at: string
          error: string | null
          execution_time: string | null
          id: string
          operation: string
          prompt_id: string | null
          query: string | null
          query_hash: string | null
          rows_affected: string | null
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          bytes_transferred?: string | null
          chain_id?: string | null
          connection_id: string
          created_at?: string
          error?: string | null
          execution_time?: string | null
          id?: string
          operation: string
          prompt_id?: string | null
          query?: string | null
          query_hash?: string | null
          rows_affected?: string | null
          status: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          bytes_transferred?: string | null
          chain_id?: string | null
          connection_id?: string
          created_at?: string
          error?: string | null
          execution_time?: string | null
          id?: string
          operation?: string
          prompt_id?: string | null
          query?: string | null
          query_hash?: string | null
          rows_affected?: string | null
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_connection_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_connection_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connections: {
        Row: {
          allowed_operations: Json | null
          connection_string: string | null
          connection_timeout: string | null
          created_at: string
          created_by: string
          database: string | null
          description: string | null
          host: string | null
          id: string
          ip_whitelist: Json | null
          is_active: boolean | null
          last_tested_at: string | null
          last_used_at: string | null
          name: string
          options: Json | null
          password: string | null
          pool_max: string | null
          pool_min: string | null
          port: string | null
          read_only: boolean | null
          ssl_config: Json | null
          ssl_enabled: boolean | null
          test_message: string | null
          test_status: string | null
          type: Database["public"]["Enums"]["database_type"]
          updated_at: string
          updated_by: string
          username: string | null
          workspace_id: string
        }
        Insert: {
          allowed_operations?: Json | null
          connection_string?: string | null
          connection_timeout?: string | null
          created_at?: string
          created_by: string
          database?: string | null
          description?: string | null
          host?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_active?: boolean | null
          last_tested_at?: string | null
          last_used_at?: string | null
          name: string
          options?: Json | null
          password?: string | null
          pool_max?: string | null
          pool_min?: string | null
          port?: string | null
          read_only?: boolean | null
          ssl_config?: Json | null
          ssl_enabled?: boolean | null
          test_message?: string | null
          test_status?: string | null
          type: Database["public"]["Enums"]["database_type"]
          updated_at?: string
          updated_by: string
          username?: string | null
          workspace_id: string
        }
        Update: {
          allowed_operations?: Json | null
          connection_string?: string | null
          connection_timeout?: string | null
          created_at?: string
          created_by?: string
          database?: string | null
          description?: string | null
          host?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_active?: boolean | null
          last_tested_at?: string | null
          last_used_at?: string | null
          name?: string
          options?: Json | null
          password?: string | null
          pool_max?: string | null
          pool_min?: string | null
          port?: string | null
          read_only?: boolean | null
          ssl_config?: Json | null
          ssl_enabled?: boolean | null
          test_message?: string | null
          test_status?: string | null
          type?: Database["public"]["Enums"]["database_type"]
          updated_at?: string
          updated_by?: string
          username?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      database_schemas: {
        Row: {
          columns: Json | null
          connection_id: string
          constraints: Json | null
          id: string
          indexes: Json | null
          last_synced_at: string
          row_count: string | null
          schema_name: string | null
          size_bytes: string | null
          table_name: string | null
        }
        Insert: {
          columns?: Json | null
          connection_id: string
          constraints?: Json | null
          id?: string
          indexes?: Json | null
          last_synced_at?: string
          row_count?: string | null
          schema_name?: string | null
          size_bytes?: string | null
          table_name?: string | null
        }
        Update: {
          columns?: Json | null
          connection_id?: string
          constraints?: Json | null
          id?: string
          indexes?: Json | null
          last_synced_at?: string
          row_count?: string | null
          schema_name?: string | null
          size_bytes?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "database_schemas_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_tier_overrides: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          override_tier: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          override_tier?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          override_tier?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_tier_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          feature_key: string
          id: string
          metadata: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          position: number | null
          sort_order: number | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number | null
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number | null
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          app_comments: boolean | null
          app_invites: boolean | null
          app_limit_warnings: boolean | null
          app_mentions: boolean | null
          app_system: boolean | null
          app_updates: boolean | null
          created_at: string | null
          desktop_enabled: boolean | null
          email_digest: boolean | null
          email_digest_frequency: string | null
          email_enabled: boolean | null
          email_invites: boolean | null
          email_marketing: boolean | null
          email_mentions: boolean | null
          email_updates: boolean | null
          id: string
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_comments?: boolean | null
          app_invites?: boolean | null
          app_limit_warnings?: boolean | null
          app_mentions?: boolean | null
          app_system?: boolean | null
          app_updates?: boolean | null
          created_at?: string | null
          desktop_enabled?: boolean | null
          email_digest?: boolean | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_invites?: boolean | null
          email_marketing?: boolean | null
          email_mentions?: boolean | null
          email_updates?: boolean | null
          id?: string
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_comments?: boolean | null
          app_invites?: boolean | null
          app_limit_warnings?: boolean | null
          app_mentions?: boolean | null
          app_system?: boolean | null
          app_updates?: boolean | null
          created_at?: string | null
          desktop_enabled?: boolean | null
          email_digest?: boolean | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_invites?: boolean | null
          email_marketing?: boolean | null
          email_mentions?: boolean | null
          email_updates?: boolean | null
          id?: string
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_chain_runs: {
        Row: {
          branching_decisions: Json | null
          chain_id: string
          completed_at: string | null
          completed_steps: number | null
          debug_log: Json | null
          error: string | null
          errors: Json | null
          executed_at: string
          executed_by: string
          execution_path: Json | null
          execution_time: number | null
          failed_at_step: number | null
          failed_steps: number | null
          id: string
          inputs: Json
          loop_iterations: Json | null
          outputs: Json
          parallel_executions: number | null
          parent_run_id: string | null
          retry_attempts: Json | null
          skipped_steps: number | null
          started_at: string | null
          status: string
          step_results: Json
          total_cost: number | null
          total_steps: number | null
          total_tokens: number | null
          trigger_data: Json | null
          trigger_type: string | null
          variables: Json | null
          workspace_id: string
        }
        Insert: {
          branching_decisions?: Json | null
          chain_id: string
          completed_at?: string | null
          completed_steps?: number | null
          debug_log?: Json | null
          error?: string | null
          errors?: Json | null
          executed_at?: string
          executed_by: string
          execution_path?: Json | null
          execution_time?: number | null
          failed_at_step?: number | null
          failed_steps?: number | null
          id?: string
          inputs: Json
          loop_iterations?: Json | null
          outputs: Json
          parallel_executions?: number | null
          parent_run_id?: string | null
          retry_attempts?: Json | null
          skipped_steps?: number | null
          started_at?: string | null
          status: string
          step_results: Json
          total_cost?: number | null
          total_steps?: number | null
          total_tokens?: number | null
          trigger_data?: Json | null
          trigger_type?: string | null
          variables?: Json | null
          workspace_id: string
        }
        Update: {
          branching_decisions?: Json | null
          chain_id?: string
          completed_at?: string | null
          completed_steps?: number | null
          debug_log?: Json | null
          error?: string | null
          errors?: Json | null
          executed_at?: string
          executed_by?: string
          execution_path?: Json | null
          execution_time?: number | null
          failed_at_step?: number | null
          failed_steps?: number | null
          id?: string
          inputs?: Json
          loop_iterations?: Json | null
          outputs?: Json
          parallel_executions?: number | null
          parent_run_id?: string | null
          retry_attempts?: Json | null
          skipped_steps?: number | null
          started_at?: string | null
          status?: string
          step_results?: Json
          total_cost?: number | null
          total_steps?: number | null
          total_tokens?: number | null
          trigger_data?: Json | null
          trigger_type?: string | null
          variables?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_chain_runs_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "prompt_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_chain_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_chain_steps: {
        Row: {
          chain_id: string | null
          created_at: string | null
          id: string
          input_mapping: Json | null
          output_key: string | null
          parallel_group: number | null
          prompt_id: string | null
          retry_config: Json | null
          step_order: number
          updated_at: string | null
        }
        Insert: {
          chain_id?: string | null
          created_at?: string | null
          id?: string
          input_mapping?: Json | null
          output_key?: string | null
          parallel_group?: number | null
          prompt_id?: string | null
          retry_config?: Json | null
          step_order: number
          updated_at?: string | null
        }
        Update: {
          chain_id?: string | null
          created_at?: string | null
          id?: string
          input_mapping?: Json | null
          output_key?: string | null
          parallel_group?: number | null
          prompt_id?: string | null
          retry_config?: Json | null
          step_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_chain_steps_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "prompt_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_chain_steps_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_chain_steps_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_chains: {
        Row: {
          allowed_roles: Json | null
          allowed_users: Json | null
          approvers: Json | null
          average_execution_time: number | null
          category: string | null
          created_at: string
          created_by: string
          default_inputs: Json | null
          description: string | null
          documentation: Json | null
          error_handling: Json | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          is_draft: boolean | null
          is_template: boolean | null
          last_failure_at: string | null
          last_run_at: string | null
          last_success_at: string | null
          max_execution_time: number | null
          max_parallel_steps: number | null
          name: string
          next_run_at: string | null
          notifications: Json | null
          p95_execution_time: number | null
          p99_execution_time: number | null
          published_version: number | null
          require_approval: boolean | null
          retry_policy: Json | null
          run_count: number | null
          schedule: Json | null
          sla_compliance: number | null
          sla_target: number | null
          slug: string
          steps: Json
          success_count: number | null
          tags: Json | null
          template_category: string | null
          total_cost: number | null
          total_tokens: number | null
          triggers: Json | null
          updated_at: string
          updated_by: string | null
          variables: Json | null
          version: number | null
          visibility: string | null
          workspace_id: string
        }
        Insert: {
          allowed_roles?: Json | null
          allowed_users?: Json | null
          approvers?: Json | null
          average_execution_time?: number | null
          category?: string | null
          created_at?: string
          created_by: string
          default_inputs?: Json | null
          description?: string | null
          documentation?: Json | null
          error_handling?: Json | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          is_template?: boolean | null
          last_failure_at?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          max_execution_time?: number | null
          max_parallel_steps?: number | null
          name: string
          next_run_at?: string | null
          notifications?: Json | null
          p95_execution_time?: number | null
          p99_execution_time?: number | null
          published_version?: number | null
          require_approval?: boolean | null
          retry_policy?: Json | null
          run_count?: number | null
          schedule?: Json | null
          sla_compliance?: number | null
          sla_target?: number | null
          slug: string
          steps?: Json
          success_count?: number | null
          tags?: Json | null
          template_category?: string | null
          total_cost?: number | null
          total_tokens?: number | null
          triggers?: Json | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
          visibility?: string | null
          workspace_id: string
        }
        Update: {
          allowed_roles?: Json | null
          allowed_users?: Json | null
          approvers?: Json | null
          average_execution_time?: number | null
          category?: string | null
          created_at?: string
          created_by?: string
          default_inputs?: Json | null
          description?: string | null
          documentation?: Json | null
          error_handling?: Json | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          is_template?: boolean | null
          last_failure_at?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          max_execution_time?: number | null
          max_parallel_steps?: number | null
          name?: string
          next_run_at?: string | null
          notifications?: Json | null
          p95_execution_time?: number | null
          p99_execution_time?: number | null
          published_version?: number | null
          require_approval?: boolean | null
          retry_policy?: Json | null
          run_count?: number | null
          schedule?: Json | null
          sla_compliance?: number | null
          sla_target?: number | null
          slug?: string
          steps?: Json
          success_count?: number | null
          tags?: Json | null
          template_category?: string | null
          total_cost?: number | null
          total_tokens?: number | null
          triggers?: Json | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
          visibility?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_chains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_runs: {
        Row: {
          chain_run_id: string | null
          completion_tokens: number | null
          cost: number | null
          error: string | null
          executed_at: string
          executed_by: string
          feedback: string | null
          id: string
          input: Json
          latency_ms: number | null
          model: string
          output: string | null
          parameters: Json
          prompt_id: string
          prompt_tokens: number | null
          rating: number | null
          status: string
          total_tokens: number | null
          workspace_id: string
        }
        Insert: {
          chain_run_id?: string | null
          completion_tokens?: number | null
          cost?: number | null
          error?: string | null
          executed_at?: string
          executed_by: string
          feedback?: string | null
          id?: string
          input: Json
          latency_ms?: number | null
          model: string
          output?: string | null
          parameters: Json
          prompt_id: string
          prompt_tokens?: number | null
          rating?: number | null
          status: string
          total_tokens?: number | null
          workspace_id: string
        }
        Update: {
          chain_run_id?: string | null
          completion_tokens?: number | null
          cost?: number | null
          error?: string | null
          executed_at?: string
          executed_by?: string
          feedback?: string | null
          id?: string
          input?: Json
          latency_ms?: number | null
          model?: string
          output?: string | null
          parameters?: Json
          prompt_id?: string
          prompt_tokens?: number | null
          rating?: number | null
          status?: string
          total_tokens?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_runs_chain_run_id_fkey"
            columns: ["chain_run_id"]
            isOneToOne: false
            referencedRelation: "chain_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_runs_prompt_id_prompts_id_fk"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_runs_prompt_id_prompts_id_fk"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_runs_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_tags: {
        Row: {
          created_at: string | null
          id: string
          prompt_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_tags_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_tags_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          author_avatar: string | null
          author_id: string
          author_name: string | null
          category: string
          content: string
          created_at: string | null
          description: string
          example_input: string | null
          example_output: string | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          likes_count: number | null
          max_tokens: number | null
          model: string | null
          model_settings: Json | null
          parameters: Json | null
          parent_template_id: string | null
          price: number | null
          published_at: string | null
          rating_avg: number | null
          rating_count: number | null
          recommended_models: string[] | null
          requirements: string | null
          search_vector: unknown | null
          shortcode: string | null
          slug: string
          source_prompt_id: string | null
          tags: string[] | null
          temperature: number | null
          title: string
          updated_at: string | null
          use_case: string | null
          uses_count: number | null
          variables: Json | null
          version: string | null
          views_count: number | null
          visibility: string | null
          warnings: string | null
          when_to_use: string | null
          workspace_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id: string
          author_name?: string | null
          category: string
          content: string
          created_at?: string | null
          description: string
          example_input?: string | null
          example_output?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          likes_count?: number | null
          max_tokens?: number | null
          model?: string | null
          model_settings?: Json | null
          parameters?: Json | null
          parent_template_id?: string | null
          price?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          recommended_models?: string[] | null
          requirements?: string | null
          search_vector?: unknown | null
          shortcode?: string | null
          slug: string
          source_prompt_id?: string | null
          tags?: string[] | null
          temperature?: number | null
          title: string
          updated_at?: string | null
          use_case?: string | null
          uses_count?: number | null
          variables?: Json | null
          version?: string | null
          views_count?: number | null
          visibility?: string | null
          warnings?: string | null
          when_to_use?: string | null
          workspace_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string
          author_name?: string | null
          category?: string
          content?: string
          created_at?: string | null
          description?: string
          example_input?: string | null
          example_output?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          likes_count?: number | null
          max_tokens?: number | null
          model?: string | null
          model_settings?: Json | null
          parameters?: Json | null
          parent_template_id?: string | null
          price?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          recommended_models?: string[] | null
          requirements?: string | null
          search_vector?: unknown | null
          shortcode?: string | null
          slug?: string
          source_prompt_id?: string | null
          tags?: string[] | null
          temperature?: number | null
          title?: string
          updated_at?: string | null
          use_case?: string | null
          uses_count?: number | null
          variables?: Json | null
          version?: string | null
          views_count?: number | null
          visibility?: string | null
          warnings?: string | null
          when_to_use?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_source_prompt_id_fkey"
            columns: ["source_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_source_prompt_id_fkey"
            columns: ["source_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          change_message: string | null
          change_type: string
          content: string
          created_at: string
          created_by: string
          diff: Json | null
          id: string
          parameters: Json | null
          prompt_id: string
          variables: Json | null
          version: number
          workspace_id: string
        }
        Insert: {
          change_message?: string | null
          change_type: string
          content: string
          created_at?: string
          created_by: string
          diff?: Json | null
          id?: string
          parameters?: Json | null
          prompt_id: string
          variables?: Json | null
          version: number
          workspace_id: string
        }
        Update: {
          change_message?: string | null
          change_type?: string
          content?: string
          created_at?: string
          created_by?: string
          diff?: Json | null
          id?: string
          parameters?: Json | null
          prompt_id?: string
          variables?: Json | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_prompt_id_prompts_id_fk"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_versions_prompt_id_prompts_id_fk"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_versions_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          average_rating: number | null
          content: string
          created_at: string
          created_by: string
          default_frequency_penalty: number | null
          default_max_tokens: number | null
          default_presence_penalty: number | null
          default_provider: string | null
          default_top_p: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          example_input: Json | null
          example_output: string | null
          favorites_count: number | null
          folder_id: string | null
          id: string
          imported_from_template_id: string | null
          is_favorite: boolean | null
          is_published: boolean | null
          is_shared: boolean | null
          last_used_at: string | null
          max_tokens: number | null
          metadata: Json | null
          model: string | null
          name: string
          original_folder_id: string | null
          parameters: Json | null
          position: number | null
          published_at: string | null
          related_prompts: Json | null
          requirements: Json | null
          share_settings: Json | null
          shares_count: number | null
          shortcode: string | null
          slug: string | null
          tags: Json | null
          temperature: number | null
          updated_at: string
          updated_by: string | null
          usage_count: number | null
          uses: number | null
          variables: Json | null
          version: number
          views: number | null
          visibility: string | null
          warnings: Json | null
          when_to_use: string | null
          workspace_id: string
        }
        Insert: {
          average_rating?: number | null
          content: string
          created_at?: string
          created_by: string
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_presence_penalty?: number | null
          default_provider?: string | null
          default_top_p?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          example_input?: Json | null
          example_output?: string | null
          favorites_count?: number | null
          folder_id?: string | null
          id?: string
          imported_from_template_id?: string | null
          is_favorite?: boolean | null
          is_published?: boolean | null
          is_shared?: boolean | null
          last_used_at?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name: string
          original_folder_id?: string | null
          parameters?: Json | null
          position?: number | null
          published_at?: string | null
          related_prompts?: Json | null
          requirements?: Json | null
          share_settings?: Json | null
          shares_count?: number | null
          shortcode?: string | null
          slug?: string | null
          tags?: Json | null
          temperature?: number | null
          updated_at?: string
          updated_by?: string | null
          usage_count?: number | null
          uses?: number | null
          variables?: Json | null
          version?: number
          views?: number | null
          visibility?: string | null
          warnings?: Json | null
          when_to_use?: string | null
          workspace_id: string
        }
        Update: {
          average_rating?: number | null
          content?: string
          created_at?: string
          created_by?: string
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_presence_penalty?: number | null
          default_provider?: string | null
          default_top_p?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          example_input?: Json | null
          example_output?: string | null
          favorites_count?: number | null
          folder_id?: string | null
          id?: string
          imported_from_template_id?: string | null
          is_favorite?: boolean | null
          is_published?: boolean | null
          is_shared?: boolean | null
          last_used_at?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name?: string
          original_folder_id?: string | null
          parameters?: Json | null
          position?: number | null
          published_at?: string | null
          related_prompts?: Json | null
          requirements?: Json | null
          share_settings?: Json | null
          shares_count?: number | null
          shortcode?: string | null
          slug?: string | null
          tags?: Json | null
          temperature?: number | null
          updated_at?: string
          updated_by?: string | null
          usage_count?: number | null
          uses?: number | null
          variables?: Json | null
          version?: number
          views?: number | null
          visibility?: string | null
          warnings?: Json | null
          when_to_use?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_imported_from_template_id_fkey"
            columns: ["imported_from_template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          allowed_users: string[] | null
          connection_id: string
          created_at: string | null
          created_by: string
          description: string | null
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          is_read_only: boolean | null
          name: string
          requires_approval: boolean | null
          slug: string
          sql_template: string
          tags: string[] | null
          updated_at: string | null
          updated_by: string
          variables_schema: Json | null
          workspace_id: string
        }
        Insert: {
          allowed_users?: string[] | null
          connection_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_read_only?: boolean | null
          name: string
          requires_approval?: boolean | null
          slug: string
          sql_template: string
          tags?: string[] | null
          updated_at?: string | null
          updated_by: string
          variables_schema?: Json | null
          workspace_id: string
        }
        Update: {
          allowed_users?: string[] | null
          connection_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_read_only?: boolean | null
          name?: string
          requires_approval?: boolean | null
          slug?: string
          sql_template?: string
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string
          variables_schema?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      query_cache: {
        Row: {
          cached_at: string | null
          expires_at: string | null
          id: string
          parameters_hash: string
          query_id: string
          result_count: number | null
          result_data: Json
        }
        Insert: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          parameters_hash: string
          query_id: string
          result_count?: number | null
          result_data: Json
        }
        Update: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          parameters_hash?: string
          query_id?: string
          result_count?: number | null
          result_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "query_cache_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      query_runs: {
        Row: {
          chain_run_id: string | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          parameters: Json | null
          query_id: string
          result_data: Json | null
          rows_affected: number | null
          rows_returned: number | null
          sql_executed: string
          status: string
          step_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          chain_run_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          query_id: string
          result_data?: Json | null
          rows_affected?: number | null
          rows_returned?: number | null
          sql_executed: string
          status: string
          step_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          chain_run_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          query_id?: string
          result_data?: Json | null
          rows_affected?: number | null
          rows_returned?: number | null
          sql_executed?: string
          status?: string
          step_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_runs_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      query_snippets: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          slug: string
          sql_snippet: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sql_snippet: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sql_snippet?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_snippets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      query_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          created_by: string
          id: string
          query_id: string
          sql_template: string
          variables_schema: Json | null
          version: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          query_id: string
          sql_template: string
          variables_schema?: Json | null
          version: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          query_id?: string
          sql_template?: string
          variables_schema?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "query_versions_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          api_key_id: string
          bucket_key: string
          bucket_type: string
          created_at: string | null
          expires_at: string
          id: string
          request_count: number | null
        }
        Insert: {
          api_key_id: string
          bucket_key: string
          bucket_type: string
          created_at?: string | null
          expires_at: string
          id?: string
          request_count?: number | null
        }
        Update: {
          api_key_id?: string
          bucket_key?: string
          bucket_type?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          request_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_buckets_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          allow_copying: boolean | null
          created_at: string | null
          created_by: string | null
          current_views: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          max_views: number | null
          password_hash: string | null
          prompt_id: string
          show_variables: boolean | null
          slug: string
          workspace_id: string
        }
        Insert: {
          allow_copying?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_views?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          prompt_id: string
          show_variables?: boolean | null
          slug: string
          workspace_id: string
        }
        Update: {
          allow_copying?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_views?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          prompt_id?: string
          show_variables?: boolean | null
          slug?: string
          workspace_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          period: string
          reason: string | null
          started_at: string
          status: string
          tier: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          period: string
          reason?: string | null
          started_at: string
          status: string
          tier: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          period?: string
          reason?: string | null
          started_at?: string
          status?: string
          tier?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_ai_keys: {
        Row: {
          added_by: string
          allowed_models: Json | null
          created_at: string | null
          daily_limit: number | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          key_hint: string | null
          monthly_limit: number | null
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string | null
        }
        Insert: {
          added_by: string
          allowed_models?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          key_hint?: string | null
          monthly_limit?: number | null
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string | null
        }
        Update: {
          added_by?: string
          allowed_models?: Json | null
          created_at?: string | null
          daily_limit?: number | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          key_hint?: string | null
          monthly_limit?: number | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string | null
        }
        Relationships: []
      }
      system_key_usage: {
        Row: {
          daily_count: number | null
          id: string
          last_model_used: string | null
          last_reset_daily: string | null
          last_reset_monthly: string | null
          last_used_at: string | null
          monthly_count: number | null
          provider: Database["public"]["Enums"]["ai_provider"]
          user_id: string
        }
        Insert: {
          daily_count?: number | null
          id?: string
          last_model_used?: string | null
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          last_used_at?: string | null
          monthly_count?: number | null
          provider: Database["public"]["Enums"]["ai_provider"]
          user_id: string
        }
        Update: {
          daily_count?: number | null
          id?: string
          last_model_used?: string | null
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          last_used_at?: string | null
          monthly_count?: number | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_volume_discounts: {
        Row: {
          created_at: string | null
          discount_percentage: number
          id: string
          max_seats: number | null
          min_seats: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage: number
          id?: string
          max_seats?: number | null
          min_seats: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          id?: string
          max_seats?: number | null
          min_seats?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      template_collections: {
        Row: {
          cover_image: string | null
          created_at: string | null
          curator_id: string | null
          description: string | null
          display_order: number | null
          id: string
          is_official: boolean | null
          is_public: boolean | null
          name: string
          slug: string
          templates: string[] | null
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          curator_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          slug: string
          templates?: string[] | null
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          curator_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          slug?: string
          templates?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_likes: {
        Row: {
          created_at: string | null
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_likes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_reviews: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          rating: number
          review_text: string | null
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating: number
          review_text?: string | null
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating?: number
          review_text?: string | null
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_uses: {
        Row: {
          created_at: string | null
          id: string
          prompt_id: string | null
          template_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt_id?: string | null
          template_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt_id?: string | null
          template_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_uses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts_trash"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_configurations: {
        Row: {
          active: boolean | null
          created_at: string | null
          cta: string | null
          description: string | null
          display_name: string
          features: Json
          highlighted: boolean | null
          id: string
          limits: Json
          monthly_price: number
          tier_name: string
          updated_at: string | null
          yearly_price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          cta?: string | null
          description?: string | null
          display_name: string
          features?: Json
          highlighted?: boolean | null
          id?: string
          limits?: Json
          monthly_price?: number
          tier_name: string
          updated_at?: string | null
          yearly_price?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          cta?: string | null
          description?: string | null
          display_name?: string
          features?: Json
          highlighted?: boolean | null
          id?: string
          limits?: Json
          monthly_price?: number
          tier_name?: string
          updated_at?: string | null
          yearly_price?: number
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          key_hint: string | null
          key_name: string
          last_error: string | null
          last_error_at: string | null
          last_used_at: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key_hint?: string | null
          key_name: string
          last_error?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key_hint?: string | null
          key_name?: string
          last_error?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          api_keys: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_workspace_id: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_active_at: string | null
          metadata: Json | null
          onboarding_completed: boolean | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          api_keys?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_active_at?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          api_keys?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          metadata?: Json | null
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          provider: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_api_keys: {
        Row: {
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          key_preview: string | null
          last_used_at: string | null
          masked_key: string | null
          name: string
          provider: string
          settings: Json | null
          updated_at: string | null
          updated_by: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key_preview?: string | null
          last_used_at?: string | null
          masked_key?: string | null
          name: string
          provider: string
          settings?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key_preview?: string | null
          last_used_at?: string | null
          masked_key?: string | null
          name?: string
          provider?: string
          settings?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          rejected_at: string | null
          rejected_by: string | null
          role: string
          status: string | null
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          rejected_at?: string | null
          rejected_by?: string | null
          role: string
          status?: string | null
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          rejected_at?: string | null
          rejected_by?: string | null
          role?: string
          status?: string | null
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invite_accepted_at: string | null
          invited_by: string | null
          joined_at: string
          permissions: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invite_accepted_at?: string | null
          invited_by?: string | null
          joined_at?: string
          permissions?: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invite_accepted_at?: string | null
          invited_by?: string | null
          joined_at?: string
          permissions?: Json | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_usage: {
        Row: {
          api_calls_count: number | null
          created_at: string | null
          id: string
          month: string
          prompts_count: number | null
          storage_bytes: number | null
          test_runs_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_calls_count?: number | null
          created_at?: string | null
          id?: string
          month: string
          prompts_count?: number | null
          storage_bytes?: number | null
          test_runs_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_calls_count?: number | null
          created_at?: string | null
          id?: string
          month?: string
          prompts_count?: number | null
          storage_bytes?: number | null
          test_runs_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_name: string | null
          id: string
          is_personal: boolean | null
          logo_url: string | null
          max_seats: number | null
          member_limit: number | null
          monthly_prompt_limit: number | null
          monthly_prompt_usage: number | null
          name: string
          parent_account_id: string | null
          plan: string
          seats: number | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_ends_at: string | null
          subscription_period: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string
          workspace_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_personal?: boolean | null
          logo_url?: string | null
          max_seats?: number | null
          member_limit?: number | null
          monthly_prompt_limit?: number | null
          monthly_prompt_usage?: number | null
          name: string
          parent_account_id?: string | null
          plan?: string
          seats?: number | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_period?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_personal?: boolean | null
          logo_url?: string | null
          max_seats?: number | null
          member_limit?: number | null
          monthly_prompt_limit?: number | null
          monthly_prompt_usage?: number | null
          name?: string
          parent_account_id?: string | null
          plan?: string
          seats?: number | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_ends_at?: string | null
          subscription_period?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workspace_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      audit_logs_with_users: {
        Row: {
          action: string | null
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          performer_email: string | null
          performer_name: string | null
          performer_role: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
      prompts_trash: {
        Row: {
          average_rating: number | null
          content: string | null
          created_at: string | null
          created_by: string | null
          default_frequency_penalty: number | null
          default_max_tokens: number | null
          default_presence_penalty: number | null
          default_provider: string | null
          default_top_p: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          example_input: Json | null
          example_output: string | null
          favorites_count: number | null
          folder_id: string | null
          id: string | null
          is_favorite: boolean | null
          is_published: boolean | null
          is_shared: boolean | null
          last_used_at: string | null
          max_tokens: number | null
          metadata: Json | null
          model: string | null
          name: string | null
          original_folder_id: string | null
          parameters: Json | null
          position: number | null
          published_at: string | null
          related_prompts: Json | null
          requirements: Json | null
          share_settings: Json | null
          shares_count: number | null
          shortcode: string | null
          slug: string | null
          tags: Json | null
          temperature: number | null
          updated_at: string | null
          updated_by: string | null
          usage_count: number | null
          uses: number | null
          variables: Json | null
          version: number | null
          views: number | null
          visibility: string | null
          warnings: Json | null
          when_to_use: string | null
          workspace_id: string | null
        }
        Insert: {
          average_rating?: number | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_presence_penalty?: number | null
          default_provider?: string | null
          default_top_p?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          example_input?: Json | null
          example_output?: string | null
          favorites_count?: number | null
          folder_id?: string | null
          id?: string | null
          is_favorite?: boolean | null
          is_published?: boolean | null
          is_shared?: boolean | null
          last_used_at?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name?: string | null
          original_folder_id?: string | null
          parameters?: Json | null
          position?: number | null
          published_at?: string | null
          related_prompts?: Json | null
          requirements?: Json | null
          share_settings?: Json | null
          shares_count?: number | null
          shortcode?: string | null
          slug?: string | null
          tags?: Json | null
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          uses?: number | null
          variables?: Json | null
          version?: number | null
          views?: number | null
          visibility?: string | null
          warnings?: Json | null
          when_to_use?: string | null
          workspace_id?: string | null
        }
        Update: {
          average_rating?: number | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          default_frequency_penalty?: number | null
          default_max_tokens?: number | null
          default_presence_penalty?: number | null
          default_provider?: string | null
          default_top_p?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          example_input?: Json | null
          example_output?: string | null
          favorites_count?: number | null
          folder_id?: string | null
          id?: string | null
          is_favorite?: boolean | null
          is_published?: boolean | null
          is_shared?: boolean | null
          last_used_at?: string | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name?: string | null
          original_folder_id?: string | null
          parameters?: Json | null
          position?: number | null
          published_at?: string | null
          related_prompts?: Json | null
          requirements?: Json | null
          share_settings?: Json | null
          shares_count?: number | null
          shortcode?: string | null
          slug?: string | null
          tags?: Json | null
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          uses?: number | null
          variables?: Json | null
          version?: number | null
          views?: number | null
          visibility?: string | null
          warnings?: Json | null
          when_to_use?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_workspace_id_workspaces_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_workspace_activity: {
        Row: {
          action: string | null
          created_at: string | null
          entity_name: string | null
          entity_type: string | null
          row_num: number | null
          user_email: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          creates: number | null
          deletes: number | null
          last_activity: string | null
          total_actions: number | null
          updates: number | null
          user_email: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
      user_notification_summary: {
        Row: {
          latest_notification: string | null
          limit_warnings: number | null
          pending_invites: number | null
          total_notifications: number | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_team_price: {
        Args: { period?: string; seats: number }
        Returns: number
      }
      check_rate_limit: {
        Args: { api_key_id_param: string; request_time?: string }
        Returns: {
          allowed: boolean
          remaining_day: number
          remaining_hour: number
          remaining_minute: number
        }[]
      }
      cleanup_expired_rate_limit_buckets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_deleted_prompts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_activity: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_name: string
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_metadata?: Json
          p_workspace_id: string
        }
        Returns: string
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_changes: Json
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
          p_workspace_id?: string
        }
        Returns: string
      }
      get_available_ai_key: {
        Args: {
          provider_param: Database["public"]["Enums"]["ai_provider"]
          user_id_param: string
        }
        Returns: {
          current_daily_usage: number
          current_monthly_usage: number
          daily_limit: number
          encrypted_key: string
          key_id: string
          key_type: string
          monthly_limit: number
        }[]
      }
      get_notification_stats: {
        Args: { p_user_id: string }
        Returns: {
          recent_count: number
          total_count: number
          unread_count: number
        }[]
      }
      increment_ai_usage: {
        Args: {
          key_type_param: string
          model_used?: string
          provider_param: Database["public"]["Enums"]["ai_provider"]
          user_id_param: string
        }
        Returns: boolean
      }
      increment_template_views: {
        Args: { template_id: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { p_notification_ids: string[]; p_user_id: string }
        Returns: number
      }
      search_prompt_documentation: {
        Args: {
          result_limit?: number
          result_offset?: number
          search_query: string
          workspace_uuid: string
        }
        Returns: {
          content: string
          created_at: string
          created_by: string
          description: string
          example_input: Json
          example_output: string
          folder_id: string
          id: string
          name: string
          requirements: Json
          slug: string
          updated_at: string
          uses: number
          version: number
          views: number
          warnings: Json
          when_to_use: string
          workspace_id: string
        }[]
      }
      validate_api_key: {
        Args: { key_hash_param: string }
        Returns: {
          api_key_id: string
          message: string
          rate_limit_per_minute: number
          scopes: Json
          valid: boolean
          workspace_id: string
        }[]
      }
    }
    Enums: {
      ai_provider:
        | "openai"
        | "anthropic"
        | "google"
        | "cohere"
        | "mistral"
        | "groq"
        | "together"
        | "replicate"
      database_type:
        | "postgresql"
        | "mysql"
        | "mongodb"
        | "redis"
        | "elasticsearch"
        | "clickhouse"
        | "snowflake"
        | "bigquery"
        | "redshift"
        | "dynamodb"
        | "cosmosdb"
        | "firebase"
        | "supabase"
        | "custom"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_provider: [
        "openai",
        "anthropic",
        "google",
        "cohere",
        "mistral",
        "groq",
        "together",
        "replicate",
      ],
      database_type: [
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "clickhouse",
        "snowflake",
        "bigquery",
        "redshift",
        "dynamodb",
        "cosmosdb",
        "firebase",
        "supabase",
        "custom",
      ],
    },
  },
} as const
