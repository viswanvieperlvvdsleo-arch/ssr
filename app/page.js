"use client";

import Link from "next/link";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useHomeEffects } from "../hooks/useHomeEffects";
import { useSharedEffects } from "../hooks/useSharedEffects";
import { useEffect } from "react";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "../components/CMSContext";
import EditableText from "../components/EditableText";
import ComboSticker from "../components/ComboSticker";

export default function HomePage() {
  useSharedEffects({
    enableCounters: true,
    enableSpotlight: true,
    enableReveal: true,
    enableSmoothAnchors: true
  });
  useHomeEffects();

  const { globalContent, updateContent, isEditMode } = useCMS() || {};
  // The home page relies on DEFAULT_GLOBAL_CONTENT to exist in CMSContext.js
  const content = globalContent?.home || DEFAULT_GLOBAL_CONTENT.home; 
  const setContent = (key, val) => updateContent?.('home', key, val);

  // Mobile hardware back button logic: Refresh on first press, exit if pressed again within 4 seconds
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.pushState({ page: "home-dummy" }, "");

      const handlePopState = () => {
        const now = Date.now();
        const lastPress = parseInt(sessionStorage.getItem('lastBackPress') || '0', 10);

        if (now - lastPress <= 4000) {
          sessionStorage.removeItem('lastBackPress');
          window.history.back();
        } else {
          sessionStorage.setItem('lastBackPress', now.toString());
          window.location.reload();
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  return (
    <>
      <Navbar />
      <ComboSticker />
      <main>
        {/* HERO */}
        <section className="hero">
          <canvas id="hero-canvas"></canvas>
          <div className="hero-overlay"></div>
          <div className="container">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <div className="eyebrow-line"></div>
                <EditableText tagName="span" className="eyebrow-text" value={content.heroEyebrow} onChange={(v) => setContent('heroEyebrow', v)} />
              </div>
              <EditableText tagName="h1" className="hero-title" value={content.heroTitle} onChange={(v) => setContent('heroTitle', v)} />
              <EditableText tagName="p" className="hero-desc" value={content.heroDesc} onChange={(v) => setContent('heroDesc', v)} />
              
              <div className="hero-btns">
                <Link href="/about-us" className="btn-primary">
                  Discover More →
                </Link>
                <Link href="/contact-us" className="btn-outline">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-scroll-indicator">
            <div className="scroll-mouse"></div>
            <span>Scroll</span>
          </div>
        </section>

        {/* RESULTS STRIP */}
        <section className="results-strip">
          <div className="container">
            <div className="results-grid">
              {content.metrics.map((item, idx) => (
                <div className="metric-card" key={idx}>
                  <div className="metric-value">
                    <EditableText tagName="span" value={item.value} onChange={(v) => {
                      const newMetrics = [...content.metrics];
                      newMetrics[idx].value = v;
                      setContent('metrics', newMetrics);
                    }} />
                  </div>
                  <div className="metric-label">
                    <EditableText tagName="span" value={item.label} onChange={(v) => {
                      const newMetrics = [...content.metrics];
                      newMetrics[idx].label = v;
                      setContent('metrics', newMetrics);
                    }} />
                  </div>
                  <div className="metric-note">
                    <EditableText tagName="span" value={item.note} onChange={(v) => {
                      const newMetrics = [...content.metrics];
                      newMetrics[idx].note = v;
                      setContent('metrics', newMetrics);
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* IT TRAINING */}
        <section className="it-scroll-section" id="it-training">
          <div className="it-scroll-sticky">
            <canvas id="it-canvas"></canvas>
            <div className="it-overlay">
              <div className="it-content">
                <EditableText tagName="span" className="section-tag it-tag" value={content.itTag} onChange={(v) => setContent('itTag', v)} />
                <EditableText tagName="h2" className="it-heading" value={content.itHeading} onChange={(v) => setContent('itHeading', v)} />
                <EditableText tagName="p" className="it-desc" value={content.itDesc} onChange={(v) => setContent('itDesc', v)} />
                <div className="it-btns">
                  <Link href="#services" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="it-progress">
              <div className="it-progress-bar"></div>
            </div>
          </div>
        </section>

        {/* SOFTWARE DEVELOPER */}
        <section className="sd-scroll-section" id="software-development">
          <div className="sd-scroll-sticky">
            <canvas id="sd-canvas"></canvas>
            <div className="sd-overlay">
              <div className="sd-content">
                <EditableText tagName="span" className="section-tag sd-tag" value={content.sdTag} onChange={(v) => setContent('sdTag', v)} />
                <EditableText tagName="h2" className="sd-heading" value={content.sdHeading} onChange={(v) => setContent('sdHeading', v)} />
                <EditableText tagName="p" className="sd-desc" value={content.sdDesc} onChange={(v) => setContent('sdDesc', v)} />
                <div className="sd-btns">
                  <Link href="#services" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="sd-progress"><div className="sd-progress-bar"></div></div>
          </div>
        </section>

        {/* STAFFING & SOLUTIONS */}
        <section className="ss-scroll-section" id="staffing-solutions">
          <div className="ss-scroll-sticky">
            <canvas id="ss-canvas"></canvas>
            <div className="ss-overlay">
              <div className="ss-content">
                <EditableText tagName="span" className="section-tag ss-tag" value={content.ssTag} onChange={(v) => setContent('ssTag', v)} />
                <EditableText tagName="h2" className="ss-heading" value={content.ssHeading} onChange={(v) => setContent('ssHeading', v)} />
                <EditableText tagName="p" className="ss-desc" value={content.ssDesc} onChange={(v) => setContent('ssDesc', v)} />
                <div className="ss-btns">
                  <Link href="#services" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="ss-progress"><div className="ss-progress-bar"></div></div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="services-section" id="services">
          <div className="container">
            <div style={{ textAlign: "center" }} className="fade-up">
              <EditableText tagName="span" className="section-tag" value={content.servicesTag} onChange={(v) => setContent('servicesTag', v)} />
              <EditableText tagName="h2" className="section-heading" value={content.servicesHeading} onChange={(v) => setContent('servicesHeading', v)} />
              <EditableText tagName="p" className="section-sub" style={{ margin: "0 auto" }} value={content.servicesSub} onChange={(v) => setContent('servicesSub', v)} />
            </div>
            <div className="services-grid">
              <div className="service-card fade-up" data-delay="0">
                <div className="card-accent"></div>
                <div className="card-icon">🎓</div>
                <h3>Training</h3>
                <p>Real-time SAP training with certified corporate trainers, placement assistance, and 24/7 server access for every enrolled student.</p>

              </div>

              <div className="service-card fade-up" data-delay="120">
                <div className="card-accent"></div>
                <div className="card-icon">👥</div>
                <h3>Staffing &amp; Solutions</h3>
                <p>Strategic IT staffing services — permanent hire, contract to hire, and campus recruitment tailored to your organization's needs.</p>

              </div>

              <div className="service-card fade-up" data-delay="240">
                <div className="card-accent"></div>
                <div className="card-icon">💻</div>
                <h3>Development</h3>
                <p>End-to-end software development managing scope, schedule, budget and quality with proven project management methodology.</p>

              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <div className="container">
            <div className="about-grid">
              <div className="about-text fade-left">
                <EditableText tagName="span" className="section-tag" value={content.aboutTag} onChange={(v) => setContent('aboutTag', v)} />
                <EditableText tagName="h2" value={content.aboutHeading} onChange={(v) => setContent('aboutHeading', v)} />
                <EditableText tagName="p" className="highlight-line" value={content.aboutHighlight} onChange={(v) => setContent('aboutHighlight', v)} />
                <EditableText tagName="p" value={content.aboutP1} onChange={(v) => setContent('aboutP1', v)} />
                <EditableText tagName="p" value={content.aboutP2} onChange={(v) => setContent('aboutP2', v)} />
                <div className="about-stats">
                  <div className="stat-box">
                    <span className="num stat-count" data-target="500" data-suffix="+">0</span>
                    <div className="label">Students Trained</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="100" data-suffix="+">0</span>
                    <div className="label">Placements</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="50" data-suffix="+">0</span>
                    <div className="label">Corporate Clients</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="4" data-suffix="+">0</span>
                    <div className="label">Years of Excellence</div>
                  </div>
                </div>
                <Link href="/about-us" className="btn-primary" style={{ marginTop: 28 }}>Read More →</Link>
              </div>
              <div className="about-visual fade-right">
                <div className="parallax-layer layer-1" id="layer1">
                  <div style={{ fontSize: "6rem", position: "relative", zIndex: 1 }}>🏢</div>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(0,102,170,0.15), transparent 70%)" }}></div>
                </div>
                <div className="parallax-layer layer-2" id="layer2">
                  <h4>SAP Authorized<br />Training Center</h4>
                  <p>IT Training · Staffing · Development</p>
                  <div style={{ width: 40, height: 2, background: "var(--blue)", margin: "10px auto 0" }}></div>
                </div>
                <div className="parallax-layer layer-3" id="layer3">✦ Since 2020</div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section className="why-section" id="whyus">
          <div className="container">
            <div className="why-grid">
              <div className="fade-left">
                <div className="orbit-container">
                  <div className="orbit-ring orbit-ring-1">
                    <div className="orbit-item oi-1">🎓<div className="orbit-tooltip">SAP Certified</div></div>
                    <div className="orbit-item oi-2">🖥️<div className="orbit-tooltip">24/7 Server</div></div>
                    <div className="orbit-item oi-3">🌐<div className="orbit-tooltip">Online Mode</div></div>
                    <div className="orbit-item oi-4">🏆<div className="orbit-tooltip">Placement Help</div></div>
                  </div>
                  <div className="orbit-ring orbit-ring-2">
                    <div className="orbit-item oi-5">🔒<div className="orbit-tooltip">Real Trainers</div></div>
                    <div className="orbit-item oi-6">📊<div className="orbit-tooltip">Industry Experts</div></div>
                    <div className="orbit-item oi-7">🚀<div className="orbit-tooltip">Career Growth</div></div>
                    <div className="orbit-item oi-8">💡<div className="orbit-tooltip">Innovation</div></div>
                  </div>
                  <div className="orbit-center"><h4>Why Choose SSR?</h4></div>
                </div>
              </div>
              <div className="why-text fade-right">
                <EditableText tagName="span" className="section-tag" value={content.whyTag} onChange={(v) => setContent('whyTag', v)} />
                <EditableText tagName="h2" value={content.whyHeading} onChange={(v) => setContent('whyHeading', v)} />
                <EditableText tagName="p" value={content.whyDesc} onChange={(v) => setContent('whyDesc', v)} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <ul className="why-list" style={{ flexGrow: 1 }}>
                    {(content.whyPoints || DEFAULT_GLOBAL_CONTENT.home.whyPoints).map((pt, idx) => (
                      <li key={idx} className="why-list-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="why-check">✓</div>
                        <EditableText
                          tagName="span"
                          value={pt}
                          onChange={(val) => {
                            const updated = [...(content.whyPoints || DEFAULT_GLOBAL_CONTENT.home.whyPoints)];
                            updated[idx] = val;
                            setContent("whyPoints", updated);
                          }}
                        />
                        {isEditMode && (
                          <button
                            onClick={() => {
                              const updated = (content.whyPoints || DEFAULT_GLOBAL_CONTENT.home.whyPoints).filter((_, i) => i !== idx);
                              setContent("whyPoints", updated);
                            }}
                            style={{
                              background: "rgba(239,68,68,0.2)",
                              color: "#fca5a5",
                              border: "none",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "11px",
                              cursor: "pointer",
                              marginLeft: "auto"
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {isEditMode && (
                  <button
                    onClick={() => {
                      const updated = [...(content.whyPoints || DEFAULT_GLOBAL_CONTENT.home.whyPoints), "New Advantage Point"];
                      setContent("whyPoints", updated);
                    }}
                    style={{
                      background: "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      marginTop: "10px"
                    }}
                  >
                    ➕ Add Point
                  </button>
                )}
                <Link href="/why-us" className="btn-outline" style={{ marginTop: 24 }}>Learn More</Link>
              </div>
            </div>
          </div>
        </section>


      </main>
      <Footer />
    </>
  );
}
