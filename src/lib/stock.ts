import type { Product } from "@/types"

type StockCheckable = Pick<
  Product,
  "is_active" | "stock_type" | "stock_quantity" | "rice_stock_mode" | "rice_stock_integral" | "rice_stock_branco"
>

// Combos não têm stock_quantity própria (reserva real é por componente, no
// back-end). Produtos com rice_stock_mode "both" também não usam
// stock_quantity — o estoque real mora em rice_stock_integral/branco, e o
// produto só está esgotado se AMBOS os tipos estiverem zerados.
export function isProductSoldOut(product: StockCheckable): boolean {
  if (!product.is_active) return true
  if (product.stock_type === "combo") return false
  if (product.rice_stock_mode === "both") {
    return (product.rice_stock_integral ?? 0) <= 0 && (product.rice_stock_branco ?? 0) <= 0
  }
  return product.stock_quantity <= 0
}

// Quantas marmitas 1 unidade deste produto representa. Um combo conta pela
// composição real (combo_marmitas_count, mantido em sincronia por trigger a
// partir de combo_items) — não como 1 unidade, senão regras como o mínimo
// de frete ficam incorretas para pedidos com combo. Combo sem composição
// cadastrada ainda conta como 1, pra não travar a venda por um problema de
// cadastro.
export function getMarmitasPerUnit(
  product: Pick<Product, "stock_type" | "combo_marmitas_count">
): number {
  if (product.stock_type !== "combo") return 1
  return product.combo_marmitas_count > 0 ? product.combo_marmitas_count : 1
}
