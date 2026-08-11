"use client";

import React from "react";
import Link from "next/link";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "./CMSContext";
import EditableText from "./EditableText";

export default function Sidebar() {
  const { globalContent, updateContent, isEditMode } = useCMS() || {};
  const sidebarData = globalContent?.sidebar || DEFAULT_GLOBAL_CONTENT.sidebar;

  const setSidebar = (key, val) => updateContent?.("sidebar", key, val);

  const handleUpdateService = (index, field, val) => {
    const updated = [...(sidebarData.services || [])];
    updated[index] = { ...updated[index], [field]: val };
    setSidebar("services", updated);
  };

  const handleAddService = () => {
    const updated = [
      ...(sidebarData.services || []),
      { id: `s_${Date.now()}`, label: "New Service", href: "/services" }
    ];
    setSidebar("services", updated);
  };

  const handleDeleteService = (index) => {
    const updated = (sidebarData.services || []).filter((_, i) => i !== index);
    setSidebar("services", updated);
  };

  return (
    <aside className="fade-right">
      {/* OUR SERVICES BLOCK */}
      <div className="sidebar-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>
            <EditableText
              tagName="span"
              value={sidebarData.servicesTitle}
              onChange={(val) => setSidebar("servicesTitle", val)}
            />
          </h3>
          {isEditMode && (
            <button
              onClick={handleAddService}
              style={{
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              ➕ Add Link
            </button>
          )}
        </div>

        <ul className="sidebar-links" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {(sidebarData.services || []).map((s, idx) => (
            <li key={s.id || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              {isEditMode ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <span>-&gt;</span>
                  <EditableText
                    tagName="span"
                    value={s.label}
                    onChange={(val) => handleUpdateService(idx, "label", val)}
                  />
                  <button
                    onClick={() => handleDeleteService(idx)}
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      color: "#fca5a5",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      fontSize: "10px",
                      cursor: "pointer",
                      marginLeft: "auto"
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <Link href={s.href || "/services"}>
                  -&gt; {s.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* CONTACT INFO BLOCK */}
      <div className="sidebar-card">
        <h3>
          <EditableText
            tagName="span"
            value={sidebarData.contactTitle}
            onChange={(val) => setSidebar("contactTitle", val)}
          />
        </h3>
        <div className="contact-info-card">
          <p>
            <span className="icon">📍</span>
            <EditableText
              tagName="span"
              value={sidebarData.address}
              onChange={(val) => setSidebar("address", val)}
            />
          </p>
          <p>
            <span className="icon">📞</span>
            <EditableText
              tagName="span"
              value={sidebarData.phone}
              onChange={(val) => setSidebar("phone", val)}
            />
          </p>
          <p>
            <span className="icon">✉️</span>
            <EditableText
              tagName="span"
              value={sidebarData.email}
              onChange={(val) => setSidebar("email", val)}
            />
          </p>
        </div>
      </div>

      {/* CALL TO ACTION BLOCK */}
      <div className="sidebar-cta">
        <h3>
          <EditableText
            tagName="span"
            value={sidebarData.ctaTitle}
            onChange={(val) => setSidebar("ctaTitle", val)}
          />
        </h3>
        <p>
          <EditableText
            tagName="span"
            value={sidebarData.ctaText}
            onChange={(val) => setSidebar("ctaText", val)}
          />
        </p>
        <Link href="/contact-us">
          <EditableText
            tagName="span"
            value={sidebarData.ctaButtonText}
            onChange={(val) => setSidebar("ctaButtonText", val)}
          />
        </Link>
      </div>
    </aside>
  );
}
