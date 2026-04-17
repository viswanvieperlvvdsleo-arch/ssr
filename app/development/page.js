"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";

export default function DevelopmentPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <span className="section-tag">Services</span>
              <h1>Development</h1>
              <div className="breadcrumb"><a href="/">Home</a><span>›</span><span>Services</span><span>›</span><span>Development</span></div>
            </div>
          </div>
        </div>

        <section className="inner-content">
          <div className="container">
            <div className="content-grid">
              <div className="main-content fade-left">
                <h1>Software Development Services</h1>
                <p>Every Project Development has to manage four basic constraints: scope, schedule, budget and quality. The success of a project depends on the skills and knowledge of a project manager to take into consideration these constraints and develop the plans and processes to keep them in balance.</p>
                <p>SSR Business Solutions made Simple Steps to Start any Project — an approach to project formulation that involves various stages in the order of importance: project idea, reasons for going in for a new project, need/demand for the project, project technology, project inputs, project location, project cost, project economics, and time frame in terms of Implementation, Support and Enhancement.</p>
                <p>SSR Business Solutions helps to develop a project plan by understanding the scope and value of your project, conducting extensive research, asking the tough questions, creating your project plan outline, talking with your team, writing your full project plan, executing your plan in a team, and finally publishing your plan.</p>

                <h2>SSR's Effective Project Design Framework</h2>
                <div className="step-item"><div className="step-num">1</div><div><strong>Define Project Goal</strong><p>Clearly articulate the primary objective and expected outcome of the project.</p></div></div>
                <div className="step-item"><div className="step-num">2</div><div><strong>Determine Outcomes, Objectives or Deliverables</strong><p>Define measurable outputs and milestones for the project lifecycle.</p></div></div>
                <div className="step-item"><div className="step-num">3</div><div><strong>Identify Risks, Constraints, and Assumptions</strong><p>Proactively map potential obstacles and establish mitigation strategies.</p></div></div>
                <div className="step-item"><div className="step-num">4</div><div><strong>Prepare a Visual Aid</strong><p>Create diagrams, flowcharts, and visual roadmaps for clear communication.</p></div></div>
                <div className="step-item"><div className="step-num">5</div><div><strong>Ballpark Your Budget</strong><p>Develop realistic cost estimates aligned with scope and quality expectations.</p></div></div>
                <div className="step-item"><div className="step-num">6</div><div><strong>Determine Approval and Monitoring Processes</strong><p>Establish governance, review cycles and success tracking mechanisms.</p></div></div>
                <div className="step-item" style={{ borderBottom: "none" }}><div className="step-num">7</div><div><strong>Use Proper Project Design Documents</strong><p>Maintain thorough documentation throughout all project phases.</p></div></div>
              </div>

              <aside className="fade-right">
                <div className="sidebar-card"><h3>Our Services</h3><ul className="sidebar-links"><li><a href="/training">Training</a></li><li><a href="/placements">Staffing &amp; Solutions</a></li><li><a href="/development">Development</a></li></ul></div>
                <div className="sidebar-cta"><h3>Start a Project</h3><p>Let's build something great together. Get in touch today!</p><a href="/contact-us">Contact Us</a></div>
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
