"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ErrorMsg, Field, PrimaryBtn, BrandHeader, IconEmail, IconLock, EyeBtn } from "@/components/ui/AuthFormKit"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  // Se já existe uma sessão válida de equipe, pula o formulário e vai direto
  // pro painel — antes disso, essa tela sempre pedia login de novo mesmo com
  // sessão ativa, porque nunca checava se já tinha usuário logado.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    supabase.auth.getUser().then(async ({ data }: any) => {
      if (!data.user) {
        setCheckingSession(false)
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()
      if (profile && ["admin", "kitchen"].includes(profile.role)) {
        router.replace("/admin/pedidos")
      } else {
        setCheckingSession(false)
      }
    })
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr || !signInData.user) {
      setError("E-mail ou senha incorretos.")
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single()

    if (!profile || !["admin", "kitchen"].includes(profile.role)) {
      await supabase.auth.signOut()
      setError("Essa conta não tem acesso ao painel administrativo.")
      setLoading(false)
      return
    }

    router.push("/admin/pedidos")
    router.refresh()
  }

  if (checkingSession) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D3D14 50%, #3D5018 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.25)", borderTopColor: "#C89B3C", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D3D14 50%, #3D5018 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 380, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
        <BrandHeader title="Área Administrativa" subtitle="Painel Donna FIT" />
        <div style={{ padding: "24px 24px 28px" }}>
          <h2 style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 17, color: "#1A1A1A", margin: "0 0 4px", textAlign: "center" }}>
            Bem-vindo de volta
          </h2>
          <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#999", margin: "0 0 20px", lineHeight: 1.5, textAlign: "center" }}>
            Entre com sua conta de equipe pra gerenciar pedidos, cozinha e estoque.
          </p>
          <ErrorMsg error={error} />
          <form onSubmit={handleLogin}>
            <Field label="E-mail" type="email" value={email} onChange={setEmail}
              placeholder="seu@email.com" autoComplete="email" icon={<IconEmail />} />
            <Field
              label="Senha" type={showPass ? "text" : "password"}
              value={password} onChange={setPassword}
              placeholder="••••••••" autoComplete="current-password"
              icon={<IconLock />}
              rightEl={<EyeBtn show={showPass} toggle={() => setShowPass((v) => !v)} />}
            />
            <PrimaryBtn label={loading ? "Entrando..." : "Entrar"} loading={loading} />
          </form>
        </div>
      </div>
    </div>
  )
}
