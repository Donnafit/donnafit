/**
 * Detecta navegadores embutidos (in-app browsers) de apps como Instagram,
 * Facebook, WhatsApp, TikTok, Line e WebViews Android genéricas.
 *
 * Esses navegadores restringem window.open(): em vez de abrir uma aba nova
 * de verdade, ele sequestra a navegação da própria página. Foi exatamente
 * isso que quebrou o checkout em 03/08/2026 (commit 2bd569f) — um
 * window.open("", "_blank") pré-aberto no clique do cliente navegou a
 * página inteira pro WhatsApp antes do pedido confirmar, em vez de abrir
 * aba nova.
 *
 * Usado pra decidir quando é seguro pré-abrir a aba do WhatsApp no clique
 * do checkout e quando é mais seguro deixar a abertura só pelo botão
 * manual (link <a>) da tela de confirmação.
 */
export function isRestrictedInAppBrowser(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  if (!ua) return false
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|TikTok|musical_ly|; ?wv\)/i.test(ua)
}
