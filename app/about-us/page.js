"use client";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { useSharedEffects } from "../../hooks/useSharedEffects";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "../../components/CMSContext";
import EditableText from "../../components/EditableText";
import Sidebar from "../../components/Sidebar";

export default function AboutPage() {
  useSharedEffects({ enableReveal: true, enableSmoothAnchors: true });
  const { globalContent, updateContent } = useCMS() || {};
  const content = globalContent?.aboutUs || DEFAULT_GLOBAL_CONTENT.aboutUs;
  const setContent = (key, val) => updateContent?.('aboutUs', key, val);

  return (
    <>
      <Navbar />
      <main>
        <div className="page-banner">
          <div className="container">
            <div className="banner-content">
              <EditableText tagName="span" className="section-tag" value={content.bannerTag} onChange={(v) => setContent('bannerTag', v)} />
              <EditableText tagName="h1" value={content.bannerTitle} onChange={(v) => setContent('bannerTitle', v)} />
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
                <EditableText tagName="h1" value={content.title} onChange={(v) => setContent('title', v)} />
                <EditableText tagName="p" value={content.p1} onChange={(v) => setContent('p1', v)} />
                <EditableText tagName="p" value={content.p2} onChange={(v) => setContent('p2', v)} />

                <div className="highlight-block">
                  <EditableText tagName="h2" value={content.coreFocusTitle} onChange={(v) => setContent('coreFocusTitle', v)} />
                  <ul>
                    <li><EditableText tagName="span" value={content.focus1} onChange={(v) => setContent('focus1', v)} /></li>
                    <li><EditableText tagName="span" value={content.focus2} onChange={(v) => setContent('focus2', v)} /></li>
                    <li><EditableText tagName="span" value={content.focus3} onChange={(v) => setContent('focus3', v)} /></li>
                  </ul>
                </div>

                <EditableText tagName="p" value={content.p3} onChange={(v) => setContent('p3', v)} />

                <div className="feature-grid" style={{ marginTop: 30 }}>
                  <div className="feature-item">
                    <strong><EditableText tagName="span" value={content.f1Title} onChange={(v) => setContent('f1Title', v)} /></strong>
                    <EditableText tagName="span" value={content.f1Desc} onChange={(v) => setContent('f1Desc', v)} />
                  </div>
                  <div className="feature-item">
                    <strong><EditableText tagName="span" value={content.f2Title} onChange={(v) => setContent('f2Title', v)} /></strong>
                    <EditableText tagName="span" value={content.f2Desc} onChange={(v) => setContent('f2Desc', v)} />
                  </div>
                  <div className="feature-item">
                    <strong><EditableText tagName="span" value={content.f3Title} onChange={(v) => setContent('f3Title', v)} /></strong>
                    <EditableText tagName="span" value={content.f3Desc} onChange={(v) => setContent('f3Desc', v)} />
                  </div>
                  <div className="feature-item">
                    <strong><EditableText tagName="span" value={content.f4Title} onChange={(v) => setContent('f4Title', v)} /></strong>
                    <EditableText tagName="span" value={content.f4Desc} onChange={(v) => setContent('f4Desc', v)} />
                  </div>
                </div>
              </div>

              <Sidebar />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
