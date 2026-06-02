export function generateLocalOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `DF${num}`
}
