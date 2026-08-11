"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useCMS } from "../../../components/CMSContext";
import EditableText from "../../../components/EditableText";

const MODULES = [
  { id: "sd",   name: "SAP SD",   image: "/services/functional%20modules/sd.png",   tagline: "Sales & Distribution",
    what: "SAP SD manages the complete order-to-cash process, from customer inquiries to product delivery and billing.",
    does: "It streamlines sales, pricing, shipping, invoicing, and customer relationship processes across industries.",
    benefit: "By optimizing sales operations, SAP SD improves customer satisfaction and accelerates business growth.",
    eligible: "Sales executives, business analysts, supply chain professionals, and MBA graduates with commerce background.",
    level: "Beginner to Advanced" },
  { id: "mm",   name: "SAP MM",   image: "/services/functional%20modules/MM.png",   tagline: "Materials Management",
    what: "SAP MM manages the procurement and movement of materials across the entire supply chain.",
    does: "It streamlines purchasing, inventory management, warehouse operations, and vendor collaboration for efficient resource planning.",
    benefit: "Ensuring the right materials are available at the right time — reducing costs, improving inventory accuracy, and supporting uninterrupted business operations.",
    eligible: "Supply chain professionals, procurement officers, warehouse managers, and engineering graduates.",
    level: "Beginner to Advanced" },
  { id: "hcm",  name: "SAP HCM",  image: "/services/functional%20modules/HCM.png",  tagline: "Human Capital Management",
    what: "SAP HCM covers end-to-end HR processes from hire to retire within an organization.",
    does: "It handles payroll, time management, organizational management, personnel administration, and talent development.",
    benefit: "SAP HCM empowers HR teams to manage the workforce efficiently, improve compliance, and enhance employee experience.",
    eligible: "HR professionals, payroll executives, MBA-HR graduates, and personnel managers.",
    level: "Beginner to Advanced" },
  { id: "pp",   name: "SAP PP",   image: "/services/functional%20modules/pp.png",   tagline: "Production Planning",
    what: "SAP PP handles manufacturing and production planning processes within an enterprise.",
    does: "It covers MRP, capacity planning, production orders, shop floor control, and material requirements planning.",
    benefit: "SAP PP ensures smooth production operations by optimizing resources, reducing lead times, and meeting delivery schedules.",
    eligible: "Production engineers, manufacturing managers, industrial engineers, and operations management professionals.",
    level: "Beginner to Advanced" },
  { id: "fi",   name: "SAP FI",   image: "/services/functional%20modules/FI.png",   tagline: "Financial Accounting",
    what: "SAP FI handles core financial accounting and reporting functions within an organization.",
    does: "It manages general ledger, accounts payable, accounts receivable, asset accounting, and bank accounting.",
    benefit: "SAP FI provides real-time financial visibility, regulatory compliance, and accurate financial reporting for business decisions.",
    eligible: "Accountants, finance professionals, CAs, commerce graduates, and MBA-Finance students.",
    level: "Beginner to Advanced" },
  { id: "fico", name: "SAP FICO", image: "/services/functional%20modules/FICO.png", tagline: "Finance & Controlling",
    what: "SAP FICO integrates Financial Accounting (FI) and Controlling (CO) for complete financial management.",
    does: "It handles financial reporting, cost center accounting, profit center management, internal orders, and budgeting.",
    benefit: "SAP FICO gives enterprises complete financial control with integrated cost tracking and profitability analysis.",
    eligible: "Finance & accounting professionals, cost accountants, CAs, and MBA-Finance graduates.",
    level: "Intermediate to Advanced" },
  { id: "qm",   name: "SAP QM",   image: "/services/functional%20modules/QM.png",   tagline: "Quality Management",
    what: "SAP QM ensures product quality across the entire production and supply chain lifecycle.",
    does: "It covers inspection planning, quality notifications, certificates, and integration with MM and PP modules.",
    benefit: "SAP QM helps organizations achieve quality compliance, reduce defects, and build strong customer trust.",
    eligible: "Quality engineers, production supervisors, pharma and manufacturing professionals, and science graduates.",
    level: "Beginner to Intermediate" },
  { id: "pm",   name: "SAP PM",   image: "/services/functional%20modules/pm.png",   tagline: "Plant Maintenance",
    what: "SAP PM covers the planning, execution, and monitoring of maintenance activities for plant equipment.",
    does: "It handles preventive maintenance, breakdown management, work order processing, and equipment management.",
    benefit: "SAP PM reduces downtime, improves equipment reliability, and optimizes maintenance costs for industrial plants.",
    eligible: "Mechanical/electrical engineers, plant supervisors, maintenance managers, and industrial technicians.",
    level: "Beginner to Intermediate" },
  { id: "trm",  name: "SAP TRM",  image: "/services/functional%20modules/trm.png",  tagline: "Treasury & Risk Management",
    what: "SAP TRM manages financial transactions, treasury operations, and risk assessment in enterprises.",
    does: "It covers cash management, market risk management, liquidity planning, and financial instruments.",
    benefit: "SAP TRM gives CFOs and finance teams real-time visibility into cash flows and helps minimize financial risk exposure.",
    eligible: "Finance professionals, treasury managers, risk analysts, CAs, and MBA-Finance graduates.",
    level: "Intermediate to Advanced" },
];

