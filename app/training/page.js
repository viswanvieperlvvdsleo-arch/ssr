"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function TrainingPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Services</span>
              <h1>Training</h1>
              <div className="breadcrumb">
                <a href="/">Home</a><span>›</span><span>Services</span><span>›</span><span>Training</span>
              </div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <h1>Professional IT Training</h1>
                <p>SSR Business Solutions (SSRBS) Committed to build a long-lasting relationship with students, provides Placement assistance to all its students enrolled in the training programs. The vision behind the placement cell is to identify the student with the right skills and guide him to the right job, thus enabling a promising career.</p>
                <p>With our industry expertise, we understand that companies today require more than a skilled candidate; they reach for employees who are productive, exhibit a positive attitude and have the ability to become a member of their team. To meet this requirement, SSR conducts sessions on Personality Development and Communication skills as a value added service.</p>

                <div className="highlight-block">
                  <h2>Technologies: SAP Programmes</h2>
                  <p>Our training is focused on SAP technologies which are in high demand across industries globally. We provide comprehensive training across all major SAP modules and platforms.</p>
                </div>

                <h2>Real Time Trainers / Corporate Trainers</h2>
                <p>Our Success is founded on our highly qualified, professional team of Instructors who are working as Real Time Consultants. We have the best of IT professionals, most of whom are certified Professionals in various technologies with proven industrial experience.</p>
                <p>Our Courteous instructors with excellent presentation and communication skills, combined with technical expertise and real-world experience, are committed to deliver in-depth quality training. The rigorous training methodology includes both theoretical and practical lab sessions.</p>
                <p>In a tranquil atmosphere, our spacious computer labs are well equipped with all required infrastructure. Our Server connectivity is available 24/7 to provide the required technical assistance to the students.</p>

                <h2>Training Modes Available</h2>
                <div className="feature-grid">
                  <div className="feature-item"><strong>🎓 SAP Training</strong><span>Certified SAP modules delivered by expert real-time trainers.</span></div>
                  <div className="feature-item"><strong>🌐 Online Mode</strong><span>Flexible online classes accessible from anywhere at any time.</span></div>
                  <div className="feature-item"><strong>🖥️ Classroom Mode</strong><span>In-person training with computer labs and full infrastructure.</span></div>
                  <div className="feature-item"><strong>🏢 Corporate Training</strong><span>Customized training programs for MNCs and corporate teams.</span></div>
                  <div className="feature-item"><strong>⚡ 24/7 Server Access</strong><span>Round-the-clock server connectivity for practice and learning.</span></div>
                  <div className="feature-item"><strong>💬 Soft Skills</strong><span>Personality development and communication sessions included.</span></div>
                </div>
              </div>

              <aside className="fade-right">
                <div className="sidebar-card"><h3>Our Services</h3><ul className="sidebar-links"><li><a href="/training">Training</a></li><li><a href="/placements">Staffing &amp; Solutions</a></li><li><a href="/development">Development</a></li></ul></div>
                <div className="sidebar-cta"><h3>Enroll Now</h3><p>Start your SAP career journey with SSR Business Solutions today!</p><a href="/contact-us">Contact Us</a></div>
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
