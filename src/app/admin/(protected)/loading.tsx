export default function AdminLoading() {
  return (
    <div style={{
      height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "3px solid var(--gold-500, #C89B3C)",
        borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
