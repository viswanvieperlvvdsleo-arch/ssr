'use client';

import Link from "next/link";

export default function Footer() {
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
            <h4>Contact Address</h4>
            <ul className="footer-contact-list">
              <li>
                <span className="f-icon">-&gt;</span>Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Opp Pizza Hut, Visakhapatnam-530016
              </li>
              <li>
                <span className="f-icon">-&gt;</span>+91 7013749901 / +91 90100 62578
              </li>
              <li>
                <span className="f-icon">-&gt;</span>sales@ssrbusinesssolutions.com
              </li>
            </ul>
          </div>
          <div>
            <h4>The Company</h4>
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
            <h4>Services</h4>
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
        <p>Copyright &copy; 2023 SSR BUSINESS SOLUTIONS. All rights reserved.</p>
      </div>
    </footer>
  );
}

