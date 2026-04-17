'use client';

import { useEffect } from "react";

export function useHomeEffects() {
  useEffect(() => {
    const cleanups = [];
    const prefersReduce = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;
    const connection = typeof navigator !== "undefined" ? navigator.connection || navigator.mozConnection || navigator.webkitConnection : null;
    const saveData = Boolean(connection && connection.saveData);
    const lowPowerDevice = typeof navigator !== "undefined"
      ? (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
      : false;
    const isLightTheme = typeof document !== "undefined" && document.documentElement.classList.contains("theme-light");
    const allowMotion = !prefersReduce && !saveData && !isLightTheme;
    const mobileLiteMode = isMobile || lowPowerDevice;

    /* Typed headline words */
    const cycleEl = document.querySelector(".word-cycle");
    if (cycleEl) {
      const words = ["IT Training", "Staffing & Solutions", "Software Development"];
      let idx = 0;
      const typeWord = (word) => {
        cycleEl.style.opacity = "0";
        cycleEl.style.transform = "translateY(20px)";
        setTimeout(() => {
          cycleEl.textContent = word;
          cycleEl.style.transition = "opacity 0.5s, transform 0.5s";
          cycleEl.style.opacity = "1";
          cycleEl.style.transform = "translateY(0)";
        }, 400);
      };
      typeWord(words[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % words.length;
        typeWord(words[idx]);
      }, 3200);
      cleanups.push(() => clearInterval(interval));
    }

    /* Scroll-scrubbed frame animations */
    const initScrollSequence = ({
      sectionSelector,
      canvasId,
      folder,
      total,
      progressSelector,
      contentSelector,
      navMode = "primary",
      step = 1
    }) => {
      const section = document.querySelector(sectionSelector);
      const canvas = document.getElementById(canvasId);
      if (!section || !canvas) return () => {};

      const ctx = canvas.getContext("2d");
      const frames = [];
      let current = -1;
      const frameStep = Math.max(1, step);
      const sequenceLength = Math.ceil(total / frameStep);

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (current >= 0 && frames[current] && frames[current].complete) {
          drawFrame(current);
        }
      };

      const pad = (n) => String(n).padStart(3, "0");

      const drawFrame = (idx) => {
        const img = frames[idx];
        if (!img || !img.complete || img.naturalWidth === 0) return;
        current = idx;
        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const sw = iw * scale;
        const sh = ih * scale;
        const dx = (cw - sw) / 2;
        const dy = (ch - sh) / 2;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, sw, sh);
      };

      for (let i = 1; i <= total; i++) {
        if ((i - 1) % frameStep !== 0) continue;
        const img = new Image();
        img.src = `${folder}ezgif-frame-${pad(i)}.jpg`;
        img.onload = () => {
          if (current === -1) drawFrame(0);
        };
        frames.push(img);
      }

      const content = contentSelector ? document.querySelector(contentSelector) : null;
      const progressBar = progressSelector ? document.querySelector(progressSelector) : null;
      const navbar = document.querySelector(".navbar");

      const onScroll = () => {
        const rect = section.getBoundingClientRect();
        const sectionH = section.offsetHeight;
        const viewH = window.innerHeight;
        const scrolled = -rect.top;
        const range = sectionH - viewH;
        const progress = Math.max(0, Math.min(1, range === 0 ? 0 : scrolled / range));

        const idx = Math.min(Math.floor(progress * sequenceLength), sequenceLength - 1);
        if (idx !== current) drawFrame(idx);

        if (progressBar) progressBar.style.height = `${progress * 100}%`;
        if (content) {
          if (progress > 0.03 && progress < 0.88) {
            content.classList.add("visible");
          } else {
            content.classList.remove("visible");
          }
        }

        if (navbar) {
          const inView = rect.top < viewH && rect.bottom > 0;
          if (navMode === "primary") {
            navbar.classList.toggle("it-active", inView && progress > 0 && progress < 1);
          } else if (navMode === "secondary") {
            if (!navbar.classList.contains("it-active")) {
              navbar.classList.toggle("it-active", inView && progress > 0 && progress < 1);
            }
          }
        }
      };

      resize();
      onScroll();
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
      };
    };

    if (allowMotion) {
      cleanups.push(
        initScrollSequence({
          sectionSelector: ".it-scroll-section",
          canvasId: "it-canvas",
          folder: "/it/",
          total: 241,
          progressSelector: ".it-progress-bar",
          contentSelector: ".it-content",
          navMode: "primary",
          step: mobileLiteMode ? 3 : 1
        })
      );

      cleanups.push(
        initScrollSequence({
          sectionSelector: ".sd-scroll-section",
          canvasId: "sd-canvas",
          folder: "/soft developer/",
          total: 240,
          progressSelector: ".sd-progress-bar",
          contentSelector: ".sd-content",
          navMode: "secondary",
          step: mobileLiteMode ? 3 : 1
        })
      );

      cleanups.push(
        initScrollSequence({
          sectionSelector: ".ss-scroll-section",
          canvasId: "ss-canvas",
          folder: "/bus/",
          total: 241,
          progressSelector: ".ss-progress-bar",
          contentSelector: ".ss-content",
          navMode: "secondary",
          step: mobileLiteMode ? 3 : 1
        })
      );
    }

    /* Three.js particle background */
    let stopParticles = null;
    if (allowMotion) {
      import("three")
        .then((THREE) => {
          const canvas = document.getElementById("hero-canvas");
          if (!canvas) return;

          const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileLiteMode ? 1.15 : 1.8));
          renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
          renderer.setClearColor(0x000000, 0);

          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(
            60,
            canvas.offsetWidth / canvas.offsetHeight,
            0.1,
            1000
          );
          camera.position.z = 5;

          const COUNT = mobileLiteMode ? 700 : 4000;
          const positions = new Float32Array(COUNT * 3);
          const colors = new Float32Array(COUNT * 3);

          for (let i = 0; i < COUNT * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 20;
            positions[i + 1] = (Math.random() - 0.5) * 12;
            positions[i + 2] = (Math.random() - 0.5) * 10;

            const t = Math.random();
            if (isLightTheme) {
              const shade = 0.55 + Math.random() * 0.35; // mid gray
              colors[i] = shade;
              colors[i + 1] = shade;
              colors[i + 2] = shade;
            } else {
              if (t < 0.5) {
                colors[i] = 0;
                colors[i + 1] = 0.55 + Math.random() * 0.4;
                colors[i + 2] = 1;
              } else {
                colors[i] = 0.05;
                colors[i + 1] = 0.15;
                colors[i + 2] = 0.3 + Math.random() * 0.2;
              }
            }
          }

          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

          const mat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
          });

          const particles = new THREE.Points(geo, mat);
          scene.add(particles);

          const lineMat = new THREE.LineBasicMaterial({
            color: isLightTheme ? 0x4a4a4a : 0x0066aa,
            transparent: true,
            opacity: isLightTheme ? 0.08 : 0.07
          });
          for (let i = 0; i < (mobileLiteMode ? 20 : 60); i++) {
            const a = Math.floor(Math.random() * COUNT) * 3;
            const b = Math.floor(Math.random() * COUNT) * 3;
            const lGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(positions[a], positions[a + 1], positions[a + 2]),
              new THREE.Vector3(positions[b], positions[b + 1], positions[b + 2])
            ]);
            scene.add(new THREE.Line(lGeo, lineMat));
          }

          let mx = 0;
          let my = 0;
          const mouseHandler = (e) => {
            mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
            my = (e.clientY / window.innerHeight - 0.5) * 0.3;
          };
          document.addEventListener("mousemove", mouseHandler);

          let frame;
          const animate = () => {
            frame = requestAnimationFrame(animate);
            particles.rotation.y += 0.0007;
            particles.rotation.x += 0.0002;
            camera.position.x += (mx - camera.position.x) * 0.04;
            camera.position.y += (-my - camera.position.y) * 0.04;
            camera.lookAt(scene.position);
            renderer.render(scene, camera);
          };
          animate();

          const onResize = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          };
          window.addEventListener("resize", onResize);

          stopParticles = () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("mousemove", mouseHandler);
            renderer.dispose();
          };
        })
        .catch(() => {
          /* ignore if three fails to load */
        });
    }

    return () => {
      cleanups.forEach((fn) => typeof fn === "function" && fn());
      if (stopParticles) stopParticles();
    };
  }, []);
}



