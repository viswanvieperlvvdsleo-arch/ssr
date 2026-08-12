"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const MODULES = [
  "SAP SD – Sales & Distribution",
  "SAP MM – Materials Management",
  "SAP HCM – Human Capital Management",
  "SAP PP – Production Planning",
  "SAP FI – Financial Accounting",
  "SAP FICO – Finance & Controlling",
  "SAP QM – Quality Management",
  "SAP PM – Plant Maintenance",
  "SAP TRM – Treasury & Risk Management",
  "Not sure yet",
];

export default function ServiceAuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  // States
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("register"); // "register" | "login"
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [module, setModule] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = pathname?.startsWith("/admin");
  const isServices = pathname?.startsWith("/services");

  // Check if user is already logged in
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem("ssr_user") || "null"); } catch { return null; }
  };

  // 10-second popup on any non-admin, non-services page
  useEffect(() => {
    if (isAdmin || isServices) return;
    
    // Bypass if admin is in edit mode
    const isEditMode = sessionStorage.getItem("ssr_is_edit_mode") === "true";
    if (isEditMode) return;

    const user = getUser();
    if (user) return; // already logged in, no popup
    const dismissed = sessionStorage.getItem("banner_dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setShowBanner(true), 10000);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Gate services page — if not logged in, show modal immediately
  useEffect(() => {
    if (!isServices) return;
    
    // Bypass auth gate if admin is in edit mode
    const isEditMode = sessionStorage.getItem("ssr_is_edit_mode") === "true";
    if (isEditMode) return;

    const user = getUser();
    if (!user) {
      setShowModal(true);
      setModalMode("register");
    }
  }, [pathname]);

  const dismissBanner = () => {
    setShowBanner(false);
    setBannerDismissed(true);
    sessionStorage.setItem("banner_dismissed", "1");
  };

  const openModalFromBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("banner_dismissed", "1");
    router.push("/services");
    // modal will open via the services gate effect above
  };

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setFormError("Please enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);

    const userData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      module: module || "Not selected",
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage (no password stored plain — hash-like)
    const stored = { ...userData, passwordHash: btoa(password) };
    localStorage.setItem("ssr_user", JSON.stringify(stored));

    // Send to backend (frontend-only for now — graceful fail)
    try {
      await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
    } catch (_) { /* graceful fail */ }

    setLoading(false);
    setShowModal(false);
    // Let services page load
    router.refresh?.();
  };

  // Login
  const handleLogin = (e) => {
    e.preventDefault();
    setFormError("");
    const stored = getUser();
    if (!stored) {
      setFormError("No account found. Please register first.");
      return;
    }
    if (stored.email !== loginEmail.trim()) {
      setFormError("Email not found.");
      return;
    }
    if (atob(stored.passwordHash) !== loginPass) {
      setFormError("Incorrect password.");
      return;
    }
    setShowModal(false);
  };

  return (
    <>
      {/* ── 10-SECOND POPUP BANNER ── */}
      {showBanner && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99990,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 80px", pointerEvents: "none",
        }}>
          <div style={{
            pointerEvents: "all",
            background: "linear-gradient(135deg, rgba(0,50,120,0.97), rgba(0,20,60,0.97))",
            border: "1.5px solid rgba(0,153,255,0.4)",
            borderRadius: "20px",
            padding: "20px 24px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            animation: "slideUpBanner 0.5s cubic-bezier(0.34,1.4,0.64,1)",
            display: "flex", alignItems: "center", gap: "16px",
          }}>
            <div style={{ fontSize: "2rem" }}>🎓</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>
                Want to see our training modules?
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Book a demo or explore courses available now.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={openModalFromBanner} style={{
                background: "linear-gradient(135deg,#0066aa,#0099ff)",
                border: "none", borderRadius: "10px", padding: "8px 16px",
                color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                View Modules
              </button>
              <button onClick={dismissBanner} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px", padding: "6px 14px",
                color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", cursor: "pointer",
              }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN / REGISTER MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99995,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(145deg,#0b1628,#0d1e3a)",
            border: "1.5px solid rgba(0,153,255,0.3)",
            borderRadius: "20px",
            padding: "24px 20px",
            width: "100%", maxWidth: "440px",
            maxHeight: "95vh",
            overflowY: "auto",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            animation: "modalPop 0.4s cubic-bezier(0.34,1.4,0.64,1)",
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowModal(false);
                router.push("/");
              }}
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "rgba(255,255,255,0.1)", border: "none",
                borderRadius: "50%", width: "32px", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.7)", fontSize: "1.2rem",
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.2)"; e.target.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.7)"; }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <img src="/ssrlogo.jpeg" alt="SSR" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />
              <h2 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px" }}>
                {modalMode === "register" ? "Create Your Account" : "Welcome Back"}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", margin: 0 }}>
                {modalMode === "register"
                  ? "Sign up to access SSR training modules"
                  : "Sign in to continue to SSR services"}
              </p>
            </div>

            {/* Error */}
            {formError && (
              <div style={{
                background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.35)",
                borderRadius: "10px", padding: "8px 12px", marginBottom: "12px",
                color: "#ff8080", fontSize: "0.85rem",
              }}>
                {formError}
              </div>
            )}

            {/* REGISTER FORM */}
            {modalMode === "register" ? (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <InputField label="Full Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                <InputField label="Phone Number *" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" type="tel" />
                <InputField label="Email Address *" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
                <InputField label="Password *" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" type="password" />
                <div>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                    Interested Module (Optional)
                  </label>
                  <select value={module} onChange={e => setModule(e.target.value)} style={{
                    width: "100%", padding: "11px 14px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
                    color: module ? "#fff" : "rgba(255,255,255,0.4)", fontSize: "0.9rem",
                    outline: "none", cursor: "pointer",
                  }}>
                    <option value="" style={{ background: "#0d1e3a" }}>Select a module...</option>
                    {MODULES.map(m => <option key={m} value={m} style={{ background: "#0d1e3a" }}>{m}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={loading} style={{
                  marginTop: "8px", padding: "13px", borderRadius: "12px",
                  background: "linear-gradient(135deg,#0066aa,#0099ff)",
                  border: "none", color: "#fff", fontSize: "1rem", fontWeight: 700,
                  cursor: "pointer", transition: "opacity 0.2s",
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? "Creating Account..." : "Create Account & Continue →"}
                </button>
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "0.83rem", margin: 0 }}>
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setModalMode("login"); setFormError(""); }}
                    style={{ background: "none", border: "none", color: "#4fc3f7", cursor: "pointer", fontWeight: 700, fontSize: "0.83rem" }}>
                    Sign In
                  </button>
                </p>
              </form>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <InputField label="Email Address *" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" type="email" />
                <InputField label="Password *" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Your password" type="password" />
                <button type="submit" style={{
                  marginTop: "8px", padding: "13px", borderRadius: "12px",
                  background: "linear-gradient(135deg,#0066aa,#0099ff)",
                  border: "none", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                }}>
                  Sign In →
                </button>
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "0.83rem", margin: 0 }}>
                  New here?{" "}
                  <button type="button" onClick={() => { setModalMode("register"); setFormError(""); }}
                    style={{ background: "none", border: "none", color: "#4fc3f7", cursor: "pointer", fontWeight: 700, fontSize: "0.83rem" }}>
                    Create Account
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes modalPop {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={{
        display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem",
        fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px",
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={label.includes("*")}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: "12px", boxSizing: "border-box",
          background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
          color: "#fff", fontSize: "0.9rem", outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "rgba(0,153,255,0.5)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
      />
    </div>
  );
}
