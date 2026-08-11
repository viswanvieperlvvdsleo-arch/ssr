'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCMS } from './CMSContext';
import { usePathname } from 'next/navigation';

export default function ComboSticker() {
  const { globalContent, isEditMode, updateContent } = useCMS();
  const comboOffers = globalContent?.comboOffers || {};
  const sticker = comboOffers.sticker || { enabled: false };
  const pathname = usePathname();

  const [opacity, setOpacity] = useState(1);
  const [activeZone, setActiveZone] = useState(null); // 'text', 'orig', 'disc', 'timer'
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0, isExpired: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const newOpacity = Math.max(0, 1 - scrollY / 400);
      setOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!sticker.expiryDate) {
      setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0, isExpired: false });
      return;
    }
    
    const calculateTimeLeft = () => {
      const end = new Date(sticker.expiryDate).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, mins: 0, secs: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        mins: Math.floor((difference / 1000 / 60) % 60),
        secs: Math.floor((difference / 1000) % 60),
        isExpired: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [sticker.expiryDate]);

  // Only show if enabled in CMS (and after mount to avoid hydration mismatch)
  if (!mounted || (!sticker.enabled && !isEditMode)) {
    return null;
  }

  // Hide if expired, unless in edit mode
  if (timeLeft.isExpired && sticker.expiryDate && !isEditMode) {
    return null;
  }

  if (opacity === 0 && !isEditMode) return null;

  // Pull per-element style settings (with safe defaults)
  const ts = sticker.textStyle      || { top: 64, left: 50, fontSize: 18, rotate: 0 };
  const os = sticker.origPriceStyle || { bottom: 19, left: 50, fontSize: 14, rotate: -6 };
  const ds = sticker.discPriceStyle || { bottom: 7, left: 50, fontSize: 28, rotate: 0 };
  const tms = sticker.timerStyle    || { bottom: 2, left: 50, fontSize: 12, rotate: 0 };

  const Wrapper = isEditMode ? 'div' : Link;
  const wrapperProps = isEditMode ? {} : { href: "/combo-offers" };

  const updateSticker = (key, value) => {
    updateContent('comboOffers', 'sticker', { ...sticker, [key]: value });
  };
  const updateStyle = (styleKey, prop, value) => {
    const currentStyle = sticker[styleKey] || {};
    updateContent('comboOffers', 'sticker', {
      ...sticker,
      [styleKey]: { ...currentStyle, [prop]: Number(value) }
    });
  };

  const renderEditorPanel = () => {
    if (!isEditMode || !activeZone) return null;
    
    let currentText = '';
    let styleKey = '';
    let currentStyle = {};
    let textKey = '';

    if (activeZone === 'text') {
      textKey = 'text'; currentText = sticker.text || 'TALLY + MS OFFICE + FICO'; styleKey = 'textStyle'; currentStyle = ts;
    } else if (activeZone === 'orig') {
      textKey = 'originalPrice'; currentText = sticker.originalPrice || '₹45,000'; styleKey = 'origPriceStyle'; currentStyle = os;
    } else if (activeZone === 'disc') {
      textKey = 'discountPrice'; currentText = sticker.discountPrice || '₹38,250'; styleKey = 'discPriceStyle'; currentStyle = ds;
    } else if (activeZone === 'timer') {
      styleKey = 'timerStyle'; currentStyle = tms;
    }

    const yKey = currentStyle.top !== undefined ? 'top' : 'bottom';

    return (
      <div className="fixed top-24 right-4 md:right-[320px] bg-[#111827] border border-white/20 p-5 rounded-xl shadow-2xl z-[999] w-72 text-white font-sans text-sm backdrop-blur-md">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
          <h4 className="font-bold text-emerald-400">Edit Overlay: {activeZone.toUpperCase()}</h4>
          <button onClick={(e) => { e.stopPropagation(); setActiveZone(null); }} className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-6 h-6 flex items-center justify-center transition">✕</button>
        </div>
        
        <div className="space-y-4">
          {activeZone === 'timer' && (
            <div>
              <label className="block text-xs opacity-70 mb-1">Expiration Date & Time</label>
              <input type="datetime-local" value={sticker.expiryDate || ''} onChange={e => updateSticker('expiryDate', e.target.value)} className="w-full bg-white/10 rounded px-3 py-2 text-white border border-white/20 focus:outline-none focus:border-emerald-500 transition" />
            </div>
          )}
          {activeZone !== 'timer' && (
            <div>
              <label className="block text-xs opacity-70 mb-1">Text Content</label>
              <input type="text" value={currentText} onChange={e => updateSticker(textKey, e.target.value)} className="w-full bg-white/10 rounded px-3 py-2 text-white border border-white/20 focus:outline-none focus:border-emerald-500 transition" />
            </div>
          )}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="opacity-70">Vertical ({yKey})</span>
              <span className="text-emerald-400 font-bold">{currentStyle[yKey]}%</span>
            </div>
            <input type="range" min="0" max="100" value={currentStyle[yKey]} onChange={e => updateStyle(styleKey, yKey, e.target.value)} className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="opacity-70">Horizontal (left)</span>
              <span className="text-emerald-400 font-bold">{currentStyle.left}%</span>
            </div>
            <input type="range" min="0" max="100" value={currentStyle.left} onChange={e => updateStyle(styleKey, 'left', e.target.value)} className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="opacity-70">Font Size</span>
              <span className="text-emerald-400 font-bold">{currentStyle.fontSize}px</span>
            </div>
            <input type="range" min="8" max="64" value={currentStyle.fontSize} onChange={e => updateStyle(styleKey, 'fontSize', e.target.value)} className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="opacity-70">Rotation</span>
              <span className="text-emerald-400 font-bold">{currentStyle.rotate}°</span>
            </div>
            <input type="range" min="-180" max="180" value={currentStyle.rotate} onChange={e => updateStyle(styleKey, 'rotate', e.target.value)} className="w-full accent-emerald-500" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderEditorPanel()}
      <Wrapper {...wrapperProps} 
        className={`fixed z-40 transition-all duration-300 ease-in-out origin-bottom-right md:origin-top-right top-auto bottom-[80px] right-[10px] md:top-[100px] md:bottom-auto md:right-[10px]`}
        style={{
          opacity: isEditMode ? 1 : opacity,
          transform: `scale(${0.7 + ((isEditMode ? 1 : opacity) * 0.3)})`,
          pointerEvents: (opacity > 0.2 || isEditMode) ? 'auto' : 'none'
        }}
      >
        <div className={`relative transition-transform duration-300 w-[180px] sm:w-[220px] md:w-[280px] scale-[0.65] sm:scale-100 origin-bottom-right md:origin-top-right ${!isEditMode ? 'hover:scale-105 cursor-pointer' : ''}`}
             style={isEditMode ? { outline: '2px dashed rgba(16, 185, 129, 0.5)', outlineOffset: '8px', borderRadius: '16px' } : {}}
        >
          
          {/* Base Image */}
          <img 
            src="/homepage for mobile/offere sticker.png" 
            alt="Special Offer" 
            className="w-full h-auto drop-shadow-2xl"
            onClick={() => isEditMode && setActiveZone(null)}
          />

          {/* --- Module Text Overlay --- */}
          <div 
            onClick={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation(); setActiveZone('text'); } }}
            className={`absolute font-black text-[#152336] text-center leading-[1.1] uppercase flex flex-col items-center justify-center w-[60%] transition-all ${isEditMode && activeZone === 'text' ? 'ring-4 ring-emerald-500 bg-emerald-500/20 rounded p-2 z-50 scale-110' : ''} ${isEditMode && activeZone !== 'text' ? 'cursor-pointer hover:ring-2 hover:ring-white/50 rounded' : ''}`}
            style={{
              top: `${ts.top}%`,
              left: `${ts.left}%`,
              transform: `translate(-50%, -50%) rotate(${ts.rotate}deg)`,
              fontSize: `${ts.fontSize}px`,
            }}
          >
            {(sticker.text || 'TALLY + MS OFFICE + FICO').split('+').map((item, idx, arr) => (
              <span key={idx} className="flex flex-col items-center">
                <span>{item.trim()}</span>
                {idx < arr.length - 1 && <span className="text-[#E62828]" style={{ fontSize: `${ts.fontSize * 0.75}px`, margin: '1px 0' }}>+</span>}
              </span>
            ))}
          </div>

          {/* --- Original Price Overlay (Crossed Out) --- */}
          <div 
            onClick={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation(); setActiveZone('orig'); } }}
            className={`absolute font-bold text-black flex items-center justify-center whitespace-nowrap transition-all ${isEditMode && activeZone === 'orig' ? 'ring-4 ring-emerald-500 bg-emerald-500/20 rounded p-1 z-50 scale-110' : ''} ${isEditMode && activeZone !== 'orig' ? 'cursor-pointer hover:ring-2 hover:ring-white/50 rounded' : ''}`}
            style={{
              bottom: `${os.bottom}%`,
              left: `${os.left}%`,
              transform: `translateX(-50%) rotate(${os.rotate}deg)`,
              fontSize: `${os.fontSize}px`,
            }}
          >
            <span className="relative z-10 tracking-wider">
              {sticker.originalPrice || '₹45,000'}
            </span>
            <span className="absolute w-[110%] h-[2px] bg-[#E62828] z-20" style={{ transform: 'rotate(-3deg)' }}></span>
          </div>

          {/* --- Discounted Price Overlay --- */}
          <div 
            onClick={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation(); setActiveZone('disc'); } }}
            className={`absolute font-black text-white text-center whitespace-nowrap transition-all ${isEditMode && activeZone === 'disc' ? 'ring-4 ring-emerald-500 bg-emerald-500/20 rounded p-1 z-50 scale-110' : ''} ${isEditMode && activeZone !== 'disc' ? 'cursor-pointer hover:ring-2 hover:ring-white/50 rounded' : ''}`}
            style={{
              bottom: `${ds.bottom}%`,
              left: `${ds.left}%`,
              transform: `translateX(-50%) rotate(${ds.rotate}deg)`,
              fontSize: `${ds.fontSize}px`,
              textShadow: '1px 1px 3px rgba(0,0,0,0.4)'
            }}
          >
            {sticker.discountPrice || '₹38,250'}
          </div>

          {/* --- Countdown Timer Overlay --- */}
          {(sticker.expiryDate || isEditMode) && !timeLeft.isExpired && (
            <div 
              onClick={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation(); setActiveZone('timer'); } }}
              className={`absolute font-bold text-red-600 bg-white/90 px-2 py-0.5 rounded-full whitespace-nowrap transition-all ${isEditMode && activeZone === 'timer' ? 'ring-4 ring-emerald-500 bg-emerald-500/20 z-50 scale-110' : ''} ${isEditMode && activeZone !== 'timer' ? 'cursor-pointer hover:ring-2 hover:ring-white/50' : ''}`}
              style={{
                bottom: `${tms.bottom}%`,
                left: `${tms.left}%`,
                transform: `translateX(-50%) rotate(${tms.rotate}deg)`,
                fontSize: `${tms.fontSize}px`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              ⏳ Ends in: {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{timeLeft.hours}h {timeLeft.mins}m {timeLeft.secs}s
            </div>
          )}

        </div>
      </Wrapper>
    </>
  );
}
