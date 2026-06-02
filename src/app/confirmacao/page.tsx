import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface Props {
  searchParams: { id?: string }
}

export default function ConfirmacaoPage({ searchParams }: Props) {
  const orderNumber = searchParams.id ?? "—"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 className="h-20 w-20 text-brand-gold mb-4" />
      <h1 className="font-display font-black text-2xl text-gray-900 mb-2">
        Pedido enviado!
      </h1>
      <p className="text-gray-500 mb-1">
        Seu pedido foi registrado com sucesso.
      </p>
      <p className="text-3xl font-black text-brand-gold mb-6">
        #{orderNumber}
      </p>

      <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-left shadow-sm space-y-3 mb-8">
        <p className="text-sm text-gray-600">
          ✅ Mensagem enviada para o WhatsApp da Donna FIT com todos os detalhes.
        </p>
        <p className="text-sm text-gray-600">
          📱 Se o WhatsApp não abriu, guarde o número <strong>#{orderNumber}</strong> e entre em contato pelo WhatsApp: (41) 99915-4720.
        </p>
        <p className="text-sm text-gray-600">
          🍱 Produção D+1 — seu pedido ficará pronto para entrega no dia seguinte.
        </p>
      </div>

      <Button
        asChild
        className="rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white h-12 px-8 font-bold"
      >
        <Link href="/">← Ver Cardápio</Link>
      </Button>
    </div>
  )
}