export default function FunctionalModulesPage() {
  const [modulesList, setModulesList] = useState(MODULES);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ssr_cms_modules');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setModulesList(parsed);
          }
        } catch (e) {
          console.error("Failed to parse CMS modules", e);
        }
      }
    }
  }, []);

  const safeIndex = activeIndex >= modulesList.length ? 0 : activeIndex;
  const active = modulesList[safeIndex] || modulesList[0];

  const prev = () => setActiveIndex((i) => (i - 1 + modulesList.length) % modulesList.length);
  const next = () => setActiveIndex((i) => (i + 1) % modulesList.length);

  const { isEditMode } = useCMS();

  const fileInputRef = useRef(null);
  const [uploadIndex, setUploadIndex] = useState(null);

  const handleModuleUpdate = (field, newValue, optIndex = safeIndex) => {
    const updated = [...modulesList];
    updated[optIndex] = { ...updated[optIndex], [field]: newValue };
    setModulesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("ssr_cms_modules", JSON.stringify(updated));
    }
  };

  const handleAddCard = (index) => {
    const newCard = {
      id: `new_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: "New Module",
      image: "/ssrlogo.jpeg",
      tagline: "New Category",
      what: "Describe what this module is.",
      does: "Describe what it does.",
      benefit: "List the key benefits.",
      eligible: "Who is this for?",
      level: "Beginner"
    };
    const updated = [...modulesList];
    updated.splice(index + 1, 0, newCard);
    setModulesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("ssr_cms_modules", JSON.stringify(updated));
    }
    // Allow DOM to render the new item before applying transform transition
    setTimeout(() => setActiveIndex(index + 1), 50);
  };

  const handleDeleteCard = (index) => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    const updated = modulesList.filter((_, i) => i !== index);
    if (updated.length === 0) return; // Prevent deleting the last card completely
    setModulesList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("ssr_cms_modules", JSON.stringify(updated));
    }
    setActiveIndex(0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleModuleUpdate("image", reader.result, uploadIndex);
      };
      reader.readAsDataURL(file);
    }
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) next();
    if (isRightSwipe) prev();
  };

  return (
    <>
      <Navbar />
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />

      <div className="fm-page">
        {/* Full-bleed background image of active module */}
        {modulesList.map((mod, i) => (
          <div
            key={mod.id || i}
            className="fm-bg-layer"
            style={{
              backgroundImage: `url('${mod.image}')`,
              opacity: i === safeIndex ? 1 : 0,
            }}
          />
        ))}
        {/* Dark overlay on top of bg */}
        <div className="fm-overlay" />

        {/* ← Back button */}
        <Link href="/services" className="fm-back-btn">
          ←
        </Link>

        {/* Main layout */}
        <div 
          className="fm-layout"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* LEFT: Details */}
          <div className="fm-detail" key={active?.id || safeIndex}>
            <EditableText 
              tagName="span" 
              className="fm-tag" 
              value={active?.tagline} 
              onChange={(val) => handleModuleUpdate('tagline', val)} 
            />
            <EditableText 
              tagName="h1" 
              className="fm-title" 
              value={active?.name} 
              onChange={(val) => handleModuleUpdate('name', val)} 
            />

            <div className="fm-info-list">
              <div className="fm-info-block">
                <span className="fm-info-label">What is it?</span>
                <EditableText tagName="p" value={active?.what} onChange={(val) => handleModuleUpdate('what', val)} />
              </div>
              <div className="fm-info-block">
                <span className="fm-info-label">What does it do?</span>
                <EditableText tagName="p" value={active?.does} onChange={(val) => handleModuleUpdate('does', val)} />
              </div>
              <div className="fm-info-block">
                <span className="fm-info-label">Key Benefit</span>
                <EditableText tagName="p" value={active?.benefit} onChange={(val) => handleModuleUpdate('benefit', val)} />
              </div>
              <div className="fm-info-block">
                <span className="fm-info-label">Who is Eligible?</span>
                <EditableText tagName="p" value={active?.eligible} onChange={(val) => handleModuleUpdate('eligible', val)} />
              </div>
            </div>

            <div className="fm-meta-row hidden md:flex">
              <div className="fm-chip">📈 {active?.level}</div>
            </div>

            <div className="flex items-center gap-4 mt-6 fm-action-buttons">
              <a href="/contact-us" className="btn-primary fm-enquire !mt-0">
                Enquire Now →
              </a>
              <Link 
                href={`/combo-offers?module=${active?.id || ''}`}
                className="btn-outline flex items-center justify-center gap-2 animate-pulse border-emerald-400 text-emerald-400 hover:bg-emerald-400/10 !mt-0 !px-4"
                style={{ height: '48px' }}
              >
                <span className="font-bold tracking-wider uppercase text-sm">✨ Special Offer on this Module</span>
              </Link>
            </div>
          </div>

          {/* RIGHT: Fan cards */}
          <div className="fm-cards-wrap">
            {/* Nav arrows */}
            <button className="fm-nav fm-nav-left" onClick={prev} aria-label="Previous">‹</button>
            <button className="fm-nav fm-nav-right" onClick={next} aria-label="Next">›</button>

            {/* Cards */}
            <div className="fm-fan">
              {modulesList.map((mod, idx) => {
                const offset = idx - safeIndex;
                const abs = Math.abs(offset);
                if (abs > 3) return null;

                const scale = abs === 0 ? 1 : abs === 1 ? 0.80 : abs === 2 ? 0.64 : 0.52;
                const tx = offset * 140;
                const ty = abs * 22;
                const z = 20 - abs;
                const op = abs === 0 ? 1 : abs === 1 ? 0.85 : abs === 2 ? 0.65 : 0.4;
                const bright = abs === 0 ? 1 : 0.55;

                return (
                  <div
                    key={mod.id || idx}
                    className="fm-card"
                    style={{
                      transform: `translateX(${tx}px) translateY(${ty}px) scale(${scale})`,
                      zIndex: z,
                      opacity: op,
                      filter: `brightness(${bright})`,
                      cursor: abs !== 0 && !isEditMode ? "pointer" : "default",
                      position: "absolute",
                    }}
                    onClick={(e) => {
                      if (abs !== 0 && !isEditMode) {
                        setActiveIndex(idx);
                      }
                    }}
                  >
                    <img
                      src={mod.image}
                      alt={mod.name}
                      className="fm-card-img"
                      onError={(e) => { e.target.style.background = '#1a2a3a'; e.target.style.display = 'block'; }}
                    />
                    <div className="fm-card-gradient" />
                    
                    {isEditMode ? (
                      <div className="fm-card-name" style={{ pointerEvents: 'auto', zIndex: 50 }}>
                        <EditableText tagName="span" value={mod.name} onChange={(val) => handleModuleUpdate('name', val, idx)} />
                      </div>
                    ) : (
                      <div className="fm-card-name">{mod.name}</div>
                    )}

                    {isEditMode && abs === 0 && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setUploadIndex(idx); fileInputRef.current.click(); }}
                          style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                        >
                          🖼️ Change Image
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddCard(idx); }}
                          style={{ background: "#059669", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                        >
                          ➕ Add New Card Here
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCard(idx); }}
                          style={{ background: "#dc2626", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                        >
                          🗑️ Delete Card
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dots */}
            <div className="fm-dots">
              {modulesList.map((mod, i) => (
                <button
                  key={mod.id || i}
                  className={`fm-dot${i === safeIndex ? " active" : ""}`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={mod.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ─── PAGE WRAPPER ─── */
        .fm-page {
          position: fixed;
          inset: 0;
          background: var(--bg-deep);
          overflow: hidden;
        }

        /* Background layers — fixed so they act as wallpaper */
        .fm-bg-layer {
          position: fixed;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: opacity 0.8s ease;
          will-change: opacity;
          z-index: 0;
        }
        .fm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            to right,
            var(--bg-deep) 0%,
            var(--glass-bg) 45%,
            transparent 100%
          );
        }

        /* ← back button */
        .fm-back-btn {
          position: fixed;
          top: 82px;
          left: 28px;
          z-index: 200;
          color: var(--text-dim);
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 30px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          transition: all 0.25s ease;
        }
        .fm-back-btn:hover {
          color: #fff;
          border-color: rgba(0,153,255,0.5);
          background: rgba(0,80,180,0.3);
        }

        /* ─── LAYOUT ─── */
        .fm-layout {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          align-items: center;
          padding: 130px 60px 100px;
          gap: 40px;
          max-width: 1400px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* ─── DETAIL PANEL ─── */
        .fm-detail { animation: fmSlideIn 0.45s ease; }
        @keyframes fmSlideIn {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .fm-tag {
          display: inline-block;
          background: rgba(0,153,255,0.18);
          border: 1px solid var(--blue);
          color: var(--blue);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 20px;
          margin-bottom: 12px;
        }
        .fm-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 900;
          color: var(--text);
          margin: 0 0 24px;
          line-height: 1.05;
          text-shadow: none;
        }
        .fm-info-list { display: flex; flex-direction: column; gap: 14px; }
        .fm-info-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 3px;
        }
        .fm-info-block p {
          color: var(--text-dim);
          font-size: 0.92rem;
          line-height: 1.65;
          margin: 0;
        }
        .fm-meta-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0 24px; }
        .fm-chip {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 16px;
          font-size: 0.85rem;
          color: var(--text);
          font-weight: 600;
        }
        .fm-enquire { display: inline-block; }

        /* ─── CARDS ─── */
        .fm-cards-wrap {
          position: relative;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: flex-end;
          margin-top: 40px;
          transform: translateY(50px);
        }
        .fm-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px; height: 48px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.25);
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          color: #fff;
          font-size: 1.8rem;
          cursor: pointer;
          z-index: 50;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
          line-height: 1;
          padding-bottom: 2px;
        }
        .fm-nav:hover {
          background: rgba(0,100,200,0.4);
          border-color: rgba(0,153,255,0.6);
          transform: translateY(-50%) scale(1.08);
        }
        .fm-nav-left { left: 0; }
        .fm-nav-right { right: 0; }

        .fm-fan {
          position: relative;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .fm-card {
          position: absolute;
          width: 210px; height: 330px;
          border-radius: 22px;
          overflow: hidden;
          transition: transform 0.55s cubic-bezier(0.34,1.4,0.64,1),
                      opacity 0.4s ease, filter 0.4s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.55);
        }
        .fm-card-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          background: #1a2a3a;
        }
        .fm-card-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%);
        }
        .fm-card-name {
          position: absolute;
          bottom: 16px; left: 16px; right: 16px;
          font-size: 1.05rem; font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.7);
        }
        .fm-dots {
          position: absolute;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          display: flex; gap: 6px; padding: 4px 0;
        }
        .fm-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.28);
          border: none; cursor: pointer; padding: 0;
          transition: all 0.3s ease;
        }
        .fm-dot.active {
          background: #0099ff; width: 22px;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(0,153,255,0.6);
        }

        /* ─── MOBILE ─── */
        @media (max-width: 900px) {
          .fm-layout {
            display: flex;
            flex-direction: column;
            padding: 70px 16px 80px;
            min-height: 100dvh;
            height: auto;
            gap: 0;
            overflow-y: auto;
            overflow-x: hidden;
          }
          .fm-detail {
            display: contents; /* Unbox contents for flexible ordering */
          }
          .fm-back-btn { top: 64px; left: 16px; font-size: 0.75rem; padding: 6px 12px; }
          
          /* Order elements as per reference image */
          .fm-tag { order: 1; margin: 0 auto 8px; font-size: 0.65rem; padding: 4px 12px; }
          .fm-title { order: 2; font-size: 2rem; margin: 0 auto 12px; text-align: center; }
          .fm-info-list { 
            order: 3; 
            margin: 10px 0; 
            flex: none;
            padding-right: 0;
            display: flex;
            flex-direction: column;
          }
          
          .fm-info-block {
            margin-bottom: 12px;
          }
          
          .fm-info-label { font-size: 0.65rem; margin-bottom: 2px; }
          .fm-info-block p { font-size: 0.78rem; line-height: 1.4; }
          
          .fm-cards-wrap { 
            order: 5; 
            height: 240px; 
            width: 100%;
            margin: 10px 0; 
            transform: none; /* Remove desktop translateY */
            flex-shrink: 0;
          }
          .fm-card { width: 130px; height: 210px; border-radius: 14px; }
          .fm-card-name { font-size: 0.8rem; bottom: 10px; left: 10px; }
          .fm-nav { width: 32px; height: 32px; font-size: 1.2rem; background: rgba(0,0,0,0.6); }
          
          .fm-meta-row { 
            display: none !important;
          }
          
          .fm-action-buttons {
            order: 3;
            margin: 6px auto 14px;
            width: 100%;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .fm-action-buttons .btn-outline {
            height: 34px !important;
            padding: 0 14px !important;
            border: 1px solid rgba(52, 211, 153, 0.6) !important; /* emerald-400 */
            box-shadow: 0 0 14px rgba(52, 211, 153, 0.4) !important;
          }
          
          .fm-action-buttons .btn-outline span {
            font-size: 0.68rem !important;
          }
          
          .fm-action-buttons .fm-enquire { display: none; /* Hidden on mobile */ }
        }
      `}</style>
    </>
  );
}
