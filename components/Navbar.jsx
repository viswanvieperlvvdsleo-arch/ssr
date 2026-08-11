'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useCMS } from './CMSContext';

export default function Navbar() {
  const { isEditMode } = useCMS();
  const navRef = useRef(null);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      if (window.scrollY > 30) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDropdown = (key) => (e) => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      e.preventDefault();
      setOpenDropdown((prev) => (prev === key ? null : key));
    }
  };

  const closeMenu = () => setMenuOpen(false);

  const isModulePage = pathname.startsWith('/services/') && pathname !== '/services';

  return (
    <nav className={`navbar ${isModulePage ? 'max-md:hidden' : ''}`} ref={navRef}>
      <div className="container">
        <div className="nav-inner">
          <Link href="/" className="nav-logo flex items-center gap-3" onClick={closeMenu}>
            <img src="/ssrlogo.jpeg" alt="SSR Logo" className="h-10 sm:h-12 w-auto object-contain rounded shadow-sm bg-white p-1" />
            <div className="logo-text-block">
              <span>SSR Business Solutions</span>
              <span className="hidden sm:block">SAP Authorized Training Center | Placements</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 md:hidden">
            {/* MOBILE THEME TOGGLE */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.32a1 1 0 011.415 0l.708.707a1 1 0 01-1.414 1.415l-.708-.708a1 1 0 010-1.414zM16 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-2.121 4.243a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.243-2.121a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM4 10a1 1 0 01-1 1H2a1 1 0 010-2h1a1 1 0 011 1zm2.121-4.243a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 6a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <button
              className="nav-toggle"
              aria-label="menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span style={{ transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }}></span>
              <span style={{ opacity: menuOpen ? 0 : 1 }}></span>
              <span style={{ transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }}></span>
            </button>
          </div>

          <ul className={`nav-menu ${menuOpen ? "open" : ""}`}>
            <li>
              <Link href="/" className={pathname === "/" ? "active" : ""} onClick={closeMenu}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/showcase" className={pathname === "/showcase" ? "active" : ""} onClick={closeMenu}>
                Showcase
              </Link>
            </li>

            <li>
              <Link
                href="/about-us"
                className={pathname === "/about-us" ? "active" : ""}
                onClick={closeMenu}
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/why-us"
                className={pathname === "/why-us" ? "active" : ""}
                onClick={closeMenu}
              >
                Why Us?
              </Link>
            </li>

            <li>
              <Link
                href="/services"
                className={pathname.startsWith("/services") ? "active" : ""}
                onClick={closeMenu}
              >
                Services
              </Link>
            </li>
            {isEditMode && (
              <li>
                <Link
                  href="/admin/enquiries"
                  className={`text-emerald-400 font-bold ${pathname === "/admin/enquiries" ? "active" : ""}`}
                  onClick={closeMenu}
                >
                  📬 Inbox / Leads
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/contact-us"
                className={pathname === "/contact-us" ? "active" : ""}
                onClick={closeMenu}
              >
                Contact Us
              </Link>
            </li>

            {/* THEME TOGGLE BUTTON */}
            <li className="hidden md:block">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ml-2"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.32a1 1 0 011.415 0l.708.707a1 1 0 01-1.414 1.415l-.708-.708a1 1 0 010-1.414zM16 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-2.121 4.243a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.243-2.121a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM4 10a1 1 0 01-1 1H2a1 1 0 010-2h1a1 1 0 011 1zm2.121-4.243a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 6a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </li>

          </ul>
        </div>
      </div>
    </nav>
  );
}

