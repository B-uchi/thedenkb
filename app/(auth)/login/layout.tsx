export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
        opacity: 0.4,
      }} />
      {/* Accent glow */}
      <div style={{
        position: "absolute",
        width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(232,255,71,0.06) 0%, transparent 70%)",
        top: "20%", left: "50%", transform: "translateX(-50%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        {children}
      </div>
    </div>
  );
}
