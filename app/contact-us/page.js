"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function ContactPage() {
  useSharedEffects({ enableReveal: true, enableContactForm: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Get In Touch</span>
              <h1>Contact Us</h1>
              <div className="breadcrumb"><a href="/">Home</a><span>›</span><span>Contact Us</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="contact-grid">
              <div className="contact-form fade-left">
                <h2>Send Us a Message</h2>
                <form className="contact-form-el" noValidate>
                  <div className="form-group"><label htmlFor="name">Your Name *</label><input type="text" id="name" placeholder="Enter your full name" required /></div>
                  <div className="form-group"><label htmlFor="email">Email Address *</label><input type="email" id="email" placeholder="Enter your email" required /></div>
                  <div className="form-group"><label htmlFor="phone">Phone Number</label><input type="tel" id="phone" placeholder="+91 000 000 0000" /></div>
                  <div className="form-group"><label htmlFor="subject">Subject *</label><input type="text" id="subject" placeholder="How can we help you?" required /></div>
                  <div className="form-group"><label htmlFor="message">Message *</label><textarea id="message" placeholder="Write your message here..." required></textarea></div>
                  <button type="submit" className="btn-primary">Send Message →</button>
                </form>
              </div>

              <div className="contact-info-section fade-right">
                <h2>Our Offices</h2>

                <div className="map-box">
                  <div className="map-icon">📍</div>
                  <div>
                    <strong style={{ color: "var(--white)", display: "block", marginBottom: 4 }}>SSR Business Solutions</strong>
                    <span style={{ fontSize: "0.8rem" }}>Visakhapatnam &amp; Hyderabad</span>
                  </div>
                </div>

                <div className="contact-info-block"><div className="cib-icon">📞</div><div className="cib-text"><h4>Office &amp; Info</h4><p>+91 7013749901</p></div></div>
                <div className="contact-info-block"><div className="cib-icon">📞</div><div className="cib-text"><h4>Sales &amp; Operations</h4><p>+91 9010062578</p></div></div>
                <div className="contact-info-block"><div className="cib-icon">✉️</div><div className="cib-text"><h4>Email</h4><p>info@ssrbusinesssolutions.com</p></div></div>
                <div className="contact-info-block" style={{ flexDirection: "column", gap: 16, alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">📍</div>
                    <div className="cib-text"><h4>Head Office — Visakhapatnam</h4><p>Varanasi Majestic, Suit No.-B1, 4th Floor,<br />Dwaraka Nagar 2nd Lane, Opp Pizza Hut,<br />beside Ginger Hotel, Visakhapatnam-530016, Andhra Pradesh</p></div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="cib-icon">📍</div>
                    <div className="cib-text"><h4>Branch Office — Hyderabad</h4><p>Melkiors Pride, Dr no: 2-41/13/PMP/5F,<br />5th Floor, Izzat Nagar, Khanamet,<br />HITEX, Hyderabad-500084, Telangana</p></div>
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
