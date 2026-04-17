"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

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

      setSubmitState({
        status: "success",
        message: data?.message || "Your message has been sent successfully."
      });
      setFormData(INITIAL_FORM);
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error?.message || "We could not send your message right now."
      });
    }
  };

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
                <h2>Our Offices</h2>

                <div className="map-box">
                  <div className="map-icon">Office</div>
                  <div>
                    <strong style={{ color: "var(--white)", display: "block", marginBottom: 4 }}>SSR Business Solutions</strong>
                    <span style={{ fontSize: "0.8rem" }}>Visakhapatnam &amp; Hyderabad</span>
                  </div>
                </div>

                <div className="contact-info-block"><div className="cib-icon">Call</div><div className="cib-text"><h4>Office &amp; Info</h4><p>+91 7013749901</p></div></div>
                <div className="contact-info-block"><div className="cib-icon">Call</div><div className="cib-text"><h4>Sales &amp; Operations</h4><p>+91 90100 62578</p></div></div>
                <div className="contact-info-block"><div className="cib-icon">Mail</div><div className="cib-text"><h4>Email</h4><p>sales@ssrbusinesssolutions.com</p></div></div>
                <div className="contact-info-block" style={{ flexDirection: "column", gap: 16, alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">Map</div>
                    <div className="cib-text"><h4>Head Office - Visakhapatnam</h4><p>Varanasi Majestic, Suit No.-B1, 4th Floor,<br />Dwaraka Nagar 2nd Lane, Opp Pizza Hut,<br />beside Ginger Hotel, Visakhapatnam-530016, Andhra Pradesh</p></div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">Map</div>
                    <div className="cib-text"><h4>Branch Office - Hyderabad</h4><p>Melkiors Pride, Dr no: 2-41/13/PMP/5F,<br />5th Floor, Izzat Nagar, Khanamet,<br />HITEX, Hyderabad-500084, Telangana</p></div>
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
