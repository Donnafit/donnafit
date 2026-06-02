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
      products: {
        Row: {
          id: string
          category_id: string | null
          sku: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          stock_type: "combo" | "avulso"
          stock_quantity: number
          min_stock_alert: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          sku?: string | null
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          stock_type?: "combo" | "avulso"
          stock_quantity?: number
          min_stock_alert?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          sku?: string | null
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          stock_type?: "combo" | "avulso"
          stock_quantity?: number
          min_stock_alert?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
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
          status: "pending" | "production" | "ready" | "delivered" | "cancelled"
          subtotal: number
          total: number
          notes: string | null
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
          status?: "pending" | "production" | "ready" | "delivered" | "cancelled"
          subtotal: number
          total: number
          notes?: string | null
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
          status?: "pending" | "production" | "ready" | "delivered" | "cancelled"
          subtotal?: number
          total?: number
          notes?: string | null
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
          role: "admin" | "kitchen" | "staff"
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: "admin" | "kitchen" | "staff"
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: "admin" | "kitchen" | "staff"
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
      deduct_stock: {
        Args: { p_product_id: string; p_quantity: number; p_order_id: string }
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
