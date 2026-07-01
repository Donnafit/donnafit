import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

/**
 * Resolve image URL para funcionar corretamente no browser.
 *
 * Google Drive retorna uma página de aviso de download para
 * o formato `uc?export=view&id=...`. Convertemos para o endpoint
 * de thumbnail do CDN do Google (`thumbnail?id=...&sz=wN`) que
 * entrega a imagem diretamente sem redirect de confirmação.
 *
 * Supabase Storage e outras URLs passam sem modificação.
 */
export function resolveImageSrc(
  url: string | null | undefined,
  size: number = 640
): string {
  if (!url) return "/marmita.jpg"

  // Já é uma URL de thumbnail do Google — mantém
  if (url.includes("drive.google.com/thumbnail")) return url

  // Formato uc?export=view ou uc?id= — converte para thumbnail CDN
  if (url.includes("drive.google.com/uc")) {
    const match = url.match(/[?&]id=([^&]+)/)
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`
    }
  }

  // Formato /file/d/ID/view — extrai o ID
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([^/]+)/)
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`
    }
  }

  // Supabase Storage, S3, ou qualquer outra URL — retorna diretamente
  return url
}

