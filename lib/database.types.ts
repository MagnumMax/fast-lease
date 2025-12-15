export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          status: Database["public"]["Enums"]["user_status"]
          full_name: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          emirates_id: string | null
          passport_number: string | null
          nationality: string | null
          residency_status: string | null
          date_of_birth: string | null
          address: Json
          employment_info: Json
          financial_profile: Json
          metadata: Json
          timezone: string | null
          avatar_url: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
          source: string | null
          entity_type: "personal" | "company" | null
          seller_details: Json
        }
        Insert: {
          id?: string
          user_id: string
          status?: Database["public"]["Enums"]["user_status"]
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          emirates_id?: string | null
          passport_number?: string | null
          nationality?: string | null
          residency_status?: string | null
          date_of_birth?: string | null
          address?: Json
          employment_info?: Json
          financial_profile?: Json
          metadata?: Json
          timezone?: string | null
          avatar_url?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          source?: string | null
          entity_type?: "personal" | "company" | null
          seller_details?: Json
        }
        Update: {
          id?: string
          user_id?: string
          status?: Database["public"]["Enums"]["user_status"]
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          emirates_id?: string | null
          passport_number?: string | null
          nationality?: string | null
          residency_status?: string | null
          date_of_birth?: string | null
          address?: Json
          employment_info?: Json
          financial_profile?: Json
          metadata?: Json
          timezone?: string | null
          avatar_url?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          source?: string | null
          entity_type?: "personal" | "company" | null
          seller_details?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
          assigned_at: string
          assigned_by: string | null
          metadata: Json
          created_at: string
          updated_at: string
          portal: Database["public"]["Enums"]["portal_code"]
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
          assigned_at?: string
          assigned_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          portal?: Database["public"]["Enums"]["portal_code"]
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          assigned_at?: string
          assigned_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          portal?: Database["public"]["Enums"]["portal_code"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      vehicles: {
        Row: {
          id: string
          vin: string | null
          make: string | null
          model: string | null
          variant: string | null
          year: number | null
          body_type: string | null
          fuel_type: string | null
          transmission: string | null
          engine_capacity: number | null
          mileage: number | null
          color_exterior: string | null
          color_interior: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          features: Json
          created_at: string
          updated_at: string
          license_plate: string | null
        }
        Insert: {
          id?: string
          vin?: string | null
          make?: string | null
          model?: string | null
          variant?: string | null
          year?: number | null
          body_type?: string | null
          fuel_type?: string | null
          transmission?: string | null
          engine_capacity?: number | null
          mileage?: number | null
          color_exterior?: string | null
          color_interior?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          features?: Json
          created_at?: string
          updated_at?: string
          license_plate?: string | null
        }
        Update: {
          id?: string
          vin?: string | null
          make?: string | null
          model?: string | null
          variant?: string | null
          year?: number | null
          body_type?: string | null
          fuel_type?: string | null
          transmission?: string | null
          engine_capacity?: number | null
          mileage?: number | null
          color_exterior?: string | null
          color_interior?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          features?: Json
          created_at?: string
          updated_at?: string
          license_plate?: string | null
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
      user_status: "pending" | "active" | "suspended" | "archived"
      user_role:
        | "CLIENT"
        | "OPERATOR"
        | "OP_MANAGER"
        | "ADMIN"
        | "INVESTOR"
        | "FINANCE"
        | "SUPPORT"
        | "TECH_SPECIALIST"
        | "RISK_MANAGER"
        | "LEGAL"
        | "ACCOUNTING"
        | "OPS_MANAGER"
        | "SELLER"
      portal_code: "app" | "investor" | "client" | "partner" | "seller"
      vehicle_status: "draft" | "available" | "reserved" | "leased" | "maintenance" | "retired"
      application_status: "draft" | "submitted" | "in_review" | "on_hold" | "approved" | "rejected" | "cancelled" | "converted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
