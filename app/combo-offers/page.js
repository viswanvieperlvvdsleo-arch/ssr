'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useCMS } from '../../components/CMSContext';
import Link from 'next/link';
import { useSharedEffects } from '../../hooks/useSharedEffects';

export default function ComboOffersPage() {
  useSharedEffects();
  const { globalContent, isEditMode, updateContent } = useCMS();
  const comboOffers = globalContent.comboOffers || { predefined: [], catalogPrices: {} };
  const predefined = comboOffers.predefined || [];
  const catalogPrices = comboOffers.catalogPrices || {};
  const globalDiscount = comboOffers.globalDiscount ?? 15;

  const [editingCombo, setEditingCombo] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [tempCombo, setTempCombo] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [tempDiscount, setTempDiscount] = useState('');
  const [editingModuleDisc, setEditingModuleDisc] = useState('');

  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    // Default modules if nothing in localStorage
    const defaultFunctional = [
      { id: "sd", name: "SAP SD", image: "/services/functional modules/sd.png" },
      { id: "mm", name: "SAP MM", image: "/services/functional modules/MM.png" },
      { id: "hcm", name: "SAP HCM", image: "/services/functional modules/HCM.png" },
      { id: "pp", name: "SAP PP", image: "/services/functional modules/pp.png" },
      { id: "fi", name: "SAP FI", image: "/services/functional modules/FI.png" },
      { id: "fico", name: "SAP FICO", image: "/services/functional modules/FICO.png" }
    ];

    let loaded = [...defaultFunctional];
    if (typeof window !== 'undefined') {
      const savedFunc = localStorage.getItem('ssr_cms_modules');
      const savedTech = localStorage.getItem('ssr_cms_modules_technical');
      
      let funcMods = [];
      let techMods = [];
      
      try { if (savedFunc) funcMods = JSON.parse(savedFunc); } catch(e){}
      try { if (savedTech) techMods = JSON.parse(savedTech); } catch(e){}

      if (funcMods.length > 0 || techMods.length > 0) {
        loaded = [...funcMods, ...techMods];
      }
      
      // Also add standalone modules from catalogPrices if they don't exist in loaded
      // (e.g. Tally, MS Office)
      const existingIds = loaded.map(m => m.id.toLowerCase());
      Object.keys(catalogPrices).forEach(key => {
        if (!existingIds.includes(key.toLowerCase())) {
          loaded.push({
            id: key,
            name: key.toUpperCase(),
            image: null // fallback image
          });
        }
      });
    }
    setAvailableModules(loaded);
  }, [catalogPrices]);

  const toggleModule = (mod) => {
    if (selectedModules.find(m => m.id === mod.id)) {
      setSelectedModules(selectedModules.filter(m => m.id !== mod.id));
    } else {
      setSelectedModules([...selectedModules, mod]);
    }
  };

  const getPrice = (id) => {
    return catalogPrices[id.toLowerCase()] || 15000; // default 15k
  };

  const totals = useMemo(() => {
    let baseTotal = 0;
    selectedModules.forEach(m => {
      baseTotal += getPrice(m.id);
    });
    
    let discount = 0;
    // Apply discount if 2 or more courses selected
    if (selectedModules.length >= 2) {
      selectedModules.forEach(m => {
        const modPrice = getPrice(m.id);
        const modDiscountPct = (comboOffers.moduleDiscounts && comboOffers.moduleDiscounts[m.id.toLowerCase()]) ?? globalDiscount;
        discount += modPrice * (modDiscountPct / 100);
      });
    }
    
    const finalPrice = baseTotal - discount;
    
    return { baseTotal, discount, finalPrice };
  }, [selectedModules, catalogPrices, globalDiscount]);

  const generateEnquiryText = (comboTitle = '') => {
    if (comboTitle) return `I am interested in the ${comboTitle} combo offer.`;
    const names = selectedModules.map(m => m.name).join(', ');
    return `I am interested in the custom combo: ${names}.`;
  };

  const handleSaveCombo = () => {
    let newPredefined = [...predefined];
    const toSave = {
      ...tempCombo,
      modules: typeof tempCombo.modules === 'string' 
        ? tempCombo.modules.split(',').map(s => s.trim()).filter(Boolean)
        : tempCombo.modules
    };
    if (editingCombo === 'new') {
      newPredefined.push({ ...toSave, id: 'combo_' + Date.now() });
    } else {
      newPredefined = newPredefined.map(c => c.id === toSave.id ? toSave : c);
    }
    updateContent('comboOffers', 'predefined', newPredefined);
    setEditingCombo(null);
  };

  const handleDeleteCombo = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm("Delete this combo?")) {
      updateContent('comboOffers', 'predefined', predefined.filter(c => c.id !== id));
    }
  };

  const handleSavePrice = () => {
    updateContent('comboOffers', 'catalogPrices', { ...catalogPrices, [editingPrice]: Number(tempPrice) });
    if (editingModuleDisc !== '') {
      const currentModuleDiscounts = comboOffers.moduleDiscounts || {};
      updateContent('comboOffers', 'moduleDiscounts', { ...currentModuleDiscounts, [editingPrice]: Number(editingModuleDisc) });
    }
    setEditingPrice(null);
  };

  const handleSaveDiscount = () => {
    updateContent('comboOffers', 'globalDiscount', Number(tempDiscount));
    setEditingDiscount(false);
  };

  const renderComboModal = () => {
    if (!editingCombo || !tempCombo) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#152336] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">{editingCombo === 'new' ? 'Add Combo' : 'Edit Combo'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/70 mb-1">Title</label>
              <input type="text" value={tempCombo.title} onChange={e => setTempCombo({...tempCombo, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Description</label>
              <textarea value={tempCombo.description} onChange={e => setTempCombo({...tempCombo, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm" rows={2} />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Modules (comma separated)</label>
              <input type="text" value={typeof tempCombo.modules === 'string' ? tempCombo.modules : tempCombo.modules.join(', ')} onChange={e => setTempCombo({...tempCombo, modules: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-white/70 mb-1">Original Price (₹)</label>
                <input type="number" value={tempCombo.originalPrice} onChange={e => setTempCombo({...tempCombo, originalPrice: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/70 mb-1">Discounted Price (₹)</label>
                <div className="flex gap-2">
                  <input type="number" value={tempCombo.discountedPrice} onChange={e => setTempCombo({...tempCombo, discountedPrice: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
                  <div className="relative flex items-center w-24 shrink-0">
                    <input 
                      type="number" 
                      placeholder="%"
                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white pr-4 text-xs" 
                      onChange={e => {
                        const pct = Number(e.target.value);
                        if (pct > 0 && tempCombo.originalPrice) {
                          setTempCombo({...tempCombo, discountedPrice: Math.round(tempCombo.originalPrice - (tempCombo.originalPrice * pct / 100))});
                        }
                      }}
                    />
                    <span className="absolute right-2 text-xs text-white/50">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingCombo(null)} className="px-4 py-2 text-white/70 hover:text-white">Cancel</button>
            <button onClick={handleSaveCombo} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Save Combo</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isEditMode && renderComboModal()}
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen inner-content text-[color:var(--text)]">
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-4 mb-16 text-center pt-8">
          <h1 className="text-4xl md:text-5xl font-black mb-4 co-title">
            Exclusive Combo Offers
          </h1>
          <p className="text-lg co-subtitle max-w-2xl mx-auto">
            Supercharge your career by combining complementary skills. Unlock high-paying opportunities and save up to 15% on combined enrollments!
          </p>
        </section>

        {/* PREDEFINED COMBOS */}
        {predefined.length > 0 && (
          <section className="container mx-auto px-4 mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-blue-500 rounded-full"></span>
              Recommended Career Paths
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predefined.map(combo => (
                <div key={combo.id} className="co-card group relative">
                  {isEditMode && (
                    <div className="absolute top-2 left-2 flex gap-2 z-20">
                      <button onClick={(e) => { e.preventDefault(); setTempCombo(combo); setEditingCombo(combo.id); }} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded shadow text-xs transition">Edit</button>
                      <button onClick={(e) => handleDeleteCombo(e, combo.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow text-xs transition">Delete</button>
                    </div>
                  )}
                  <div className="co-badge">
                    Best Value
                  </div>
                  <h3 className="co-card-title mt-4">{combo.title}</h3>
                  <p className="co-card-desc">{combo.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {combo.modules.map(mod => (
                      <span key={mod} className="co-chip">
                        {mod}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end gap-3 mb-6">
                    <span className="co-price-old">₹{combo.originalPrice.toLocaleString('en-IN')}</span>
                    <span className="co-price-new">₹{combo.discountedPrice.toLocaleString('en-IN')}</span>
                  </div>

                  <Link href={`/contact-us?message=${encodeURIComponent(generateEnquiryText(combo.title))}`} className="co-btn" onClick={(e) => isEditMode && e.preventDefault()}>
                    Book This Combo
                  </Link>
                </div>
              ))}
              {isEditMode && (
                <div 
                  onClick={() => {
                    setTempCombo({ title: "New Combo", description: "Description here", originalPrice: 0, discountedPrice: 0, modules: [] });
                    setEditingCombo('new');
                  }}
                  className="co-card flex flex-col items-center justify-center cursor-pointer border-dashed border-2 opacity-50 hover:opacity-100 transition"
                >
                  <span className="text-4xl mb-2">+</span>
                  <span className="font-bold">Add New Combo</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FREESTYLE BUILDER */}
        <section className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
            Build Your Own Combo
          </h2>
          <p className="opacity-60 mb-8 max-w-3xl">
            Select 2 or more courses below to automatically receive a {globalDiscount}% discount on your total tuition fee. Tailor your learning to exactly what you need.
          </p>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Module Selection Grid */}
            <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {availableModules.map(mod => {
                const isSelected = selectedModules.find(m => m.id === mod.id);
                const price = getPrice(mod.id);
                return (
                  <div key={mod.id} className="relative group flex">
                    <button
                      onClick={() => toggleModule(mod)}
                      className={`co-mod-btn w-full ${isSelected ? 'selected' : ''}`}
                    >
                      {isSelected && (
                        <div className="co-mod-check">✓</div>
                      )}
                      {mod.image ? (
                        <img src={mod.image} alt={mod.name} className="co-mod-img" />
                      ) : (
                        <div className="co-mod-placeholder">
                          {mod.name.substring(0, 3)}
                        </div>
                      )}
                      <div className="text-center">
                        <h3 className="co-mod-name">{mod.name}</h3>
                        <p className="co-mod-price">₹{price.toLocaleString('en-IN')}</p>
                      </div>
                    </button>
                    {isEditMode && editingPrice !== mod.id && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingPrice(mod.id); 
                            setTempPrice(price); 
                            setEditingModuleDisc((comboOffers.moduleDiscounts && comboOffers.moduleDiscounts[mod.id]) ?? '');
                          }} 
                          className="bg-blue-500 hover:bg-blue-600 p-1.5 rounded shadow text-white"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                      </div>
                    )}
                    
                    {isEditMode && editingPrice === mod.id && (
                      <div className="absolute inset-0 bg-[#152336]/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-2 rounded-xl gap-2 border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="w-full flex items-center justify-between gap-1">
                          <input type="number" value={tempPrice} onChange={e => setTempPrice(e.target.value)} className="w-16 bg-white/10 px-1 py-1 text-xs text-white rounded outline-none border border-white/20 focus:border-emerald-500" autoFocus />
                          <div className="relative flex items-center shrink-0">
                            <input type="number" placeholder={globalDiscount} value={editingModuleDisc} onChange={e => setEditingModuleDisc(e.target.value)} className="w-12 bg-white/10 px-1 py-1 text-xs text-white rounded outline-none border border-white/20 focus:border-emerald-500 pr-3" />
                            <span className="absolute right-1 text-[10px] text-white/50">%</span>
                          </div>
                        </div>
                        <div className="flex gap-1 w-full mt-1">
                          <button onClick={(e) => { e.stopPropagation(); handleSavePrice(); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-1 text-xs text-white rounded transition">Save</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPrice(null); }} className="flex-1 bg-red-500 hover:bg-red-600 py-1 text-xs text-white rounded transition">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {isEditMode && (
                <button 
                  onClick={() => {
                    const newId = prompt("Enter new module ID/Name (e.g. 'AWS'):");
                    if (newId && newId.trim()) {
                      const id = newId.trim().toLowerCase();
                      updateContent('comboOffers', 'catalogPrices', { ...catalogPrices, [id]: 15000 });
                    }
                  }}
                  className="co-mod-btn flex flex-col items-center justify-center border-dashed border-2 opacity-50 hover:opacity-100 transition min-h-[120px]"
                  style={{ background: 'transparent' }}
                >
                  <span className="text-3xl mb-1">+</span>
                  <span className="font-bold text-xs uppercase tracking-wider">Add Module</span>
                </button>
              )}
            </div>

            {/* Cart Summary */}
            <div className="lg:w-1/3 w-full sticky top-32">
              <div className="co-summary-card">
                <h3 className="co-summary-title">Your Combo Summary</h3>
                
                {selectedModules.length === 0 ? (
                  <div className="co-empty">
                    Select courses from the left to build your combo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="co-summary-list">
                      {selectedModules.map(m => (
                        <div key={m.id} className="flex justify-between text-sm">
                          <span className="font-medium">{m.name}</span>
                          <span className="opacity-60">₹{getPrice(m.id).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Base Total</span>
                      <span className="font-bold">₹{totals.baseTotal.toLocaleString()}</span>
                    </div>

                    {totals.discount > 0 && (
                      <div className="flex justify-between items-center text-sm co-discount-row group">
                        <span className="flex items-center gap-2">
                          Combo Discount ({globalDiscount}%)
                          {isEditMode && (
                            <button onClick={() => { setEditingDiscount(true); setTempDiscount(globalDiscount); }} className="text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                          )}
                        </span>
                        <span>-₹{totals.discount.toLocaleString()}</span>
                      </div>
                    )}
                    {isEditMode && editingDiscount && (
                      <div className="flex gap-2 items-center bg-[#152336] p-3 rounded-lg border border-white/20 mt-2">
                        <input type="number" value={tempDiscount} onChange={e => setTempDiscount(e.target.value)} className="w-16 bg-white/10 px-2 py-1 text-sm text-white rounded outline-none border border-white/20 focus:border-emerald-500" />
                        <span className="text-sm font-bold">%</span>
                        <div className="flex gap-1 ml-auto">
                          <button onClick={handleSaveDiscount} className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 text-xs font-bold text-white rounded transition">Save</button>
                          <button onClick={() => setEditingDiscount(false)} className="bg-red-500 hover:bg-red-600 px-3 py-1 text-xs font-bold text-white rounded transition">Cancel</button>
                        </div>
                      </div>
                    )}

                    <div className="co-summary-total">
                      <span className="font-bold">Final Price</span>
                      <span className="co-total-val">₹{totals.finalPrice.toLocaleString()}</span>
                    </div>

                    <Link 
                      href={`/contact-us?message=${encodeURIComponent(generateEnquiryText())}`}
                      className="co-btn-lg"
                      onClick={(e) => isEditMode && e.preventDefault()}
                    >
                      Enquire About This Combo
                    </Link>

                    {selectedModules.length === 1 && (
                      <p className="co-hint">
                        💡 Add 1 more course to unlock a {globalDiscount}% discount!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>
      <Footer />
      <style jsx>{`
        .co-title {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          background-image: linear-gradient(to right, var(--accent, #60A5FA), #34D399);
        }
        .co-subtitle { color: var(--text-muted); opacity: 0.9; }

        .co-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .co-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-color: var(--border-hover, rgba(52,211,153,0.3));
        }
        .co-badge {
          position: absolute;
          top: 0; right: 0;
          background: #FBBF24;
          color: #000;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 12px;
          border-bottom-left-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .co-card-title { font-weight: bold; font-size: 1.125rem; margin-bottom: 4px; color: var(--text); }
        .co-card-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 24px; }
        
        .co-chip {
          background: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .theme-light .co-chip { color: #2563EB; border-color: rgba(37, 99, 235, 0.2); }

        .co-price-old { font-size: 0.875rem; color: var(--text-muted); text-decoration: line-through; }
        .co-price-new { font-size: 1.875rem; font-weight: 900; color: #34D399; }
        .theme-light .co-price-new { color: #059669; }

        .co-btn {
          display: block;
          text-align: center;
          width: 100%;
          background: var(--accent, #2563EB);
          color: #fff;
          font-weight: bold;
          padding: 12px;
          border-radius: 12px;
          transition: background 0.3s, transform 0.2s;
        }
        .co-btn:hover { filter: brightness(1.1); transform: scale(1.02); }

        .co-mod-btn {
          position: relative;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          text-align: left;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .co-mod-btn:hover { background: var(--bg-hover, rgba(0,0,0,0.02)); border-color: var(--border-hover, rgba(0,0,0,0.1)); transform: translateY(-2px); }
        .co-mod-btn.selected {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3B82F6;
          box-shadow: 0 0 0 1px #3B82F6, 0 4px 20px rgba(59, 130, 246, 0.15);
        }
        .theme-light .co-mod-btn.selected { background: rgba(59, 130, 246, 0.05); }

        .co-mod-check {
          position: absolute;
          top: 8px; right: 8px;
          width: 20px; height: 20px;
          background: #3B82F6;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: bold;
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        }
        .co-mod-img { width: 48px; height: 48px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .co-mod-placeholder {
          width: 48px; height: 48px;
          background: var(--bg-deep);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; color: var(--text); font-size: 0.75rem;
        }
        .co-mod-name { font-weight: bold; color: var(--text); font-size: 0.9rem; }
        .co-mod-price { font-size: 0.875rem; color: #34D399; font-weight: bold; letter-spacing: 0.5px; }
        .theme-light .co-mod-price { color: #059669; }

        .co-summary-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          backdrop-filter: blur(10px);
        }
        .co-summary-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 24px; color: var(--text); }
        .co-empty { opacity: 0.5; font-size: 0.875rem; text-align: center; padding: 32px 0; color: var(--text); }
        
        .co-summary-list { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
        
        .co-discount-row { color: #34D399; font-weight: bold; }
        .theme-light .co-discount-row { color: #059669; }
        
        .co-summary-total {
          display: flex; justify-content: space-between; align-items: flex-end;
          padding-top: 16px; border-top: 1px solid var(--border); margin-top: 16px;
        }
        .co-total-val { font-size: 1.875rem; font-weight: 900; color: var(--text); }
        
        .co-btn-lg {
          display: block; text-align: center; width: 100%;
          background: #10B981; color: white; font-weight: bold;
          padding: 14px; border-radius: 12px; transition: all 0.3s;
          margin-top: 24px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
        }
        .co-btn-lg:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 12px 24px rgba(16, 185, 129, 0.3); }
        
        .co-hint { font-size: 0.75rem; color: #F59E0B; text-align: center; margin-top: 12px; }
        .theme-light .co-hint { color: #D97706; }
      `}</style>
    </>
  );
}
