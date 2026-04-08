"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function AboutPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Company</span>
              <h1>About Us</h1>
              <div className="breadcrumb">
                <a href="/">Home</a>
                <span>›</span>
                <span>About Us</span>
              </div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <h1>About SSR Business Solutions</h1>
                <p>SSR BUSINESS SOLUTIONS is a premier organization, founded in 2020 by Consultants who have been working for long time in various IT sectors. In order to Visualize their thoughts in providing different IT services in terms of Training, Staffing and Development they started SSR Business Solutions — a growing IT Training &amp; Service Provider.</p>
                <p>Over the years our services have been expanded to include Software development and IT consultancy Services. Currently we operate as four strategic business units focusing on: IT Training &amp; Placements, IT Staffing, and IT Development.</p>

                <div className="highlight-block">
                  <h2>Our Core Focus Areas</h2>
                  <ul>
                    <li>IT Training &amp; Placements</li>
                    <li>IT Staffing</li>
                    <li>IT Development</li>
                  </ul>
                </div>

                <p>Our technological expertise, high quality standards, creativity and efficiency are combined in our services to deliver maximum value to our customers. Our software technology expertise covers all available platforms and numerous cutting-edge technologies which are trending worldwide.</p>

                <div className="feature-grid" style={{ marginTop: 30 }}>
                  <div className="feature-item"><strong>🏛 Founded 2020</strong><span>Built by experienced IT consultants with a vision to transform careers.</span></div>
                  <div className="feature-item"><strong>✅ SAP Authorized</strong><span>Officially authorized SAP Training Center with certified curriculum.</span></div>
                  <div className="feature-item"><strong>🌐 Multi-Mode</strong><span>Online, Classroom, and Corporate training options.</span></div>
                  <div className="feature-item"><strong>📈 500+ Students</strong><span>Successfully trained and placed across the IT industry.</span></div>
                </div>
              </div>

              <aside className="fade-right">
                <div className="sidebar-card">
                  <h3>Our Services</h3>
                  <ul className="sidebar-links">
                    <li><a href="/training">Training</a></li>
                    <li><a href="/placements">Staffing &amp; Solutions</a></li>
                    <li><a href="/development">Development</a></li>
                  </ul>
                </div>
                <div className="sidebar-card">
                  <h3>Contact Info</h3>
                  <div className="contact-info-card">
                    <p><span className="icon">📍</span>Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Visakhapatnam-530016</p>
                    <p><span className="icon">📞</span>+91 7013749901</p>
                    <p><span className="icon">📞</span>+91 9010062578</p>
                    <p><span className="icon">✉️</span>info@ssrbusinesssolutions.com</p>
                  </div>
                </div>
                <div className="sidebar-cta">
                  <h3>Get Started</h3>
                  <p>Ready to transform your IT career with SSR?</p>
                  <a href="/contact-us">Contact Us Today</a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
