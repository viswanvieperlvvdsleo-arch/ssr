'use client';

import { useEffect } from "react";

export function useSharedEffects(options = {}) {
  const {
    enableCounters = false,
    enableSpotlight = false,
    enableReveal = false,
    enableContactForm = false,
    enableSmoothAnchors = false
  } = options;

  useEffect(() => {
    const cleanups = [];

    if (enableReveal) {
      const targets = document.querySelectorAll(".fade-up, .fade-left, .fade-right");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const delay = parseInt(entry.target.dataset.delay || "0", 10);
              setTimeout(() => entry.target.classList.add("visible"), delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      targets.forEach((el) => observer.observe(el));
      cleanups.push(() => observer.disconnect());
    }

    if (enableCounters) {
      const counters = document.querySelectorAll(".stat-count");
      const counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              const target = parseInt(el.dataset.target || "0", 10);
              const suffix = el.dataset.suffix || "";
              let current = 0;
              const step = Math.max(1, Math.ceil(target / 70));
              const interval = setInterval(() => {
                current = Math.min(current + step, target);
                el.textContent = `${current}${suffix}`;
                if (current >= target) clearInterval(interval);
              }, 25);
              counterObserver.unobserve(el);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((c) => counterObserver.observe(c));
      cleanups.push(() => counterObserver.disconnect());
    }

    if (enableSpotlight) {
      const cards = document.querySelectorAll(".service-card");
      const handlers = [];
      cards.forEach((card) => {
        const fn = (e) => {
          const rect = card.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty("--x", `${x}%`);
          card.style.setProperty("--y", `${y}%`);
        };
        card.addEventListener("mousemove", fn);
        handlers.push(() => card.removeEventListener("mousemove", fn));
      });
      cleanups.push(() => handlers.forEach((fn) => fn()));
    }

    if (enableContactForm) {
      const form = document.querySelector(".contact-form-el");
      if (form) {
        const submitHandler = (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
          if (btn) {
            btn.textContent = "Message Sent ?";
            btn.style.background = "linear-gradient(135deg, #0a5e2e, #1a8a4a)";
            btn.style.boxShadow = "0 0 25px rgba(0,200,80,0.3)";
            setTimeout(() => {
              btn.textContent = "Send Message";
              btn.style.background = "";
              btn.style.boxShadow = "";
              form.reset();
            }, 3500);
          }
        };
        form.addEventListener("submit", submitHandler);
        cleanups.push(() => form.removeEventListener("submit", submitHandler));
      }
    }

    if (enableSmoothAnchors) {
      const anchors = Array.from(document.querySelectorAll('a[href^="#"]'));
      const handlers = anchors.map((anchor) => {
        const fn = (e) => {
          const id = anchor.getAttribute("href");
          if (!id || id === "#") return;
          const target = document.querySelector(id);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        };
        anchor.addEventListener("click", fn);
        return () => anchor.removeEventListener("click", fn);
      });
      cleanups.push(() => handlers.forEach((fn) => fn()));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [enableCounters, enableSpotlight, enableReveal, enableContactForm, enableSmoothAnchors]);
}

