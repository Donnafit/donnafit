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
      announcements: {
        Row: {
          id: string
          text: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      store_settings: {
        Row: {
          id: string
          store_name: string
          whatsapp: string | null
          open_hour: number
          close_hour: number
          order_sound: boolean
          pix_discount_rate: number
          pickup_address: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          store_name?: string
          whatsapp?: string | null
          open_hour?: number
          close_hour?: number
          order_sound?: boolean
          pix_discount_rate?: number
          pickup_address?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          store_name?: string
          whatsapp?: string | null
          open_hour?: number
          close_hour?: number
          order_sound?: boolean
          pix_discount_rate?: number
          pickup_address?: string | null
          updated_at?: string
        }
      }
      delivery_zones: {
        Row: {
          name: string
          fee: number
          active: boolean
        }
        Insert: {
          name: string
          fee: number
          active?: boolean
        }
        Update: {
          name?: string
          fee?: number
          active?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          created_at?: string
        }
      }
      customer_profiles: {
        Row: {
          phone: string
          name: string
          email: string | null
          preferred_delivery: string
          preferred_payment: string
          preferred_categories: Json
          preferred_products: Json
          total_orders: number
          total_spent: number
          last_order_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          phone: string
          name: string
          email?: string | null
          preferred_delivery?: string
          preferred_payment?: string
          preferred_categories?: Json
          preferred_products?: Json
          total_orders?: number
          total_spent?: number
          last_order_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          phone?: string
          name?: string
          email?: string | null
          preferred_delivery?: string
          preferred_payment?: string
          preferred_categories?: Json
          preferred_products?: Json
          total_orders?: number
          total_spent?: number
          last_order_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          sku: string | null
          name: string
          description: string | null
          prep_instructions: string | null
          price: number
          image_url: string | null
          stock_type: "combo" | "individual"
          stock_quantity: number
          min_stock_alert: number
          is_active: boolean
          sort_order: number
          rice_integral_available: boolean
          rice_stock_mode: "none" | "integral" | "branco" | "both"
          rice_stock_integral: number | null
          rice_stock_branco: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          sku?: string | null
          name: string
          description?: string | null
          prep_instructions?: string | null
          price: number
          image_url?: string | null
          stock_type?: "combo" | "individual"
          stock_quantity?: number
          min_stock_alert?: number
          is_active?: boolean
          sort_order?: number
          rice_integral_available?: boolean
          rice_stock_mode?: "none" | "integral" | "branco" | "both"
          rice_stock_integral?: number | null
          rice_stock_branco?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          sku?: string | null
          name?: string
          description?: string | null
          prep_instructions?: string | null
          price?: number
          image_url?: string | null
          stock_type?: "combo" | "individual"
          stock_quantity?: number
          min_stock_alert?: number
          is_active?: boolean
          sort_order?: number
          rice_integral_available?: boolean
          rice_stock_mode?: "none" | "integral" | "branco" | "both"
          rice_stock_integral?: number | null
          rice_stock_branco?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      combo_items: {
        Row: {
          id: string
          combo_product_id: string
          component_product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          combo_product_id: string
          component_product_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          combo_product_id?: string
          component_product_id?: string
          quantity?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_phone: string
          delivery_type: "delivery" | "pickup"
          payment_method: "pix" | "card"
          status: "pending" | "production" | "ready" | "out_for_delivery" | "delivered" | "cancelled"
          subtotal: number
          total: number
          notes: string | null
          delivery_address: string | null
          delivery_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          customer_name: string
          customer_phone: string
          delivery_type: "delivery" | "pickup"
          payment_method: "pix" | "card"
          status?: "pending" | "production" | "ready" | "out_for_delivery" | "delivered" | "cancelled"
          subtotal: number
          total: number
          notes?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          customer_phone?: string
          delivery_type?: "delivery" | "pickup"
          payment_method?: "pix" | "card"
          status?: "pending" | "production" | "ready" | "out_for_delivery" | "delivered" | "cancelled"
          subtotal?: number
          total?: number
          notes?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: "reservation" | "deduction" | "adjustment" | "restock" | "cancellation"
          quantity: number
          reference_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          type: "reservation" | "deduction" | "adjustment" | "restock" | "cancellation"
          quantity: number
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          type?: "reservation" | "deduction" | "adjustment" | "restock" | "cancellation"
          quantity?: number
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: "admin" | "kitchen" | "staff" | "customer"
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: "admin" | "kitchen" | "staff" | "customer"
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: "admin" | "kitchen" | "staff" | "customer"
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      reserve_stock: {
        Args: { p_product_id: string; p_quantity: number; p_order_id: string }
        Returns: void
      }
      reserve_rice_stock: {
        Args: { p_product_id: string; p_rice_type: string; p_quantity: number; p_order_id: string }
        Returns: void
      }
      adjust_stock: {
        Args: { p_product_id: string; p_new_quantity: number; p_notes?: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
