import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display font-black text-xl text-gray-900">
            Finalizar Pedido
          </h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        <CheckoutForm />
      </main>
    </div>
  )
}
