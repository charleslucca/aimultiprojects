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
  public: {
    Tables: {
      academy_content: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      azure_iterations: {
        Row: {
          azure_id: string
          created_at: string
          finish_date: string | null
          id: string
          integration_id: string
          name: string
          path: string
          project_id: string | null
          raw_data: Json | null
          start_date: string | null
          state: string | null
          synced_at: string | null
        }
        Insert: {
          azure_id: string
          created_at?: string
          finish_date?: string | null
          id?: string
          integration_id: string
          name: string
          path: string
          project_id?: string | null
          raw_data?: Json | null
          start_date?: string | null
          state?: string | null
          synced_at?: string | null
        }
        Update: {
          azure_id?: string
          created_at?: string
          finish_date?: string | null
          id?: string
          integration_id?: string
          name?: string
          path?: string
          project_id?: string | null
          raw_data?: Json | null
          start_date?: string | null
          state?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_iterations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "project_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_iterations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "azure_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_organizations: {
        Row: {
          azure_id: string
          created_at: string
          description: string | null
          id: string
          integration_id: string
          organization_name: string
          organization_url: string
          raw_data: Json | null
          synced_at: string | null
        }
        Insert: {
          azure_id: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id: string
          organization_name: string
          organization_url: string
          raw_data?: Json | null
          synced_at?: string | null
        }
        Update: {
          azure_id?: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string
          organization_name?: string
          organization_url?: string
          raw_data?: Json | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_organizations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "project_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_projects: {
        Row: {
          azure_id: string
          created_at: string
          description: string | null
          id: string
          integration_id: string
          last_update_time: string | null
          name: string
          raw_data: Json | null
          state: string | null
          synced_at: string | null
          visibility: string | null
        }
        Insert: {
          azure_id: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id: string
          last_update_time?: string | null
          name: string
          raw_data?: Json | null
          state?: string | null
          synced_at?: string | null
          visibility?: string | null
        }
        Update: {
          azure_id?: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string
          last_update_time?: string | null
          name?: string
          raw_data?: Json | null
          state?: string | null
          synced_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_projects_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "project_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_work_items: {
        Row: {
          activity: string | null
          area_path: string | null
          assigned_to: string | null
          azure_id: number
          changed_date: string | null
          closed_date: string | null
          completed_work: number | null
          created_at: string
          created_by: string | null
          created_date: string | null
          id: string
          integration_id: string
          iteration_path: string | null
          original_estimate: number | null
          parent_id: number | null
          priority: number | null
          project_id: string | null
          raw_data: Json | null
          reason: string | null
          remaining_work: number | null
          resolved_date: string | null
          severity: string | null
          state: string | null
          story_points: number | null
          synced_at: string | null
          tags: string[] | null
          title: string
          work_item_type: string
        }
        Insert: {
          activity?: string | null
          area_path?: string | null
          assigned_to?: string | null
          azure_id: number
          changed_date?: string | null
          closed_date?: string | null
          completed_work?: number | null
          created_at?: string
          created_by?: string | null
          created_date?: string | null
          id?: string
          integration_id: string
          iteration_path?: string | null
          original_estimate?: number | null
          parent_id?: number | null
          priority?: number | null
          project_id?: string | null
          raw_data?: Json | null
          reason?: string | null
          remaining_work?: number | null
          resolved_date?: string | null
          severity?: string | null
          state?: string | null
          story_points?: number | null
          synced_at?: string | null
          tags?: string[] | null
          title: string
          work_item_type: string
        }
        Update: {
          activity?: string | null
          area_path?: string | null
          assigned_to?: string | null
          azure_id?: number
          changed_date?: string | null
          closed_date?: string | null
          completed_work?: number | null
          created_at?: string
          created_by?: string | null
          created_date?: string | null
          id?: string
          integration_id?: string
          iteration_path?: string | null
          original_estimate?: number | null
          parent_id?: number | null
          priority?: number | null
          project_id?: string | null
          raw_data?: Json | null
          reason?: string | null
          remaining_work?: number | null
          resolved_date?: string | null
          severity?: string | null
          state?: string | null
          story_points?: number | null
          synced_at?: string | null
          tags?: string[] | null
          title?: string
          work_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_work_items_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "project_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "azure_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          id: string
          last_health_update: string | null
          name: string
          organization_id: string | null
          overall_health: Json | null
          risk_level: string | null
          status_color: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          last_health_update?: string | null
          name: string
          organization_id?: string | null
          overall_health?: Json | null
          risk_level?: string | null
          status_color?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          last_health_update?: string | null
          name?: string
          organization_id?: string | null
          overall_health?: Json | null
          risk_level?: string | null
          status_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_sessions: {
        Row: {
          action_items: Json | null
          client_id: string | null
          created_at: string | null
          duration_minutes: number | null
          facilitator_id: string
          id: string
          insights_generated: Json | null
          participants: Json | null
          project_id: string | null
          scheduled_for: string | null
          session_data: Json | null
          session_name: string
          session_template: Json | null
          session_type: string
          status: string | null
          transcription_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          facilitator_id: string
          id?: string
          insights_generated?: Json | null
          participants?: Json | null
          project_id?: string | null
          scheduled_for?: string | null
          session_data?: Json | null
          session_name: string
          session_template?: Json | null
          session_type: string
          status?: string | null
          transcription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          facilitator_id?: string
          id?: string
          insights_generated?: Json | null
          participants?: Json | null
          project_id?: string | null
          scheduled_for?: string | null
          session_data?: Json | null
          session_name?: string
          session_template?: Json | null
          session_type?: string
          status?: string | null
          transcription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_sessions_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_sessions: {
        Row: {
          action_plan: Json | null
          client_id: string | null
          consultant_id: string | null
          created_at: string | null
          duration: number | null
          id: string
          notes: string | null
          project_id: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          action_plan?: Json | null
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          action_plan?: Json | null
          client_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_prompt_templates: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          parent_version_id: string | null
          project_id: string | null
          prompt_category: string
          prompt_content: string
          scope_type: string
          template_name: string
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          parent_version_id?: string | null
          project_id?: string | null
          prompt_category: string
          prompt_content: string
          scope_type: string
          template_name: string
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          parent_version_id?: string | null
          project_id?: string | null
          prompt_category?: string
          prompt_content?: string
          scope_type?: string
          template_name?: string
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_prompt_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_prompt_templates_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "custom_prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_prompt_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_session_versions: {
        Row: {
          changes_summary: string | null
          created_at: string | null
          created_by: string
          id: string
          session_id: string
          snapshot_data: Json
          version_name: string | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          session_id: string
          snapshot_data: Json
          version_name?: string | null
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          session_id?: string
          snapshot_data?: Json
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "discovery_session_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "smart_discovery_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_reports: {
        Row: {
          content: Json
          created_at: string
          date_range: Json
          generated_by: string
          id: string
          metadata: Json | null
          project_ids: string[] | null
          report_type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          date_range?: Json
          generated_by: string
          id?: string
          metadata?: Json | null
          project_ids?: string[] | null
          report_type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          date_range?: Json
          generated_by?: string
          id?: string
          metadata?: Json | null
          project_ids?: string[] | null
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      insight_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          insight_id: string
          is_read: boolean | null
          target_users: string[] | null
        }
        Insert: {
          alert_message: string
          alert_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_id: string
          is_read?: boolean | null
          target_users?: string[] | null
        }
        Update: {
          alert_message?: string
          alert_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_id?: string
          is_read?: boolean | null
          target_users?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_alerts_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "unified_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_ai_insights: {
        Row: {
          alert_category: string | null
          confidence_score: number | null
          created_at: string
          criticality_score: number | null
          executive_summary: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          insight_data: Json
          insight_type: string
          issue_id: string | null
          project_id: string | null
        }
        Insert: {
          alert_category?: string | null
          confidence_score?: number | null
          created_at?: string
          criticality_score?: number | null
          executive_summary?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_data: Json
          insight_type: string
          issue_id?: string | null
          project_id?: string | null
        }
        Update: {
          alert_category?: string | null
          confidence_score?: number | null
          created_at?: string
          criticality_score?: number | null
          executive_summary?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          issue_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_ai_insights_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "jira_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_ai_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jira_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_configurations: {
        Row: {
          api_token_encrypted: string | null
          client_id: string | null
          created_at: string
          id: string
          jira_url: string
          last_sync_at: string | null
          organization_id: string | null
          project_keys: string[] | null
          sync_enabled: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          api_token_encrypted?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          jira_url: string
          last_sync_at?: string | null
          organization_id?: string | null
          project_keys?: string[] | null
          sync_enabled?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_token_encrypted?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          jira_url?: string
          last_sync_at?: string | null
          organization_id?: string | null
          project_keys?: string[] | null
          sync_enabled?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_configurations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_dashboard_widgets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          position_x: number | null
          position_y: number | null
          updated_at: string
          user_id: string
          widget_config: Json
          widget_type: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          position_x?: number | null
          position_y?: number | null
          updated_at?: string
          user_id: string
          widget_config: Json
          widget_type: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          position_x?: number | null
          position_y?: number | null
          updated_at?: string
          user_id?: string
          widget_config?: Json
          widget_type?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_dashboard_widgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_issues: {
        Row: {
          assignee_name: string | null
          components: string[] | null
          config_id: string | null
          created_at: string
          created_date: string | null
          description: string | null
          fix_versions: string[] | null
          id: string
          issue_type: string | null
          jira_id: string
          jira_key: string
          labels: string[] | null
          original_estimate: number | null
          priority: string | null
          project_key: string | null
          raw_data: Json | null
          remaining_estimate: number | null
          reporter_name: string | null
          resolved_date: string | null
          status: string | null
          story_points: number | null
          summary: string
          synced_at: string | null
          time_spent: number | null
          updated_date: string | null
        }
        Insert: {
          assignee_name?: string | null
          components?: string[] | null
          config_id?: string | null
          created_at?: string
          created_date?: string | null
          description?: string | null
          fix_versions?: string[] | null
          id?: string
          issue_type?: string | null
          jira_id: string
          jira_key: string
          labels?: string[] | null
          original_estimate?: number | null
          priority?: string | null
          project_key?: string | null
          raw_data?: Json | null
          remaining_estimate?: number | null
          reporter_name?: string | null
          resolved_date?: string | null
          status?: string | null
          story_points?: number | null
          summary: string
          synced_at?: string | null
          time_spent?: number | null
          updated_date?: string | null
        }
        Update: {
          assignee_name?: string | null
          components?: string[] | null
          config_id?: string | null
          created_at?: string
          created_date?: string | null
          description?: string | null
          fix_versions?: string[] | null
          id?: string
          issue_type?: string | null
          jira_id?: string
          jira_key?: string
          labels?: string[] | null
          original_estimate?: number | null
          priority?: string | null
          project_key?: string | null
          raw_data?: Json | null
          remaining_estimate?: number | null
          reporter_name?: string | null
          resolved_date?: string | null
          status?: string | null
          story_points?: number | null
          summary?: string
          synced_at?: string | null
          time_spent?: number | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_issues_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "jira_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_projects: {
        Row: {
          config_id: string | null
          created_at: string
          description: string | null
          id: string
          jira_id: string
          jira_key: string
          lead_name: string | null
          name: string
          project_type: string | null
          raw_data: Json | null
          synced_at: string | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          jira_id: string
          jira_key: string
          lead_name?: string | null
          name: string
          project_type?: string | null
          raw_data?: Json | null
          synced_at?: string | null
        }
        Update: {
          config_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          jira_id?: string
          jira_key?: string
          lead_name?: string | null
          name?: string
          project_type?: string | null
          raw_data?: Json | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_projects_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "jira_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_sprints: {
        Row: {
          board_id: string | null
          complete_date: string | null
          config_id: string | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          jira_id: string
          name: string
          project_key: string | null
          raw_data: Json | null
          start_date: string | null
          state: string | null
          synced_at: string | null
        }
        Insert: {
          board_id?: string | null
          complete_date?: string | null
          config_id?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          jira_id: string
          name: string
          project_key?: string | null
          raw_data?: Json | null
          start_date?: string | null
          state?: string | null
          synced_at?: string | null
        }
        Update: {
          board_id?: string | null
          complete_date?: string | null
          config_id?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          jira_id?: string
          name?: string
          project_key?: string | null
          raw_data?: Json | null
          start_date?: string | null
          state?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_sprints_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "jira_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_webhook_logs: {
        Row: {
          config_id: string | null
          created_at: string
          id: string
          issue_key: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          webhook_event: string
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          id?: string
          issue_key?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          webhook_event: string
        }
        Update: {
          config_id?: string | null
          created_at?: string
          id?: string
          issue_key?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          webhook_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_webhook_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "jira_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcriptions: {
        Row: {
          action_items: Json | null
          ai_summary: string | null
          audio_file_path: string | null
          client_id: string | null
          created_at: string | null
          created_by: string
          id: string
          key_decisions: Json | null
          language_detected: string | null
          meeting_name: string
          processing_status: string | null
          project_id: string | null
          sentiment_analysis: Json | null
          session_id: string | null
          session_type: string
          speakers: Json | null
          timestamps: Json | null
          transcription_quality: number | null
          transcription_text: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          ai_summary?: string | null
          audio_file_path?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          key_decisions?: Json | null
          language_detected?: string | null
          meeting_name: string
          processing_status?: string | null
          project_id?: string | null
          sentiment_analysis?: Json | null
          session_id?: string | null
          session_type: string
          speakers?: Json | null
          timestamps?: Json | null
          transcription_quality?: number | null
          transcription_text?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          ai_summary?: string | null
          audio_file_path?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          key_decisions?: Json | null
          language_detected?: string | null
          meeting_name?: string
          processing_status?: string | null
          project_id?: string | null
          sentiment_analysis?: Json | null
          session_id?: string | null
          session_type?: string
          speakers?: Json | null
          timestamps?: Json | null
          transcription_quality?: number | null
          transcription_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          alert_levels: string[] | null
          created_at: string | null
          id: string
          insight_types: string[] | null
          is_active: boolean | null
          notification_channels: string[] | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          alert_levels?: string[] | null
          created_at?: string | null
          id?: string
          insight_types?: string[] | null
          is_active?: boolean | null
          notification_channels?: string[] | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          alert_levels?: string[] | null
          created_at?: string | null
          id?: string
          insight_types?: string[] | null
          is_active?: boolean | null
          notification_channels?: string[] | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          ai_insights: Json | null
          analysis_status: string | null
          category: string | null
          extracted_content: string | null
          file_metadata: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          project_id: string | null
          storage_path: string | null
          transcription: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          ai_insights?: Json | null
          analysis_status?: string | null
          category?: string | null
          extracted_content?: string | null
          file_metadata?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          project_id?: string | null
          storage_path?: string | null
          transcription?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          ai_insights?: Json | null
          analysis_status?: string | null
          category?: string | null
          extracted_content?: string | null
          file_metadata?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          project_id?: string | null
          storage_path?: string | null
          transcription?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          ai_analysis: Json | null
          author_id: string | null
          content: string
          created_at: string | null
          department: string
          id: string
          priority: string | null
          project_id: string | null
          tags: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          author_id?: string | null
          content: string
          created_at?: string | null
          department: string
          id?: string
          priority?: string | null
          project_id?: string | null
          tags?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          department?: string
          id?: string
          priority?: string | null
          project_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_insights_comments: {
        Row: {
          ai_analysis: Json | null
          client_id: string | null
          content: string
          created_at: string | null
          created_by: string
          id: string
          insight_origin: string
          insight_type: string | null
          processed: boolean | null
          project_id: string
          tags: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          client_id?: string | null
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          insight_origin: string
          insight_type?: string | null
          processed?: boolean | null
          project_id: string
          tags?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          client_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          insight_origin?: string
          insight_type?: string | null
          processed?: boolean | null
          project_id?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_insights_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_insights_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          client_id: string | null
          configuration: Json
          created_at: string | null
          id: string
          integration_subtype: string | null
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          project_id: string
          sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          configuration: Json
          created_at?: string | null
          id?: string
          integration_subtype?: string | null
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          project_id: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          configuration?: Json
          created_at?: string | null
          id?: string
          integration_subtype?: string | null
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          project_id?: string
          sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_intelligence_profiles: {
        Row: {
          average_hourly_rate: number | null
          business_context: string | null
          created_at: string
          custom_prompts: Json | null
          id: string
          methodology: string | null
          project_id: string | null
          prompt_templates: Json | null
          story_points_to_hours: number | null
          success_metrics: Json | null
          updated_at: string
        }
        Insert: {
          average_hourly_rate?: number | null
          business_context?: string | null
          created_at?: string
          custom_prompts?: Json | null
          id?: string
          methodology?: string | null
          project_id?: string | null
          prompt_templates?: Json | null
          story_points_to_hours?: number | null
          success_metrics?: Json | null
          updated_at?: string
        }
        Update: {
          average_hourly_rate?: number | null
          business_context?: string | null
          created_at?: string
          custom_prompts?: Json | null
          id?: string
          methodology?: string | null
          project_id?: string | null
          prompt_templates?: Json | null
          story_points_to_hours?: number | null
          success_metrics?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_intelligence_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_type: string
          project_id: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type: string
          project_id: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_uploads: {
        Row: {
          analysis_data: Json | null
          file_name: string
          file_path: string
          id: string
          project_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          analysis_data?: Json | null
          file_name: string
          file_path: string
          id?: string
          project_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          analysis_data?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          project_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attachments: {
        Row: {
          ai_analysis: Json | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          session_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          ai_analysis?: Json | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          session_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          ai_analysis?: Json | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          session_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "smart_discovery_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_delivery_sessions: {
        Row: {
          created_at: string
          delivery_type: string
          id: string
          project_id: string | null
          results: Json | null
          session_data: Json
          session_metadata: Json | null
          session_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_type: string
          id?: string
          project_id?: string | null
          results?: Json | null
          session_data?: Json
          session_metadata?: Json | null
          session_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_type?: string
          id?: string
          project_id?: string | null
          results?: Json | null
          session_data?: Json
          session_metadata?: Json | null
          session_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_delivery_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_discovery_sessions: {
        Row: {
          business_canvas_data: Json | null
          can_create_project: boolean | null
          created_at: string
          current_stage: string
          discovery_name: string
          discovery_type: string | null
          export_history: Json | null
          final_document: Json | null
          finalized_at: string | null
          generated_backlog: Json | null
          id: string
          inception_data: Json | null
          parent_session_id: string | null
          pbb_data: Json | null
          project_id: string | null
          related_project_id: string | null
          session_metadata: Json | null
          session_name: string
          sprint0_data: Json | null
          stage_status: Json | null
          status: string
          updated_at: string
          user_id: string
          version_number: number | null
        }
        Insert: {
          business_canvas_data?: Json | null
          can_create_project?: boolean | null
          created_at?: string
          current_stage?: string
          discovery_name?: string
          discovery_type?: string | null
          export_history?: Json | null
          final_document?: Json | null
          finalized_at?: string | null
          generated_backlog?: Json | null
          id?: string
          inception_data?: Json | null
          parent_session_id?: string | null
          pbb_data?: Json | null
          project_id?: string | null
          related_project_id?: string | null
          session_metadata?: Json | null
          session_name: string
          sprint0_data?: Json | null
          stage_status?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          version_number?: number | null
        }
        Update: {
          business_canvas_data?: Json | null
          can_create_project?: boolean | null
          created_at?: string
          current_stage?: string
          discovery_name?: string
          discovery_type?: string | null
          export_history?: Json | null
          final_document?: Json | null
          finalized_at?: string | null
          generated_backlog?: Json | null
          id?: string
          inception_data?: Json | null
          parent_session_id?: string | null
          pbb_data?: Json | null
          project_id?: string | null
          related_project_id?: string | null
          session_metadata?: Json | null
          session_name?: string
          sprint0_data?: Json | null
          stage_status?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_discovery_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "smart_discovery_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_discovery_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_discovery_sessions_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_hub_chats: {
        Row: {
          attachments: Json
          chat_name: string
          created_at: string
          generated_artifacts: Json
          id: string
          messages: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          chat_name?: string
          created_at?: string
          generated_artifacts?: Json
          id?: string
          messages?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          chat_name?: string
          created_at?: string
          generated_artifacts?: Json
          id?: string
          messages?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_hub_uploads: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          processing_status: string | null
          session_id: string
          session_type: string
          stage_name: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          processing_status?: string | null
          session_id: string
          session_type: string
          stage_name: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          processing_status?: string | null
          session_id?: string
          session_type?: string
          stage_name?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          allocation: number | null
          cost: number
          cost_type: string
          end_date: string | null
          id: string
          name: string
          project_id: string | null
          role: string
          seniority: string
          start_date: string | null
        }
        Insert: {
          allocation?: number | null
          cost: number
          cost_type: string
          end_date?: string | null
          id?: string
          name: string
          project_id?: string | null
          role: string
          seniority: string
          start_date?: string | null
        }
        Update: {
          allocation?: number | null
          cost?: number
          cost_type?: string
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string | null
          role?: string
          seniority?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_annotations: {
        Row: {
          annotation_type: string
          content: string
          created_at: string | null
          created_by: string
          id: string
          timestamp_end: number | null
          timestamp_start: number
          transcription_id: string
        }
        Insert: {
          annotation_type: string
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          timestamp_end?: number | null
          timestamp_start: number
          transcription_id: string
        }
        Update: {
          annotation_type?: string
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          timestamp_end?: number | null
          timestamp_start?: number
          transcription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_annotations_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_insights: {
        Row: {
          client_id: string | null
          confidence_score: number | null
          content: string
          created_at: string | null
          created_by: string | null
          criticality_score: number | null
          expires_at: string | null
          id: string
          insight_category: string | null
          insight_type: string
          metadata: Json | null
          project_id: string | null
          source_id: string | null
          source_origin: string | null
          source_type: string
          title: string
        }
        Insert: {
          client_id?: string | null
          confidence_score?: number | null
          content: string
          created_at?: string | null
          created_by?: string | null
          criticality_score?: number | null
          expires_at?: string | null
          id?: string
          insight_category?: string | null
          insight_type: string
          metadata?: Json | null
          project_id?: string | null
          source_id?: string | null
          source_origin?: string | null
          source_type: string
          title: string
        }
        Update: {
          client_id?: string | null
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          criticality_score?: number | null
          expires_at?: string | null
          id?: string
          insight_category?: string | null
          insight_type?: string
          metadata?: Json | null
          project_id?: string | null
          source_id?: string | null
          source_origin?: string | null
          source_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          role_in_organization: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role_in_organization?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role_in_organization?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_participations: {
        Row: {
          allocation_percentage: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          end_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          jira_project_key: string
          jira_project_name: string | null
          monthly_salary: number | null
          role: Database["public"]["Enums"]["project_role"]
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_percentage?: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          jira_project_key: string
          jira_project_name?: string | null
          monthly_salary?: number | null
          role: Database["public"]["Enums"]["project_role"]
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          jira_project_key?: string
          jira_project_name?: string | null
          monthly_salary?: number | null
          role?: Database["public"]["Enums"]["project_role"]
          start_date?: string | null
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
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_stage_completeness: {
        Args: { session_data: Json; stage_name: string }
        Returns: boolean
      }
    }
    Enums: {
      contract_type: "clt" | "pj" | "freelancer" | "consultant"
      project_role:
        | "developer"
        | "tech_lead"
        | "scrum_master"
        | "product_owner"
        | "designer"
        | "qa_engineer"
        | "devops_engineer"
        | "architect"
        | "agile_coach"
        | "business_analyst"
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
      contract_type: ["clt", "pj", "freelancer", "consultant"],
      project_role: [
        "developer",
        "tech_lead",
        "scrum_master",
        "product_owner",
        "designer",
        "qa_engineer",
        "devops_engineer",
        "architect",
        "agile_coach",
        "business_analyst",
      ],
    },
  },
} as const
