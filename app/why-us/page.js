"use client";

import Link from "next/link";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { useSharedEffects } from "../../hooks/useSharedEffects";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "../../components/CMSContext";
import EditableText from "../../components/EditableText";

export default function WhyUsPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });
  const { globalContent, updateContent, isEditMode } = useCMS() || {};
  const content = globalContent?.whyUs || DEFAULT_GLOBAL_CONTENT.whyUs;

  const setContent = (key, val) => updateContent?.("whyUs", key, val);

  const handleUpdateProjectPoint = (idx, val) => {
    const updated = [...(content.projectExpPoints || DEFAULT_GLOBAL_CONTENT.whyUs.projectExpPoints)];
    updated[idx] = val;
    setContent("projectExpPoints", updated);
  };

  const handleAddProjectPoint = () => {
    const updated = [
      ...(content.projectExpPoints || DEFAULT_GLOBAL_CONTENT.whyUs.projectExpPoints),
      "New Project Experience / Scope Track"
    ];
    setContent("projectExpPoints", updated);
  };

  const handleDeleteProjectPoint = (idx) => {
    const updated = (content.projectExpPoints || DEFAULT_GLOBAL_CONTENT.whyUs.projectExpPoints).filter((_, i) => i !== idx);
    setContent("projectExpPoints", updated);
  };

  const handleUpdateAdvantage = (idx, field, val) => {
    const updated = [...(content.advantages || DEFAULT_GLOBAL_CONTENT.whyUs.advantages)];
    updated[idx] = { ...updated[idx], [field]: val };
    setContent("advantages", updated);
  };

  const handleAddAdvantage = () => {
    const updated = [
      ...(content.advantages || DEFAULT_GLOBAL_CONTENT.whyUs.advantages),
      { id: `adv_${Date.now()}`, title: "✓ New Advantage", desc: "Description of the new key advantage." }
    ];
    setContent("advantages", updated);
  };

  const handleDeleteAdvantage = (idx) => {
    const updated = (content.advantages || DEFAULT_GLOBAL_CONTENT.whyUs.advantages).filter((_, i) => i !== idx);
    setContent("advantages", updated);
  };

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <EditableText
                tagName="span"
                className="section-tag"
                value={content.bannerTag}
                onChange={(v) => setContent("bannerTag", v)}
              />
              <EditableText
                tagName="h1"
                value={content.bannerTitle}
                onChange={(v) => setContent("bannerTitle", v)}
              />
              <div className="breadcrumb">
                <Link href="/">Home</Link>
                <span>›</span>
                <span>Why Us?</span>
              </div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <EditableText
                  tagName="h1"
                  value={content.title}
                  onChange={(v) => setContent("title", v)}
                />
                <EditableText
                  tagName="p"
                  value={content.p1}
                  onChange={(v) => setContent("p1", v)}
                />
                <EditableText
                  tagName="p"
                  value={content.p2}
                  onChange={(v) => setContent("p2", v)}
                />
                <EditableText
                  tagName="p"
                  value={content.p3}
                  onChange={(v) => setContent("p3", v)}
                />

                {/* Project Experience List */}
                <div style={{ marginTop: "28px", marginBottom: "28px" }}>
                  <EditableText
                    tagName="h2"
                    value={content.projectExpTitle}
                    onChange={(v) => setContent("projectExpTitle", v)}
                  />
                  <ul style={{ listStyle: "disc", paddingLeft: "20px", marginTop: "12px" }}>
                    {(content.projectExpPoints || DEFAULT_GLOBAL_CONTENT.whyUs.projectExpPoints).map((pt, idx) => (
                      <li key={idx} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <EditableText
                            tagName="span"
                            value={pt}
                            onChange={(val) => handleUpdateProjectPoint(idx, val)}
                          />
                          {isEditMode && (
                            <button
                              onClick={() => handleDeleteProjectPoint(idx)}
                              style={{
                                background: "rgba(239,68,68,0.2)",
                                color: "#fca5a5",
                                border: "none",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "11px",
                                cursor: "pointer"
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {isEditMode && (
                    <button
                      onClick={handleAddProjectPoint}
                      style={{
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginTop: "8px"
                      }}
                    >
                      ➕ Add Project Experience
                    </button>
                  )}
                </div>

                {/* Advantages Grid */}
                <div style={{ marginTop: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <EditableText
                      tagName="h2"
                      value={content.advantagesTitle}
                      onChange={(v) => setContent("advantagesTitle", v)}
                    />
                    {isEditMode && (
                      <button
                        onClick={handleAddAdvantage}
                        style={{
                          background: "#059669",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        ➕ Add Advantage Card
                      </button>
                    )}
                  </div>

                  <div className="feature-grid" style={{ marginTop: "16px" }}>
                    {(content.advantages || DEFAULT_GLOBAL_CONTENT.whyUs.advantages).map((item, idx) => (
                      <div key={item.id || idx} className="feature-item" style={{ position: "relative" }}>
                        {isEditMode && (
                          <button
                            onClick={() => handleDeleteAdvantage(idx)}
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "rgba(239,68,68,0.3)",
                              color: "#fca5a5",
                              border: "none",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "10px",
                              cursor: "pointer"
                            }}
                          >
                            🗑️
                          </button>
                        )}
                        <strong>
                          <EditableText
                            tagName="span"
                            value={item.title}
                            onChange={(val) => handleUpdateAdvantage(idx, "title", val)}
                          />
                        </strong>
                        <EditableText
                          tagName="span"
                          value={item.desc}
                          onChange={(val) => handleUpdateAdvantage(idx, "desc", val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Sidebar />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
