"use client";

import Link from "next/link";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useHomeEffects } from "../hooks/useHomeEffects";
import { useSharedEffects } from "../hooks/useSharedEffects";

export default function HomePage() {
  useSharedEffects({
    enableCounters: true,
    enableSpotlight: true,
    enableReveal: true,
    enableSmoothAnchors: true
  });
  useHomeEffects();

  const resultsMetrics = [
    { value: "96%", label: "Placement success", note: "job-ready graduates" },
    { value: "500+", label: "Students trained", note: "SAP & IT tracks" },
    { value: "120+", label: "Projects delivered", note: "enterprise-grade builds" },
    { value: "4.8/5", label: "Avg client CSAT", note: "post‑delivery surveys" }
  ];

  const clientLogos = [
    { name: "AWS", short: "AWS" },
    { name: "Capgemini", short: "CG" },
    { name: "Visakhapatnam Port Authority", short: "VPA" },
    { name: "PWC", short: "PWC" },
    { name: "3S Business Corporation", short: "3S" }
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="hero">
          <canvas id="hero-canvas"></canvas>
          <div className="hero-overlay"></div>
          <div className="container">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <div className="eyebrow-line"></div>
                <span className="eyebrow-text">SAP Authorized Training Center | Placements</span>
              </div>
              <h1 className="hero-title">
                SSR Business Solutions
              </h1>
              <p className="hero-desc">
                Training, staffing, and end-to-end development — all run by real consultants on live systems. We build
                job-ready talent, place them with confidence, and ship production-grade software for enterprises.
              </p>
              <div className="hero-btns">
                <Link href="/about-us" className="btn-primary">
                  Discover More →
                </Link>
                <Link href="/contact-us" className="btn-outline">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-scroll-indicator">
            <div className="scroll-mouse"></div>
            <span>Scroll</span>
          </div>
        </section>

        {/* RESULTS STRIP */}
        <section className="results-strip">
          <div className="container">
            <div className="results-grid">
              {resultsMetrics.map((item) => (
                <div className="metric-card" key={item.label}>
                  <div className="metric-value">{item.value}</div>
                  <div className="metric-label">{item.label}</div>
                  <div className="metric-note">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* IT TRAINING */}
        <section className="it-scroll-section" id="it-training">
          <div className="it-scroll-sticky">
            <canvas id="it-canvas"></canvas>
            <div className="it-overlay">
              <div className="it-content">
                <span className="section-tag it-tag">IT Training</span>
                <h2 className="it-heading">Real-Time SAP Training<br />by Industry Experts</h2>
                <p className="it-desc">Certified corporate trainers with live server access, placement assistance, and real-world project experience — everything you need to launch your IT career.</p>
                <div className="it-btns">
                  <Link href="/training" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="it-progress">
              <div className="it-progress-bar"></div>
            </div>
          </div>
        </section>

        {/* SOFTWARE DEVELOPER */}
        <section className="sd-scroll-section" id="software-development">
          <div className="sd-scroll-sticky">
            <canvas id="sd-canvas"></canvas>
            <div className="sd-overlay">
              <div className="sd-content">
                <span className="section-tag sd-tag">Software Development</span>
                <h2 className="sd-heading">End-to-End Software<br />Development Solutions</h2>
                <p className="sd-desc">From concept to deployment — we manage scope, schedule, budget and quality with proven project methodology, building scalable solutions across all modern platforms.</p>
                <div className="sd-btns">
                  <Link href="/development" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="sd-progress"><div className="sd-progress-bar"></div></div>
          </div>
        </section>

        {/* STAFFING & SOLUTIONS */}
        <section className="ss-scroll-section" id="staffing-solutions">
          <div className="ss-scroll-sticky">
            <canvas id="ss-canvas"></canvas>
            <div className="ss-overlay">
              <div className="ss-content">
                <span className="section-tag ss-tag">Staffing &amp; Solutions</span>
                <h2 className="ss-heading">Strategic IT Staffing<br />Tailored to Your Needs</h2>
                <p className="ss-desc">Permanent hire, contract-to-hire, and campus recruitment — we connect the right talent with the right opportunity, every time.</p>
                <div className="ss-btns">
                  <Link href="/placements" className="btn-primary">Discover More →</Link>
                  <Link href="/contact-us" className="btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
            <div className="ss-progress"><div className="ss-progress-bar"></div></div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="services-section" id="services">
          <div className="container">
            <div style={{ textAlign: "center" }} className="fade-up">
              <span className="section-tag">What We Do</span>
              <h2 className="section-heading">Our Core Services</h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>Hover over a card to explore each service.</p>
            </div>
            <div className="services-grid">
              <div className="service-card fade-up" data-delay="0">
                <div className="card-accent"></div>
                <div className="card-icon">🎓</div>
                <h3>Training</h3>
                <p>Real-time SAP training with certified corporate trainers, placement assistance, and 24/7 server access for every enrolled student.</p>
                <Link href="/training" className="card-link">Explore Training</Link>
              </div>

              <div className="service-card fade-up" data-delay="120">
                <div className="card-accent"></div>
                <div className="card-icon">👥</div>
                <h3>Staffing &amp; Solutions</h3>
                <p>Strategic IT staffing services — permanent hire, contract to hire, and campus recruitment tailored to your organization's needs.</p>
                <Link href="/placements" className="card-link">Explore Staffing</Link>
              </div>

              <div className="service-card fade-up" data-delay="240">
                <div className="card-accent"></div>
                <div className="card-icon">💻</div>
                <h3>Development</h3>
                <p>End-to-end software development managing scope, schedule, budget and quality with proven project management methodology.</p>
                <Link href="/development" className="card-link">Explore Development</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <div className="container">
            <div className="about-grid">
              <div className="about-text fade-left">
                <span className="section-tag">Who We Are</span>
                <h2>About SSR Business Solutions</h2>
                <p className="highlight-line">"Above all, we believe that real change is possible and that tomorrow doesn't have to be like today."</p>
                <p>SSR BUSINESS SOLUTIONS is a premier organization, founded in 2020 by Consultants who have been working for long time in various IT sectors. Our services span Training, Staffing and Development — with each unit focused on delivering maximum value.</p>
                <p>Our technological expertise, high-quality standards, creativity and efficiency are combined to deliver services that cover all available platforms and numerous cutting-edge technologies trending worldwide.</p>
                <div className="about-stats">
                  <div className="stat-box">
                    <span className="num stat-count" data-target="500" data-suffix="+">0</span>
                    <div className="label">Students Trained</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="100" data-suffix="+">0</span>
                    <div className="label">Placements</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="50" data-suffix="+">0</span>
                    <div className="label">Corporate Clients</div>
                  </div>
                  <div className="stat-box">
                    <span className="num stat-count" data-target="4" data-suffix="+">0</span>
                    <div className="label">Years of Excellence</div>
                  </div>
                </div>
                <Link href="/about-us" className="btn-primary" style={{ marginTop: 28 }}>Read More →</Link>
              </div>
              <div className="about-visual fade-right">
                <div className="parallax-layer layer-1" id="layer1">
                  <div style={{ fontSize: "6rem", position: "relative", zIndex: 1 }}>🏢</div>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(0,102,170,0.15), transparent 70%)" }}></div>
                </div>
                <div className="parallax-layer layer-2" id="layer2">
                  <h4>SAP Authorized<br />Training Center</h4>
                  <p>IT Training · Staffing · Development</p>
                  <div style={{ width: 40, height: 2, background: "var(--blue)", margin: "10px auto 0" }}></div>
                </div>
                <div className="parallax-layer layer-3" id="layer3">✦ Since 2020</div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section className="why-section" id="whyus">
          <div className="container">
            <div className="why-grid">
              <div className="fade-left">
                <div className="orbit-container">
                  <div className="orbit-ring orbit-ring-1">
                    <div className="orbit-item oi-1">🎓<div className="orbit-tooltip">SAP Certified</div></div>
                    <div className="orbit-item oi-2">🖥️<div className="orbit-tooltip">24/7 Server</div></div>
                    <div className="orbit-item oi-3">🌐<div className="orbit-tooltip">Online Mode</div></div>
                    <div className="orbit-item oi-4">🏆<div className="orbit-tooltip">Placement Help</div></div>
                  </div>
                  <div className="orbit-ring orbit-ring-2">
                    <div className="orbit-item oi-5">🔒<div className="orbit-tooltip">Real Trainers</div></div>
                    <div className="orbit-item oi-6">📊<div className="orbit-tooltip">Industry Experts</div></div>
                    <div className="orbit-item oi-7">🚀<div className="orbit-tooltip">Career Growth</div></div>
                    <div className="orbit-item oi-8">💡<div className="orbit-tooltip">Innovation</div></div>
                  </div>
                  <div className="orbit-center"><h4>Why Choose SSR?</h4></div>
                </div>
              </div>
              <div className="why-text fade-right">
                <span className="section-tag">Our Advantage</span>
                <h2>Why Choose SSR Business Solutions?</h2>
                <p>Being Real Time Working Consultants, SSR Business Solutions knows the success formula. Having been in the IT industry for a long time and worked on different SAP modules, we've come up with strategies to take training to the next level.</p>
                <ul className="why-list">
                  <li className="why-list-item"><div className="why-check">✓</div>SAP Authorized Training Center | Placements</li>
                  <li className="why-list-item"><div className="why-check">✓</div>Real-Time / Corporate Trainers</li>
                  <li className="why-list-item"><div className="why-check">✓</div>Online, Classroom &amp; Corporate Modes</li>
                  <li className="why-list-item"><div className="why-check">✓</div>24/7 Server Access for Students</li>
                  <li className="why-list-item"><div className="why-check">✓</div>Placement Assistance for Every Student</li>
                  <li className="why-list-item"><div className="why-check">✓</div>Personality Development &amp; Soft Skills</li>
                </ul>
                <Link href="/why-us" className="btn-outline" style={{ marginTop: 24 }}>Learn More</Link>
              </div>
            </div>
          </div>
        </section>


      </main>
      <Footer />
    </>
  );
}
