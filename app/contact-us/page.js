"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "../../components/CMSContext";
import EditableText from "../../components/EditableText";

function triggerConfetti() {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles = [];
  const colors = ['#2E5E99', '#7BA4D0', '#004d80', '#E7F0FA', '#1B4F7A'];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 50,
      y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 14 - 6,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8
    });
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    let alive = false;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // friction
      p.rotation += p.rotationSpeed;

      if (p.y < window.innerHeight + 20) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(update);
    } else {
      try {
        document.body.removeChild(canvas);
      } catch (e) {
        // ignore if already removed
      }
    }
  }

  update();
}

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: ""
};

function ContactPageContent() {
  const searchParams = useSearchParams();
  const nameInputRef = useRef(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitState, setSubmitState] = useState({
    status: "idle",
    message: ""
  });

  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  const composeMode = searchParams.get("compose") === "1";

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const getCookie = (name) => {
      const parts = `; ${document.cookie}`.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
      return '';
    };

    const storedName = getCookie('visitor_name');
    const storedEmail = getCookie('visitor_email');
    const storedPhone = getCookie('visitor_phone');

    if (storedName || storedEmail || storedPhone) {
      setFormData((current) => ({
        ...current,
        name: storedName || current.name,
        email: storedEmail || current.email,
        phone: storedPhone || current.phone
      }));
    }

    if (!composeMode) {
      return;
    }

    nameInputRef.current?.focus();
    document.getElementById("message-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [composeMode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitState.status === "submitting") {
      return;
    }

    setSubmitState({
      status: "submitting",
      message: "Sending your message..."
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "We could not send your message right now.");
      }

      // Save visitor details in cookies for 1 year
      const setCookie = (name, value, days = 365) => {
        const expires = new Date(Date.now() + days * 86400000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
      };
      
      setCookie('visitor_name', formData.name);
      setCookie('visitor_email', formData.email);
      if (formData.phone) {
        setCookie('visitor_phone', formData.phone);
      }

      setSubmitState({
        status: "success",
        message: data?.message || "Your message has been sent successfully."
      });
      setFormData(INITIAL_FORM);
      triggerConfetti();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error?.message || "We could not send your message right now."
      });
    }
  };

  const { globalContent, updateContent } = useCMS() || {};
  const content = globalContent?.contactUs || DEFAULT_GLOBAL_CONTENT.contactUs;
  const setContent = (key, val) => updateContent?.("contactUs", key, val);

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
              <div className="breadcrumb"><a href="/">Home</a><span>{">"}</span><span>Contact Us</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="contact-grid">
              <div className="contact-form fade-left" id="message-form">
                <EditableText
                  tagName="h2"
                  value={content.formTitle}
                  onChange={(v) => setContent("formTitle", v)}
                />
                {composeMode ? (
                  <div className="rounded-2xl border border-[#7BA4D0]/30 bg-[#E7F0FA]/8 px-4 py-3 text-sm leading-7 text-[#DCE8F6]" style={{ marginBottom: 18 }}>
                    The SSR assistant opened this form for you. Share your details here and our team will follow up directly.
                  </div>
                ) : null}

                {submitState.message ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                      submitState.status === "success"
                        ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : submitState.status === "error"
                          ? "border border-rose-400/40 bg-rose-500/10 text-rose-200"
                          : "border border-[#7BA4D0]/30 bg-[#E7F0FA]/8 text-[#DCE8F6]"
                    }`}
                    style={{ marginBottom: 18 }}
                  >
                    {submitState.message}
                  </div>
                ) : null}

                <form className="contact-form-el" noValidate onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Your Name *</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+91 000 000 0000"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Subject *</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      placeholder="How can we help you?"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      placeholder="Write your message here..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn-primary" disabled={submitState.status === "submitting"}>
                    {submitState.status === "submitting" ? "Sending..." : "Send Message ->"}
                  </button>
                </form>
              </div>

              <div className="contact-info-section fade-right">
                <EditableText
                  tagName="h2"
                  value={content.officesTitle}
                  onChange={(v) => setContent("officesTitle", v)}
                />

                <div className="map-box">
                  <div className="map-icon">Office</div>
                  <div>
                    <strong style={{ color: "var(--white)", display: "block", marginBottom: 4 }}>
                      <EditableText
                        tagName="span"
                        value={content.companyName}
                        onChange={(v) => setContent("companyName", v)}
                      />
                    </strong>
                    <span style={{ fontSize: "0.8rem" }}>
                      <EditableText
                        tagName="span"
                        value={content.companyLocations}
                        onChange={(v) => setContent("companyLocations", v)}
                      />
                    </span>
                  </div>
                </div>

                <div className="contact-info-block">
                  <div className="cib-icon">Call</div>
                  <div className="cib-text">
                    <h4>
                      <EditableText
                        tagName="span"
                        value={content.infoPhoneTitle}
                        onChange={(v) => setContent("infoPhoneTitle", v)}
                      />
                    </h4>
                    <p>
                      <EditableText
                        tagName="span"
                        value={content.infoPhone}
                        onChange={(v) => setContent("infoPhone", v)}
                      />
                    </p>
                  </div>
                </div>

                <div className="contact-info-block">
                  <div className="cib-icon">Call</div>
                  <div className="cib-text">
                    <h4>
                      <EditableText
                        tagName="span"
                        value={content.salesPhoneTitle}
                        onChange={(v) => setContent("salesPhoneTitle", v)}
                      />
                    </h4>
                    <p>
                      <EditableText
                        tagName="span"
                        value={content.salesPhone}
                        onChange={(v) => setContent("salesPhone", v)}
                      />
                    </p>
                  </div>
                </div>

                <div className="contact-info-block">
                  <div className="cib-icon">Mail</div>
                  <div className="cib-text">
                    <h4>
                      <EditableText
                        tagName="span"
                        value={content.emailTitle}
                        onChange={(v) => setContent("emailTitle", v)}
                      />
                    </h4>
                    <p>
                      <EditableText
                        tagName="span"
                        value={content.email}
                        onChange={(v) => setContent("email", v)}
                      />
                    </p>
                  </div>
                </div>

                <div className="contact-info-block" style={{ flexDirection: "column", gap: 16, alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">Map</div>
                    <div className="cib-text">
                      <h4>
                        <EditableText
                          tagName="span"
                          value={content.vizagTitle}
                          onChange={(v) => setContent("vizagTitle", v)}
                        />
                      </h4>
                      <p>
                        <EditableText
                          tagName="span"
                          value={content.vizagAddress}
                          onChange={(v) => setContent("vizagAddress", v)}
                        />
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">Map</div>
                    <div className="cib-text">
                      <h4>
                        <EditableText
                          tagName="span"
                          value={content.hydTitle}
                          onChange={(v) => setContent("hydTitle", v)}
                        />
                      </h4>
                      <p>
                        <EditableText
                          tagName="span"
                          value={content.hydAddress}
                          onChange={(v) => setContent("hydAddress", v)}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ContactPageFallback() {
  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Get In Touch</span>
              <h1>Contact Us</h1>
              <div className="breadcrumb"><a href="/">Home</a><span>{">"}</span><span>Contact Us</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="contact-grid">
              <div className="contact-form fade-left" id="message-form">
                <h2>Send Us a Message</h2>
                <div
                  className="rounded-2xl border border-[#7BA4D0]/30 bg-[#E7F0FA]/8 px-4 py-3 text-sm leading-7 text-[#DCE8F6]"
                  style={{ marginBottom: 18 }}
                >
                  Loading the contact form...
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageFallback />}>
      <ContactPageContent />
    </Suspense>
  );
}
