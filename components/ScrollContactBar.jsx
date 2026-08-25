"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ScrollContactBar() {
  const [isMounted, setIsMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState("+91 9010062578");
  const [email, setEmail] = useState("sales@ssrbusinesssolutions.com");
  const pathname = usePathname();

  const isAdmin = pathname?.startsWith("/admin");
  const isApp = pathname?.startsWith("/ssr-app");

  useEffect(() => {
    setIsMounted(true);
    if (isAdmin || isApp) return;
    const p = localStorage.getItem("ssr_cms_phone");
    const e = localStorage.getItem("ssr_cms_email");
    if (p) setPhone(p);
    if (e) setEmail(e);
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isAdmin, isApp]);

  if (!isMounted || isAdmin || isApp) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.34,1.2,0.64,1)",
        display: "flex",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,9,20,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Call Now */}
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "14px 12px",
          textDecoration: "none",
          color: "#fff",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          transition: "background 0.25s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,150,255,0.15)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ fontSize: "1.3rem" }}>📞</span>
        <div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Call Now</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4fc3f7" }}>{phone}</div>
        </div>
      </a>

      {/* Mail Us */}
      <a
        href={`mailto:${email}`}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "14px 12px",
          textDecoration: "none",
          color: "#fff",
          transition: "background 0.25s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,200,120,0.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ fontSize: "1.3rem" }}>✉️</span>
        <div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Mail Us</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4fc3f7" }}>{email}</div>
        </div>
      </a>
    </div>
  );
}
