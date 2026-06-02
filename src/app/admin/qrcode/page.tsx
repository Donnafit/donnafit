"use client"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
)

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://donnafit.com.br"

export default function QRCodePage() {
  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-black mb-6">QR Code para Rotulos</h1>
      <p className="text-sm text-gray-400 mb-6">
        Imprima e cole nos rotulos das marmitas. O cliente escaneia e cai
        direto no cardapio.
      </p>

      <div className="bg-white rounded-3xl p-8 max-w-xs mx-auto text-center shadow-xl">
        <QRCodeSVG
          value={SITE_URL}
          size={200}
          bgColor="#FFFFFF"
          fgColor="#1A1A1A"
          level="H"
          className="mx-auto"
        />
        <p className="text-gray-700 font-semibold mt-4 text-sm break-all">
          {SITE_URL}
        </p>
        <p className="text-gray-400 text-xs mt-1">Faca seu pedido aqui!</p>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          onClick={() => window.print()}
          className="w-full max-w-xs h-12 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold gap-2"
        >
          Imprimir QR Code
        </Button>
      </div>
    </div>
  )
}
