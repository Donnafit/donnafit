import type { Database } from "@/lib/supabase/database.types"

// Row types (what comes from DB queries)
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Product = Database["public"]["Tables"]["products"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

// Discriminated union types extracted from Row types
export type OrderStatus = Order["status"]
export type StockType = Product["stock_type"]
export type DeliveryType = Order["delivery_type"]
export type PaymentMethod = Order["payment_method"]
export type UserRole = Profile["role"]

// Client-side cart types (not stored in DB)
export interface CartItem {
  product: Product
  quantity: number
}

// Joined query result (order with its items and products)
export interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product | null })[]
}
