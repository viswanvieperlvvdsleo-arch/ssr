"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function WhyUsPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Our Advantage</span>
              <h1>Why Us?</h1>
              <div className="breadcrumb"><a href="/">Home</a><span>›</span><span>Why Us?</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <h1>Why Choose SSR Business Solutions?</h1>
                <p>Above all, we believe that real change is possible and that tomorrow doesn't have to be like today. Being Real Time Working Consultants, SSR Business Solutions knows the success formula that helps a normal person become a Software Professional.</p>
                <p>Having been emerged in the IT industry for a long time, we've been associated with working on different modules on SAP. Hence, we came up with a principal to take this to the next level with a few strategies.</p>
                <p>SSR Business Solutions provides Real Time Training and Certification Trainings with Online mode, Class Room Mode Trainings, Corporate Trainings for MNCs and Online Server Access 24/7. Empowering software careers with the "Skills of Success" by training on the industry's latest software technologies through our innovative programs.</p>

                <h2>Our Project Experience</h2>
                <ul>
                  <li>Development (EE4.7) (ECC6.0/Ehp 5/Ehp 6/Ehp 7/Ehp 7.5) (S4 HANA 1709/1809/1909)</li>
                  <li>Support</li>
                  <li>Migration (Oracle to HANA) (MYSQL to HANA) (SYBASE to HANA)</li>
                  <li>Enhancement</li>
                  <li>Roll Out or Upgradation</li>
                </ul>

                <h2>Key Advantages</h2>
                <div className="feature-grid">
                  <div className="feature-item"><strong>✓ SAP Authorized Center</strong><span>Officially authorized with certified trainers and curriculum.</span></div>
                  <div className="feature-item"><strong>✓ Real-Time Trainers</strong><span>Active IT professionals with hands-on field experience.</span></div>
                  <div className="feature-item"><strong>✓ 24/7 Server Access</strong><span>Practice round-the-clock with our always-on server infrastructure.</span></div>
                  <div className="feature-item"><strong>✓ Placement Assistance</strong><span>Dedicated placement cell guiding every student to the right job.</span></div>
                  <div className="feature-item"><strong>✓ Multiple Modes</strong><span>Online, Classroom, and Corporate training options available.</span></div>
                  <div className="feature-item"><strong>✓ Soft Skills Sessions</strong><span>Personality development and communication skills included free.</span></div>
                </div>
              </div>

              <aside className="fade-right">
                <div className="sidebar-card"><h3>Our Services</h3><ul className="sidebar-links"><li><a href="/training">Training</a></li><li><a href="/placements">Staffing &amp; Solutions</a></li><li><a href="/development">Development</a></li></ul></div>
                <div className="sidebar-card"><h3>Contact Info</h3><div className="contact-info-card"><p><span className="icon">📍</span>Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Visakhapatnam-530016</p><p><span className="icon">📞</span>+91 7013749901</p><p><span className="icon">📞</span>+91 9010062578</p></div></div>
                <div className="sidebar-cta"><h3>Join SSR</h3><p>Take the next step in your IT career today!</p><a href="/contact-us">Get In Touch</a></div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
