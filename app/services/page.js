"use client";

import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ComboSticker from "../../components/ComboSticker";

import { useCMS, DEFAULT_GLOBAL_CONTENT } from "../../components/CMSContext";
import EditableText from "../../components/EditableText";
import { useRouter } from "next/navigation";

export default function ServicesPage() {
  const { globalContent, updateContent, isEditMode } = useCMS() || {};
  const content = globalContent?.services || DEFAULT_GLOBAL_CONTENT.services;
  const setContent = (key, val) => updateContent?.('services', key, val);
  const router = useRouter();

  const handleAddCategory = (index) => {
    const newCat = {
      id: `new_${Date.now()}`,
      label: "New Module",
      icon: "✨",
      desc: "Description of the new module track.",
      href: `/services/new_${Date.now()}`, // Dynamic link for new track
      color: "from-blue-500 to-indigo-500",
    };
    const updated = [...content.categories];
    updated.splice(index + 1, 0, newCat);
    setContent('categories', updated);
  };

  const handleDeleteCategory = (index) => {
    if (!confirm("Delete this category?")) return;
    const updated = content.categories.filter((_, i) => i !== index);
    setContent('categories', updated);
  };

  const updateCategory = (index, field, val) => {
    const updated = [...content.categories];
    updated[index][field] = val;
    setContent('categories', updated);
  };

  return (
    <>
      <Navbar />
      <ComboSticker />
      <main className="svc-main">
        {/* Full background */}
        <div className="svc-bg" />

        <div className="svc-content container">
          {/* Header */}
          <div className="svc-header svc-fade-in">
            <EditableText tagName="span" className="section-tag" value={content.tag} onChange={(v) => setContent('tag', v)} />
            <EditableText tagName="h1" className="svc-title" value={content.title} onChange={(v) => setContent('title', v)} />
            <EditableText tagName="p" className="svc-sub" value={content.sub} onChange={(v) => setContent('sub', v)} />
          </div>

          {/* Category Cards */}
          <div className="svc-grid">
            {content.categories.map((cat, i) => (
              <div
                key={cat.id || i}
                className="svc-cat-card svc-slide-up"
                style={{ animationDelay: `${i * 100}ms`, cursor: isEditMode ? 'default' : 'pointer', position: 'relative' }}
                onClick={() => {
                  if (!isEditMode) router.push(cat.href);
                }}
              >
                <div className="svc-cat-icon">
                  {isEditMode ? (
                    <EditableText tagName="span" value={cat.icon} onChange={(v) => updateCategory(i, 'icon', v)} />
                  ) : cat.icon}
                </div>
                {isEditMode ? (
                  <EditableText tagName="h2" className="svc-cat-label" value={cat.label} onChange={(v) => updateCategory(i, 'label', v)} />
                ) : (
                  <h2 className="svc-cat-label">{cat.label}</h2>
                )}
                {isEditMode ? (
                  <EditableText tagName="p" className="svc-cat-desc" value={cat.desc} onChange={(v) => updateCategory(i, 'desc', v)} />
                ) : (
                  <p className="svc-cat-desc">{cat.desc}</p>
                )}
                <div className="svc-cat-arrow">Explore →</div>
                <div className="svc-cat-glow" />

                {isEditMode && (
                  <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: "8px", zIndex: 50 }}>
                    <button onClick={(e) => { e.stopPropagation(); handleAddCategory(i); }} style={{ background: "#059669", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", border: "none", cursor: "pointer" }}>➕ Add Next</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(i); }} style={{ background: "#dc2626", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", border: "none", cursor: "pointer" }}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom info */}
          <div className="svc-bottom-text svc-fade-in" style={{ animationDelay: "400ms" }}>
            <EditableText tagName="p" value={content.bottomText} onChange={(v) => setContent('bottomText', v)} />
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        .svc-main {
          position: relative;
          min-height: 100vh;
          background: var(--bg-deep);
          overflow-x: hidden;
        }

        /* Animations */
        .svc-fade-in {
          animation: svcOpacity 0.8s ease forwards;
        }
        .svc-slide-up {
          opacity: 0;
          transform: translateY(20px);
          animation: svcSlide 0.6s cubic-bezier(0.34,1.2,0.64,1) forwards;
        }
        @keyframes svcOpacity {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes svcSlide {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .svc-bg {
          position: fixed;
          inset: 0;
          background: var(--bg-deep);
          z-index: 0;
        }
        :global(.theme-dark) .svc-bg {
          background:
            radial-gradient(ellipse at 70% 10%, rgba(0,100,200,0.22) 0%, transparent 60%),
            radial-gradient(ellipse at 10% 80%, rgba(0,180,120,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(10,10,40,0.95) 0%, var(--bg-deep) 80%);
        }
        .svc-content {
          position: relative;
          z-index: 1;
          padding-top: 140px;
          padding-bottom: 80px;
        }
        .svc-header {
          text-align: center;
          margin-bottom: 64px;
        }
        .svc-title {
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 800;
          color: var(--text);
          margin: 12px 0 18px;
          background: linear-gradient(135deg, var(--text) 40%, var(--blue));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .svc-sub {
          font-size: 1.1rem;
          color: var(--text-dim);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* 4 CARDS GRID */
        .svc-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 900px;
          margin: 0 auto 60px;
        }
        @media (max-width: 640px) {
          .svc-grid { grid-template-columns: 1fr; }
        }

        .svc-cat-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 32px;
          text-decoration: none;
          color: var(--text);
          overflow: hidden;
          transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
        }
        .svc-cat-card:hover {
          transform: translateY(-6px);
          border-color: var(--blue);
          box-shadow: 0 24px 60px rgba(0,100,200,0.15);
        }
        .svc-cat-card:hover .svc-cat-glow {
          opacity: 1;
        }
        .svc-cat-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(0,153,255,0.12), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .svc-cat-icon {
          font-size: 2.4rem;
          margin-bottom: 4px;
        }
        .svc-cat-label {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
          margin: 0;
        }
        .svc-cat-desc {
          font-size: 0.9rem;
          color: var(--text-dim);
          line-height: 1.6;
          margin: 0;
          flex: 1;
        }
        .svc-cat-arrow {
          font-size: 0.9rem;
          font-weight: 700;
          color: #4fc3f7;
          margin-top: 8px;
          transition: letter-spacing 0.3s ease;
        }
        .svc-cat-card:hover .svc-cat-arrow {
          letter-spacing: 0.05em;
        }

        .svc-bottom-text {
          text-align: center;
          color: var(--text-dim);
          font-size: 0.9rem;
          line-height: 1.8;
        }
        .svc-bottom-text strong { color: var(--text); }
      `}</style>
    </>
  );
}
