'use client';

import Link from "next/link";
import { useCMS, DEFAULT_GLOBAL_CONTENT } from "./CMSContext";
import EditableText from "./EditableText";

export default function Footer() {
  const { globalContent, updateContent, isEditMode } = useCMS() || {};
  const content = globalContent?.footer || DEFAULT_GLOBAL_CONTENT.footer;
  const setContent = (key, val) => updateContent?.('footer', key, val);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="f-logo">
              <img src="/ssrlogo.jpeg" alt="SSR Logo" className="h-10 sm:h-12 w-auto object-contain rounded shadow-sm bg-white p-1" />
              <div className="logo-text-block">
                <span>SSR Business Solutions</span>
                <span>SAP Authorized Training Center | Placements</span>
              </div>
            </div>
            <EditableText tagName="h4" value={content.addressTitle} onChange={(v) => setContent('addressTitle', v)} />
            <ul className="footer-contact-list">
              <li>
                <span className="f-icon">-&gt;</span>
                <EditableText tagName="span" value={content.address} onChange={(v) => setContent('address', v)} />
              </li>
              <li>
                <span className="f-icon">-&gt;</span>
                <EditableText tagName="span" value={content.phone} onChange={(v) => setContent('phone', v)} />
              </li>
              <li>
                <span className="f-icon">-&gt;</span>
                <EditableText tagName="span" value={content.email} onChange={(v) => setContent('email', v)} />
              </li>
            </ul>
          </div>
          <div>
            <EditableText tagName="h4" value={content.col2Title} onChange={(v) => setContent('col2Title', v)} />
            <ul className="footer-nav">
              <li>
                <Link href="/about-us">About Us</Link>
              </li>
              <li>
                <Link href="/why-us">Why Us</Link>
              </li>
              <li>
                <Link href="/contact-us">Contact Us</Link>
              </li>
            </ul>
          </div>
          <div>
            <EditableText tagName="h4" value={content.col3Title} onChange={(v) => setContent('col3Title', v)} />
            <ul className="footer-nav">
              <li>
                <Link href="/training">Training</Link>
              </li>
              <li>
                <Link href="/placements">Staffing &amp; Solutions</Link>
              </li>
              <li>
                <Link href="/development">Development</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <EditableText tagName="p" value={content.copyright} onChange={(v) => setContent('copyright', v)} />
      </div>
    </footer>
  );
}

