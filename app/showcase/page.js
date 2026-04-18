"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';

const images = [
  "/showcaseimages/1691819566226.png", "/showcaseimages/1710061400106.png", "/showcaseimages/1729441731139.png", "/showcaseimages/1_iW95hu86bn_FXskUWh3f7A.jpg", "/showcaseimages/1_xsir-fypCq_LrbK5jjyN9w.jpg", "/showcaseimages/CF-Header.jpg", "/showcaseimages/Graphique représentant SAP PS Project System.webp", "/showcaseimages/How-AI-is-reshaping-SAP.jpg", "/showcaseimages/How-to-Become-a-Python-Full-Stack-Developer.png", "/showcaseimages/QM-Cloud.png", "/showcaseimages/SAP-ABAP.png", "/showcaseimages/SAP-Signavio-Social-Image-1.jpg", "/showcaseimages/image.webp", "/showcaseimages/images (1).jpg", "/showcaseimages/images (1).png", "/showcaseimages/images (10).jpg", "/showcaseimages/images (11).jpg", "/showcaseimages/images (12).jpg", "/showcaseimages/images (13).jpg", "/showcaseimages/images (2).jpg", "/showcaseimages/images (2).png", "/showcaseimages/images (3).jpg", "/showcaseimages/images (3).png", "/showcaseimages/images (4).jpg", "/showcaseimages/images (4).png", "/showcaseimages/images (5).jpg", "/showcaseimages/images (5).png", "/showcaseimages/images (6).jpg", "/showcaseimages/images (6).png", "/showcaseimages/images (7).jpg", "/showcaseimages/images (8).jpg", "/showcaseimages/images (9).jpg", "/showcaseimages/images.jpg", "/showcaseimages/images.png", "/showcaseimages/sap-apo-1-6206515207094633_m.jpg", "/showcaseimages/sap-cpi-training-online-2299122606857394_l.jpg", "/showcaseimages/sap-hana-basis-training-online-1-291331312799802_m.jpg", "/showcaseimages/sap-ps-16082023.webp", "/showcaseimages/sap-scm-training-online-4463569141960685_l.jpg"
];

