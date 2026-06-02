interface Props {
  stockQuantity: number
  minAlert: number
  isActive: boolean
}

export function StockBadge({ stockQuantity, minAlert, isActive }: Props) {
  if (!isActive || stockQuantity <= 0) {
    return (
      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        Esgotado
      </span>
    )
  }
  if (stockQuantity <= minAlert) {
    return (
      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        Últimas {stockQuantity}
      </span>
    )
  }
  return null
}
