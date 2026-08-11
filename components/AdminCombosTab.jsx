'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useCMS } from './CMSContext';

const DEFAULT_STICKER = {
  text: "Tally + MS Office + FICO",
  originalPrice: "₹45,000",
  discountPrice: "₹38,250",
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  enabled: true,
  textStyle:      { top: 64, left: 50, fontSize: 18, rotate: 0 },
  origPriceStyle: { bottom: 19, left: 50, fontSize: 14, rotate: -6 },
  discPriceStyle: { bottom: 7,  left: 50, fontSize: 28, rotate: 0 }
};

// Converts bottom% → top% so we can uniformly use top for dragging
function toTop(style, imgHeight) {
  if (style.bottom !== undefined) {
    return 100 - style.bottom;
  }
  return style.top;
}

function StickerLayer({ id, label, text, style, imgRef, onChange, onSelect, isSelected, isCrossed }) {
  const layerRef = useRef(null);
  const isDragging = useRef(false);
  const startPos = useRef({});

  // Compute actual top% (even if stored as bottom%)
  const topPct = style.top !== undefined ? style.top : (100 - (style.bottom || 0));

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY, top: topPct, left: style.left };

    const onMove = (e2) => {
      if (!isDragging.current || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const dx = ((e2.clientX - startPos.current.x) / rect.width) * 100;
      const dy = ((e2.clientY - startPos.current.y) / rect.height) * 100;
      const newTop = Math.max(0, Math.min(100, startPos.current.top + dy));
      const newLeft = Math.max(0, Math.min(100, startPos.current.left + dx));
      const newStyle = { ...style };
      if (newStyle.bottom !== undefined) {
        newStyle.bottom = Math.max(0, Math.min(100, 100 - newTop));
      } else {
        newStyle.top = newTop;
      }
      newStyle.left = newLeft;
      onChange(newStyle);
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const textColor = id === 'discountPrice' ? '#ffffff' : '#152336';

  return (
    <div
      ref={layerRef}
      onMouseDown={handleMouseDown}
      className={`absolute cursor-move flex flex-col items-center select-none group`}
      style={{
        top: `${topPct}%`,
        left: `${style.left}%`,
        transform: `translate(-50%, -50%) rotate(${style.rotate || 0}deg)`,
        fontSize: `${style.fontSize || 16}px`,
        fontWeight: 900,
        color: textColor,
        textAlign: 'center',
        lineHeight: 1.1,
        zIndex: isSelected ? 20 : 10,
        outline: isSelected ? '2px dashed rgba(59,130,246,0.8)' : '2px dashed transparent',
        outlineOffset: '4px',
        padding: '4px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        textShadow: id === 'discountPrice' ? '1px 1px 3px rgba(0,0,0,0.4)' : 'none',
        userSelect: 'none',
      }}
      title={label}
    >
      {id === 'modules'
        ? (text || '').split('+').map((item, idx, arr) => (
            <span key={idx} className="flex flex-col items-center uppercase">
              <span>{item.trim()}</span>
              {idx < arr.length - 1 && <span style={{ color: '#E62828', fontSize: `${(style.fontSize || 16) * 0.75}px`, margin: '1px 0' }}>+</span>}
            </span>
          ))
        : isCrossed
          ? <span className="relative">
              <span>{text}</span>
              <span className="absolute left-0 top-1/2 w-full h-[2px] bg-[#E62828]" style={{ transform: 'rotate(-3deg)' }} />
            </span>
          : text
      }
    </div>
  );
}

export default function AdminCombosTab() {
  const { globalContent, updateContent, isSaving, saveSuccess } = useCMS();
  const comboOffers = globalContent?.comboOffers || {};

  const [stickerData, setStickerData] = useState({
    ...DEFAULT_STICKER,
    ...(comboOffers.sticker || {}),
    textStyle:      { ...DEFAULT_STICKER.textStyle,      ...(comboOffers.sticker?.textStyle || {}) },
    origPriceStyle: { ...DEFAULT_STICKER.origPriceStyle, ...(comboOffers.sticker?.origPriceStyle || {}) },
    discPriceStyle: { ...DEFAULT_STICKER.discPriceStyle, ...(comboOffers.sticker?.discPriceStyle || {}) },
  });

  const [predefined, setPredefined] = useState(comboOffers.predefined || []);
  const [catalog, setCatalog] = useState(comboOffers.catalogPrices || {});
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatVal, setNewCatVal] = useState('');
  const [selected, setSelected] = useState(null); // 'modules' | 'origPrice' | 'discountPrice'

  const imgRef = useRef(null);

  const layerConfig = {
    modules:       { label: 'Module Text',      style: stickerData.textStyle,      text: stickerData.text,          key: 'textStyle' },
    origPrice:     { label: 'Original Price',   style: stickerData.origPriceStyle, text: stickerData.originalPrice, key: 'origPriceStyle' },
    discountPrice: { label: 'Discount Price',   style: stickerData.discPriceStyle, text: stickerData.discountPrice, key: 'discPriceStyle' },
  };

  const updateStyle = (layerId, newStyle) => {
    const key = layerConfig[layerId].key;
    setStickerData(prev => ({ ...prev, [key]: newStyle }));
  };

  const updateLayerText = (field, val) => setStickerData(prev => ({ ...prev, [field]: val }));

  const selectedCfg = selected ? layerConfig[selected] : null;
  const selectedStyle = selectedCfg?.style;

  const handleSave = () => {
    updateContent('comboOffers', 'sticker', stickerData);
  };

  // Deselect when clicking outside
  const handleCanvasClick = () => setSelected(null);

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const btnBlue = "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition";

  return (
    <div className="space-y-8">
      <div className="h-6">
        {isSaving && <span className="text-blue-400 text-sm animate-pulse">Saving...</span>}
        {saveSuccess && <span className="text-emerald-400 text-sm">✅ Saved!</span>}
      </div>

      {/* ── STICKER VISUAL EDITOR ── */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
        <h2 className="text-lg font-bold mb-1 text-white/90">HOME PAGE STICKER EDITOR</h2>
        <p className="text-xs text-white/40 mb-6">Click a text layer on the sticker to select it, then drag to move or use the controls on the right to resize, rotate, and edit text.</p>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Canvas ── */}
          <div
            className="relative select-none"
            style={{ width: '280px', flexShrink: 0 }}
            onClick={handleCanvasClick}
          >
            <img
              ref={imgRef}
              src="/homepage for mobile/offere sticker.png"
              alt="Sticker Preview"
              className="w-full h-auto drop-shadow-2xl rounded-lg"
              draggable={false}
            />

            {Object.entries(layerConfig).map(([id, cfg]) => (
              <StickerLayer
                key={id}
                id={id}
                label={cfg.label}
                text={cfg.text}
                style={cfg.style}
                imgRef={imgRef}
                onChange={(newStyle) => updateStyle(id, newStyle)}
                onSelect={setSelected}
                isSelected={selected === id}
                isCrossed={id === 'origPrice'}
              />
            ))}

            {/* Hint when nothing selected */}
            {!selected && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-black/60 text-white/60 text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                  Click a text layer to select
                </span>
              </div>
            )}
          </div>

          {/* ── Controls Panel ── */}
          <div className="flex-1 space-y-4">
            {!selected ? (
              <div className="text-center text-white/40 py-12">
                <div className="text-4xl mb-3">👆</div>
                <p className="text-sm">Click a text on the sticker to start editing</p>
                <div className="mt-6 flex flex-col gap-3 text-left">
                  {Object.entries(layerConfig).map(([id, cfg]) => (
                    <button key={id} onClick={(e) => { e.stopPropagation(); setSelected(id); }}
                      className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition group">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span className="text-sm text-white/70 group-hover:text-white">{cfg.label}</span>
                      <span className="ml-auto text-[10px] text-white/30">click to edit →</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white/90 text-base">
                    Editing: <span className="text-blue-400">{selectedCfg.label}</span>
                  </h3>
                  <button onClick={() => setSelected(null)} className="text-xs text-white/40 hover:text-white bg-white/5 px-3 py-1 rounded-lg transition">
                    ✕ Done
                  </button>
                </div>

                {/* Text */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">
                    {selected === 'modules' ? 'Text (use + to separate courses)' : 'Text'}
                  </label>
                  <input
                    type="text"
                    value={
                      selected === 'modules' ? stickerData.text :
                      selected === 'origPrice' ? stickerData.originalPrice :
                      stickerData.discountPrice
                    }
                    onChange={e => {
                      const field = selected === 'modules' ? 'text' : selected === 'origPrice' ? 'originalPrice' : 'discountPrice';
                      updateLayerText(field, e.target.value);
                    }}
                    className={inputCls}
                    placeholder={selected === 'modules' ? 'e.g. Tally + FICO + MS Office' : '₹38,250'}
                  />
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-white/50">Font Size</label>
                    <span className="text-xs text-blue-400 font-bold">{selectedStyle?.fontSize || 16}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateStyle(selected, { ...selectedStyle, fontSize: Math.max(8, (selectedStyle?.fontSize || 16) - 1) })}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-lg font-bold text-white/80 flex items-center justify-center transition"
                    >A</button>
                    <input type="range" min="8" max="60" value={selectedStyle?.fontSize || 16}
                      onChange={e => updateStyle(selected, { ...selectedStyle, fontSize: parseInt(e.target.value) })}
                      className="flex-1 accent-blue-500" />
                    <button
                      onClick={() => updateStyle(selected, { ...selectedStyle, fontSize: Math.min(60, (selectedStyle?.fontSize || 16) + 1) })}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-xl font-bold text-white/80 flex items-center justify-center transition"
                    >A</button>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-white/50">Rotation</label>
                    <span className="text-xs text-purple-400 font-bold">{selectedStyle?.rotate || 0}°</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateStyle(selected, { ...selectedStyle, rotate: (selectedStyle?.rotate || 0) - 1 })}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 flex items-center justify-center transition text-lg"
                    >↺</button>
                    <input type="range" min="-45" max="45" value={selectedStyle?.rotate || 0}
                      onChange={e => updateStyle(selected, { ...selectedStyle, rotate: parseInt(e.target.value) })}
                      className="flex-1 accent-purple-500" />
                    <button
                      onClick={() => updateStyle(selected, { ...selectedStyle, rotate: (selectedStyle?.rotate || 0) + 1 })}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 flex items-center justify-center transition text-lg"
                    >↻</button>
                  </div>
                </div>

                {/* Position Fine-tune */}
                <div className="bg-black/20 p-3 rounded-xl">
                  <label className="text-xs text-white/50 block mb-2">Fine-tune Position</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-white/40 block mb-1">
                        {selectedStyle?.bottom !== undefined ? 'Bottom %' : 'Top %'}
                      </label>
                      <input type="number" step="0.5"
                        value={selectedStyle?.bottom !== undefined ? selectedStyle.bottom : (selectedStyle?.top || 0)}
                        onChange={e => {
                          const key = selectedStyle?.bottom !== undefined ? 'bottom' : 'top';
                          updateStyle(selected, { ...selectedStyle, [key]: parseFloat(e.target.value) });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-white/40 block mb-1">Left %</label>
                      <input type="number" step="0.5" value={selectedStyle?.left || 50}
                        onChange={e => updateStyle(selected, { ...selectedStyle, left: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs" />
                    </div>
                  </div>
                </div>

                {/* Reset Layer */}
                <button onClick={() => {
                  const defaults = { textStyle: DEFAULT_STICKER.textStyle, origPriceStyle: DEFAULT_STICKER.origPriceStyle, discPriceStyle: DEFAULT_STICKER.discPriceStyle };
                  const key = layerConfig[selected].key;
                  updateStyle(selected, defaults[key]);
                }} className="text-xs text-red-400/70 hover:text-red-400 transition">
                  Reset to default position
                </button>
              </div>
            )}

            {/* Global Sticker Settings */}
            <div className="border-t border-white/10 pt-5 space-y-3 mt-4">
              <p className="text-xs uppercase tracking-widest text-white/40">Global Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Expiry Date</label>
                  <input type="date" value={stickerData.expiryDate?.split('T')[0] || ''}
                    onChange={e => setStickerData(p => ({ ...p, expiryDate: e.target.value }))}
                    className={inputCls} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={stickerData.enabled}
                      onChange={e => setStickerData(p => ({ ...p, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-blue-500" />
                    <span className="text-sm text-white/70">Show on Home Page</span>
                  </label>
                </div>
              </div>

              <button onClick={handleSave} className={btnBlue + ' w-full mt-3'}>
                💾 Save All Sticker Changes
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── CATALOG PRICES ── */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
        <h2 className="text-lg font-bold tracking-wider mb-1 text-white/90">FREESTYLE CATALOG PRICES</h2>
        <p className="text-xs text-white/40 mb-4">Base prices used in the combo builder calculator.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
          {Object.entries(catalog).map(([key, val]) => (
            <div key={key} className="flex flex-col bg-black/20 p-2 rounded-lg">
              <span className="text-[10px] text-white/50 uppercase mb-1">{key}</span>
              <input type="number" value={val}
                onChange={e => setCatalog({ ...catalog, [key]: Number(e.target.value) })}
                className="w-full bg-transparent border-b border-white/10 text-white focus:outline-none py-1" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input type="text" placeholder="ID (e.g. tally)" value={newCatKey}
            onChange={e => setNewCatKey(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white w-32" />
          <input type="number" placeholder="Price" value={newCatVal}
            onChange={e => setNewCatVal(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white w-28" />
          <button onClick={() => { if (newCatKey && newCatVal) { setCatalog({ ...catalog, [newCatKey]: Number(newCatVal) }); setNewCatKey(''); setNewCatVal(''); } }}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition">+ Add</button>
        </div>
        <button onClick={() => updateContent('comboOffers', 'catalogPrices', catalog)} className={btnBlue}>💾 Save Prices</button>
      </div>

      {/* ── PREDEFINED COMBOS ── */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
        <h2 className="text-lg font-bold tracking-wider mb-1 text-white/90">PREDEFINED COMBOS</h2>
        <p className="text-xs text-white/40 mb-4">Fixed combos shown on the Combo Offers page.</p>
        <div className="space-y-5 mb-4">
          {predefined.map((combo, i) => (
            <div key={combo.id} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative">
              <button onClick={() => { const a = [...predefined]; a.splice(i, 1); setPredefined(a); }}
                className="absolute top-2 right-2 text-red-400 text-xs px-2 py-1 hover:bg-red-500/20 rounded">Remove</button>
              <div>
                <label className="block text-[10px] text-white/50 uppercase mb-1">Title</label>
                <input type="text" value={combo.title}
                  onChange={e => { const a = [...predefined]; a[i] = { ...a[i], title: e.target.value }; setPredefined(a); }}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] text-white/50 uppercase mb-1">Description</label>
                <input type="text" value={combo.description}
                  onChange={e => { const a = [...predefined]; a[i] = { ...a[i], description: e.target.value }; setPredefined(a); }}
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/50 uppercase mb-1">Original Price</label>
                  <input type="number" value={combo.originalPrice}
                    onChange={e => { const a = [...predefined]; a[i] = { ...a[i], originalPrice: Number(e.target.value) }; setPredefined(a); }}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 uppercase mb-1">Discounted Price</label>
                  <input type="number" value={combo.discountedPrice}
                    onChange={e => { const a = [...predefined]; a[i] = { ...a[i], discountedPrice: Number(e.target.value) }; setPredefined(a); }}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/50 uppercase mb-1">Modules (comma separated)</label>
                <input type="text" value={combo.modules.join(', ')}
                  onChange={e => { const a = [...predefined]; a[i] = { ...a[i], modules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }; setPredefined(a); }}
                  className={inputCls} placeholder="e.g. Tally, FICO, MM" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 flex-wrap">
          <button onClick={() => setPredefined([...predefined, { id: `combo_${Date.now()}`, title: "New Combo", description: "Description here", originalPrice: 40000, discountedPrice: 35000, modules: [] }])}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-sm transition">+ Add Combo</button>
          <button onClick={() => updateContent('comboOffers', 'predefined', predefined)} className={btnBlue}>💾 Save Combos</button>
        </div>
      </div>
    </div>
  );
}