export default function ShowcasePage() {
  const [columnsCount, setColumnsCount] = useState(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      if (window.innerWidth < 640) setColumnsCount(2); // Mobile layout has 2 columns
      else if (window.innerWidth < 1024) setColumnsCount(3); // Tablet has 3
      else if (window.innerWidth < 1280) setColumnsCount(4); // Small laptop has 4
      else setColumnsCount(5); // Ultra wide has 5
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamically divide all 39 images into distinct buckets depending on screen size
  // This guarantees NO image is duplicated horizontally, AND no image is lost on mobile!
  const buckets = Array.from({ length: 5 }, () => []);
  if (mounted) {
    images.forEach((img, i) => {
      const bucketIndex = i % columnsCount;
      buckets[bucketIndex].push(img);
    });
  }

  // Duplicate the buckets purely for seamless vertical scroll height buffer
  const col1 = [...buckets[0], ...buckets[0], ...buckets[0], ...buckets[0]];
  const col2 = [...buckets[1], ...buckets[1], ...buckets[1], ...buckets[1]];
  const col3 = [...buckets[2], ...buckets[2], ...buckets[2], ...buckets[2]];
  const col4 = [...buckets[3], ...buckets[3], ...buckets[3], ...buckets[3]];
  const col5 = [...buckets[4], ...buckets[4], ...buckets[4], ...buckets[4]];

  return (
    <>
      <Navbar />
      <div className="relative w-full h-screen bg-[var(--bg-deep)] overflow-hidden flex items-center justify-center transition-colors duration-500">
      
      {/* Background Grid Container */}
      <div className={`absolute inset-0 flex gap-2 p-2 opacity-50 scale-110 md:-rotate-3 md:scale-125 pointer-events-none transition-opacity duration-500 ${mounted ? 'opacity-50' : 'opacity-0'}`}>
        
        {/* Column 1 - Moves Standard Speed */}
        {mounted && columnsCount >= 1 && (
          <div className="flex-1 flex flex-col gap-2 animate-scroll-up pt-12 min-w-[150px] md:min-w-[250px]">
            {col1.map((src, i) => (
              <div key={i} className="w-full h-[100px] md:h-[160px] shrink-0 bg-[var(--blue-dim)] rounded-sm overflow-hidden shadow-xl transition-colors duration-500">
                 <img src={encodeURI(src)} className="w-full h-full object-cover" alt="Grid item" />
              </div>
            ))}
          </div>
        )}

        {/* Column 2 - Moves Slower, Reversed Images */}
        {mounted && columnsCount >= 2 && (
          <div className="flex-1 flex flex-col gap-2 animate-scroll-up [animation-duration:25s] -mt-10 min-w-[150px] md:min-w-[250px]">
            {col2.slice().reverse().map((src, i) => (
              <div key={i} className="w-full h-[120px] md:h-[180px] shrink-0 bg-[var(--bg-mid)] rounded-sm overflow-hidden shadow-xl transition-colors duration-500">
                 <img src={encodeURI(src)} className="w-full h-full object-cover" alt="Grid item" />
              </div>
            ))}
          </div>
        )}

        {/* Column 3 - Fast Speed */}
        {mounted && columnsCount >= 3 && (
          <div className="flex-1 flex flex-col gap-2 animate-scroll-up [animation-duration:15s] mt-5 min-w-[150px] md:min-w-[250px]">
            {col3.map((src, i) => (
              <div key={i} className="w-full h-[140px] md:h-[200px] shrink-0 bg-[var(--bg-deep)] rounded-sm overflow-hidden shadow-xl transition-colors duration-500">
                 <img src={encodeURI(src)} className="w-full h-full object-cover" alt="Grid item" />
              </div>
            ))}
          </div>
        )}

        {/* Column 4 - Slowest Speed */}
        {mounted && columnsCount >= 4 && (
          <div className="flex-1 flex flex-col gap-2 animate-scroll-up [animation-duration:32s] -mt-20 min-w-[150px] md:min-w-[250px]">
            {col4.slice().reverse().map((src, i) => (
              <div key={i} className="w-full h-[110px] md:h-[170px] shrink-0 bg-[var(--blue-dim)] rounded-sm overflow-hidden shadow-xl transition-colors duration-500">
                 <img src={encodeURI(src)} className="w-full h-full object-cover" alt="Grid item" />
              </div>
            ))}
          </div>
        )}

        {/* Column 5 - Average Speed */}
        {mounted && columnsCount >= 5 && (
          <div className="flex-1 flex flex-col gap-2 animate-scroll-up [animation-duration:22s] min-w-[150px] md:min-w-[250px]">
            {col5.map((src, i) => (
            <div key={i} className="w-full h-[130px] md:h-[190px] shrink-0 bg-[var(--bg-mid)] rounded-sm overflow-hidden shadow-xl transition-colors duration-500">
               <img src={src} className="w-full h-full object-cover" alt="Grid item" />
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Cinematic Dark Fade Overlay (Faded from top so top text is readable) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-500" 
        style={{ background: 'linear-gradient(to bottom, var(--bg-deep) 0%, var(--bg-card) 25%, transparent 100%)' }}
      />

      {/* Foreground Text Block (Moved to Top) */}
      <div className="absolute top-24 md:top-32 z-10 flex flex-col items-center justify-start p-4 w-full text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-5xl font-black hover:scale-105 transition-transform duration-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-tight mb-2" style={{ color: 'var(--white)' }}>
          SSR BUSINESS SOLUTION
        </h1>
        <p className="text-sm sm:text-base md:text-xl font-medium tracking-[0.3em] uppercase mb-1 drop-shadow-md" style={{ color: 'var(--text)' }}>
          training | placement
        </p>
        <p className="text-base sm:text-lg md:text-2xl font-bold tracking-[0.2em] uppercase drop-shadow-lg" style={{ color: 'var(--accent)' }}>
          showcase.
        </p>
      </div>

    </div>
    </>
  );
}
