"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function PlacementsPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Services</span>
              <h1>Staffing &amp; Solutions</h1>
              <div className="breadcrumb"><a href="/">Home</a><span>›</span><span>Services</span><span>›</span><span>Staffing &amp; Solutions</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <h1>IT Staffing &amp; Solutions</h1>
                <p>SSR Business Solutions helps organizations in providing IT staffing services at various levels that best fit into the client's requirements. Our Strategic IT Staffing services will reduce liabilities, decrease development time, increase profits and allow an organization to expand its capabilities without limits.</p>
                <p>Our Staffing services have proven expertise, innovation, flexibility and access to a huge database of IT professionals across various Technologies and Business domains to meet an organization's Temporary/Permanent staffing needs.</p>
                <p>Our knowledgeable and experienced Techno-HR recruitment team evaluates all candidates through our well identified processes to ensure an appropriate match between employee and employer. SSR's objective is not just to provide a resource, but also provide ongoing monitoring of their performance ensuring adherence to quality standards, on-time delivery and measurable results.</p>

                <h2>Our 3 Staffing Models</h2>
                <div className="model-card">
                  <h3>01 — Permanent Hire Service</h3>
                  <p>For companies looking to expand their core IT staff without incurring costs or risk of recruitment process, SSR Business Solutions Permanent Hire staffing model is the made-to-order solution. Our service takes care of the entire recruitment and assessment process and provides shortlisted resources for permanent hiring by the company.</p>
                </div>
                <div className="model-card" style={{ borderTopColor: "#004d80" }}>
                  <h3>02 — Contract to Hire Service</h3>
                  <p>A safe alternative to permanent hiring, our Contract to Hire model allows clients to reduce costs to hire and check attrition rates. Suitable for a few weeks or months to cover vacation replacements, temporary shortages or project-based tasks. The selected resources will be on SSR Business Solutions' Payroll and will serve the client on a contract basis.</p>
                </div>
                <div className="model-card" style={{ borderTopColor: "#003366" }}>
                  <h3>03 — Campus Recruitment Service</h3>
                  <p>SSR has well established relationships with major colleges all around. This service takes care of all campus recruitment processes — from assessment of the students to training of the recruited students — providing organizations with ready-to-deploy resources, reducing overheads significantly.</p>
                </div>
              </div>

              <aside className="fade-right">
                <div className="sidebar-card"><h3>Our Services</h3><ul className="sidebar-links"><li><a href="/training">Training</a></li><li><a href="/placements">Staffing &amp; Solutions</a></li><li><a href="/development">Development</a></li></ul></div>
                <div className="sidebar-cta"><h3>Hire with SSR</h3><p>Looking for quality IT talent? Contact us today!</p><a href="/contact-us">Get In Touch</a></div>
                <div className="sidebar-card"><h3>Contact Info</h3><div className="contact-info-card"><p><span className="icon">📞</span>+91 7013749901</p><p><span className="icon">📞</span>+91 90100 62578</p><p><span className="icon">✉️</span>sales@ssrbusinesssolutions.com</p></div></div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
