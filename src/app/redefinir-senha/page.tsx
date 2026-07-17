"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  IconLock, ErrorMsg, SuccessMsg, Field, EyeBtn, PrimaryBtn, BrandHeader,
} from "@/components/ui/AuthFormKit"

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // O link de recuperação chega com o token na URL — o client do Supabase
  // troca esse token por sessão automaticamente e dispara PASSWORD_RECOVERY.
  useEffect(() => {
    let sessionFound = false
    const supabase = createClient()
    const markReady = () => { sessionFound = true; setReady(true) }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady()
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })
    const timer = setTimeout(() => { if (!sessionFound) setInvalidLink(true) }, 5000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres."); return }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError("Erro ao redefinir senha. Tente novamente."); return }
    setSuccess(true)
    setTimeout(() => router.push("/"), 2000)
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)", padding: 20,
    }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
        <BrandHeader title="Donna FIT" subtitle="Redefinir senha" />
        <div style={{ padding: "24px 24px 28px" }}>
          {success ? (
            <SuccessMsg success="Senha redefinida! Redirecionando..." />
          ) : invalidLink ? (
            <ErrorMsg error="Link inválido ou expirado. Solicite uma nova recuperação de senha." />
          ) : !ready ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E5E0D8", borderTopColor: "#5A6B2A", animation: "spin 0.6s linear infinite" }} />
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
                Escolha sua nova senha de acesso.
              </p>
              <ErrorMsg error={error} />
              <form onSubmit={handleSubmit}>
                <Field
                  label="Nova senha" type={showPassword ? "text" : "password"}
                  value={password} onChange={setPassword}
                  placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                  icon={<IconLock />}
                  rightEl={<EyeBtn show={showPassword} toggle={() => setShowPassword((v) => !v)} />}
                />
                <Field
                  label="Confirmar nova senha" type={showPassword ? "text" : "password"}
                  value={confirmPassword} onChange={setConfirmPassword}
                  placeholder="Repita a senha" autoComplete="new-password"
                  icon={<IconLock />}
                />
                <PrimaryBtn label="Redefinir senha" loading={loading} />
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
