'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";

export default function Navbar() {
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

  return (
    <nav className="navbar" ref={navRef}>
      <div className="container">
        <div className="nav-inner">
          <Link href="/" className="nav-logo flex items-center gap-3" onClick={closeMenu}>
            <img src="/ssrlogo.jpeg" alt="SSR Logo" className="h-10 sm:h-12 w-auto object-contain rounded shadow-sm bg-white p-1" />
            <div className="logo-text-block">
              <span>SSR Business Solutions</span>
              <span>SAP Authorized Training Center | Placements</span>
            </div>
          </Link>

          <button
            className="nav-toggle"
            aria-label="menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

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

            <li
              className={`has-dropdown ${openDropdown === "services" ? "open" : ""}`}
            >
              <Link href="#" onClick={toggleDropdown("services")}>
                Services
              </Link>
              <ul className="dropdown-menu">
                <li>
                  <Link
                    href="/training"
                    className={pathname === "/training" ? "active" : ""}
                    onClick={closeMenu}
                  >
                    Training
                  </Link>
                </li>
                <li>
                  <Link
                    href="/placements"
                    className={pathname === "/placements" ? "active" : ""}
                    onClick={closeMenu}
                  >
                    Staffing &amp; Solutions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/development"
                    className={pathname === "/development" ? "active" : ""}
                    onClick={closeMenu}
                  >
                    Development
                  </Link>
                </li>
              </ul>
            </li>


            <li>
              <Link
                href="/contact-us"
                className={pathname === "/contact-us" ? "active" : ""}
                onClick={closeMenu}
              >
                Contact Us
              </Link>
            </li>

          </ul>
        </div>
      </div>
    </nav>
  );
}

