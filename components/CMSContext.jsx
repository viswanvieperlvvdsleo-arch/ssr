"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CMSContext = createContext(null);

export const DEFAULT_GLOBAL_CONTENT = {
  home: {
    heroEyebrow: "SAP Authorized Training Center | Placements",
    heroTitle: "SSR Business Solutions",
    heroDesc: "Training, staffing, and end-to-end development — all run by real consultants on live systems. We build job-ready talent, place them with confidence, and ship production-grade software for enterprises.",
    metrics: [
      { value: "96%", label: "Placement success", note: "job-ready graduates" },
      { value: "500+", label: "Students trained", note: "SAP & IT tracks" },
      { value: "120+", label: "Projects delivered", note: "enterprise-grade builds" },
      { value: "4.8/5", label: "Avg client CSAT", note: "post‑delivery surveys" }
    ],
    itTag: "IT Training",
    itHeading: "Real-Time SAP Training by Industry Experts",
    itDesc: "Certified corporate trainers with live server access, placement assistance, and real-world project experience — everything you need to launch your IT career.",
    sdTag: "Software Development",
    sdHeading: "End-to-End Software Development Solutions",
    sdDesc: "From concept to deployment — we manage scope, schedule, budget and quality with proven project methodology, building scalable solutions across all modern platforms.",
    ssTag: "Staffing & Solutions",
    ssHeading: "Strategic IT Staffing Tailored to Your Needs",
    ssDesc: "Permanent hire, contract-to-hire, and campus recruitment — we connect the right talent with the right opportunity, every time.",
    servicesTag: "What We Do",
    servicesHeading: "Our Core Services",
    servicesSub: "Hover over a card to explore each service.",
    aboutTag: "Who We Are",
    aboutHeading: "About SSR Business Solutions",
    aboutHighlight: `"Above all, we believe that real change is possible and that tomorrow doesn't have to be like today."`,
    aboutP1: "SSR BUSINESS SOLUTIONS is a premier organization, founded in 2020 by Consultants who have been working for long time in various IT sectors. Our services span Training, Staffing and Development — with each unit focused on delivering maximum value.",
    aboutP2: "Our technological expertise, high-quality standards, creativity and efficiency are combined to deliver services that cover all available platforms and numerous cutting-edge technologies trending worldwide.",
    whyTag: "Our Advantage",
    whyHeading: "Why Choose SSR Business Solutions?",
    whyDesc: "Being Real Time Working Consultants, SSR Business Solutions knows the success formula. Having been in the IT industry for a long time and worked on different SAP modules, we've come up with strategies to take training to the next level.",
    whyPoints: [
      "SAP Authorized Training Center | Placements",
      "Real-Time / Corporate Trainers",
      "Online, Classroom & Corporate Modes",
      "24/7 Server Access for Students",
      "Placement Assistance for Every Student",
      "Personality Development & Soft Skills"
    ]
  },
  services: {
    tag: "What We Offer",
    title: "Our Training Services",
    sub: "SSR Business Solutions provides industry-led, certification-aligned SAP & IT training across all major modules and platforms. Choose a category to explore.",
    categories: [
      { id: "functional", label: "Functional Modules", icon: "⚙️", desc: "SAP business process modules — SD, MM, HCM, FI, FICO, PP, QM, PM, TRM", href: "/services/functional", color: "from-blue-600 to-cyan-500" },
      { id: "technical", label: "Technical Modules", icon: "💻", desc: "SAP development & technical tracks — ABAP, Basis, Security, BTP", href: "/services/technical", color: "from-purple-600 to-indigo-500" },
      { id: "techno-functional", label: "Techno-Functional", icon: "🔗", desc: "Hybrid expertise combining business process knowledge with technical skills", href: "/services/techno-functional", color: "from-emerald-600 to-teal-500" },
      { id: "servers", label: "Servers", icon: "🖥️", desc: "24/7 SAP server access for practice, project work, and certification prep", href: "/services/servers", color: "from-orange-500 to-red-500" }
    ],
    bottomText: "SSR Business Solutions — SAP Authorized Training Center | Placements. Real-time corporate trainers · 24/7 server access · Placement assistance for every student"
  },
  aboutUs: {
    bannerTag: "Company",
    bannerTitle: "About Us",
    title: "About SSR Business Solutions",
    p1: "SSR BUSINESS SOLUTIONS is a premier organization, founded in 2020 by Consultants who have been working for long time in various IT sectors. In order to Visualize their thoughts in providing different IT services in terms of Training, Staffing and Development they started SSR Business Solutions — a growing IT Training & Service Provider.",
    p2: "Over the years our services have been expanded to include Software development and IT consultancy Services. Currently we operate as four strategic business units focusing on: IT Training & Placements, IT Staffing, and IT Development.",
    coreFocusTitle: "Our Core Focus Areas",
    focus1: "IT Training & Placements",
    focus2: "IT Staffing",
    focus3: "IT Development",
    p3: "Our technological expertise, high quality standards, creativity and efficiency are combined in our services to deliver maximum value to our customers. Our software technology expertise covers all available platforms and numerous cutting-edge technologies which are trending worldwide.",
    f1Title: "🏛 Founded 2020", f1Desc: "Built by experienced IT consultants with a vision to transform careers.",
    f2Title: "✅ SAP Authorized", f2Desc: "Officially authorized SAP Training Center with certified curriculum.",
    f3Title: "🌐 Multi-Mode", f3Desc: "Online, Classroom, and Corporate training options.",
    f4Title: "📈 500+ Students", f4Desc: "Successfully trained and placed across the IT industry."
  },
  sidebar: {
    servicesTitle: "Our Services",
    services: [
      { id: "s1", label: "Training", href: "/services" },
      { id: "s2", label: "Staffing & Solutions", href: "/services" },
      { id: "s3", label: "Development", href: "/services" }
    ],
    contactTitle: "Contact Info",
    address: "Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Visakhapatnam-530016",
    phone: "+91 90100 62578",
    email: "sales@ssrbusinesssolutions.com",
    ctaTitle: "Get Started",
    ctaText: "Ready to transform your IT career with SSR?",
    ctaButtonText: "Contact Us Today"
  },
  whyUs: {
    bannerTag: "Our Advantage",
    bannerTitle: "Why Us?",
    title: "Why Choose SSR Business Solutions?",
    p1: "Above all, we believe that real change is possible and that tomorrow doesn't have to be like today. Being Real Time Working Consultants, SSR Business Solutions knows the success formula that helps a normal person become a Software Professional.",
    p2: "Having been emerged in the IT industry for a long time, we've been associated with working on different modules on SAP. Hence, we came up with a principal to take this to the next level with a few strategies.",
    p3: "SSR Business Solutions provides Real Time Training and Certification Trainings with Online mode, Class Room Mode Trainings, Corporate Trainings for MNCs and Online Server Access 24/7. Empowering software careers with the \"Skills of Success\" by training on the industry's latest software technologies through our innovative programs.",
    projectExpTitle: "Our Project Experience",
    projectExpPoints: [
      "Development (EE4.7) (ECC6.0/Ehp 5/Ehp 6/Ehp 7/Ehp 7.5) (S4 HANA 1709/1809/1909)",
      "Support",
      "Migration (Oracle to HANA) (MYSQL to HANA) (SYBASE to HANA)",
      "Enhancement",
      "Roll Out or Upgradation"
    ],
    advantagesTitle: "Key Advantages",
    advantages: [
      { id: "a1", title: "✓ SAP Authorized Center", desc: "Officially authorized with certified trainers and curriculum." },
      { id: "a2", title: "✓ Real-Time Trainers", desc: "Active IT professionals with hands-on field experience." },
      { id: "a3", title: "✓ 24/7 Server Access", desc: "Practice round-the-clock with our always-on server infrastructure." },
      { id: "a4", title: "✓ Placement Assistance", desc: "Dedicated placement cell guiding every student to the right job." },
      { id: "a5", title: "✓ Multiple Modes", desc: "Online, Classroom, and Corporate training options available." },
      { id: "a6", title: "✓ Soft Skills Sessions", desc: "Personality development and communication skills included free." }
    ]
  },
  contactUs: {
    bannerTag: "Get In Touch",
    bannerTitle: "Contact Us",
    formTitle: "Send Us a Message",
    officesTitle: "Our Offices",
    companyName: "SSR Business Solutions",
    companyLocations: "Visakhapatnam & Hyderabad",
    infoPhoneTitle: "Office & Info",
    infoPhone: "+91 90100 62578",
    salesPhoneTitle: "Sales & Operations",
    salesPhone: "+91 90100 62578",
    emailTitle: "Email",
    email: "sales@ssrbusinesssolutions.com",
    vizagTitle: "Head Office - Visakhapatnam",
    vizagAddress: "Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Opp Pizza Hut, beside Ginger Hotel, Visakhapatnam-530016, Andhra Pradesh",
    hydTitle: "Branch Office - Hyderabad",
    hydAddress: "Melkiors Pride, Dr no: 2-41/13/PMP/5F, 5th Floor, Izzat Nagar, Khanamet, HITEX, Hyderabad-500084, Telangana"
  },
  footer: {
    addressTitle: "Contact Address",
    address: "Varanasi Majestic, Suit No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Opp Pizza Hut, Visakhapatnam-530016",
    phone: "+91 90100 62578",
    email: "sales@ssrbusinesssolutions.com",
    col2Title: "The Company",
    col3Title: "Services",
    copyright: "Copyright © 2023 SSR BUSINESS SOLUTIONS. All rights reserved."
  },
  comboOffers: {
    sticker: {
      enabled: false,
      text: "TALLY + FICO + MS OFFICE",
      originalPrice: "₹45,000",
      discountPrice: "₹38,250",
      textStyle: { top: 64, left: 50, fontSize: 18, rotate: 0 },
      origPriceStyle: { bottom: 19, left: 50, fontSize: 14, rotate: -6 },
      discPriceStyle: { bottom: 7, left: 50, fontSize: 28, rotate: 0 },
      expiryDate: "", // e.g. '2024-12-31T23:59'
      timerStyle: { bottom: 2, left: 50, fontSize: 12, rotate: 0 }
    },
    catalogPrices: {
      fi: 15000, mm: 15000, hcm: 15000, pp: 15000, sd: 15000, fico: 18000,
      abap: 15000, basis: 15000, bw: 15000, hana: 20000, ui5: 18000, pi: 18000, btp: 22000, security: 15000,
      abap_hana: 25000, abap_ui5: 25000, bw_hana: 25000, basis_hana: 25000, abap_oo: 18000
    },
    moduleDiscounts: {}, // e.g. { fi: 20, mm: 10 } - overrides globalDiscount
    globalDiscount: 15,
    predefined: [
      {
        id: "combo_bsc",
        title: "BSc Student Combo",
        description: "Perfect for science graduates looking to enter the IT and finance sector.",
        originalPrice: 40000,
        discountedPrice: 32000,
        modules: ["Tally", "FICO", "MS Office"]
      },
      {
        id: "combo_eng",
        title: "Engineering Combo",
        description: "Ideal for B.Tech/BE graduates wanting a techno-functional career.",
        originalPrice: 45000,
        discountedPrice: 35000,
        modules: ["ABAP", "MM", "FICO"]
      }
    ]
  }
};

export function CMSProvider({ children }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lazy initializer — runs synchronously BEFORE first render, no race condition
  const [globalContent, setGlobalContent] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_GLOBAL_CONTENT;
    try {
      const savedContent = localStorage.getItem("ssr_global_content");
      if (savedContent) {
        const parsed = JSON.parse(savedContent);
        return {
          home: { ...DEFAULT_GLOBAL_CONTENT.home, ...(parsed.home || {}) },
          services: { ...DEFAULT_GLOBAL_CONTENT.services, ...(parsed.services || {}) },
          aboutUs: { ...DEFAULT_GLOBAL_CONTENT.aboutUs, ...(parsed.aboutUs || {}) },
          sidebar: { ...DEFAULT_GLOBAL_CONTENT.sidebar, ...(parsed.sidebar || {}) },
          whyUs: { ...DEFAULT_GLOBAL_CONTENT.whyUs, ...(parsed.whyUs || {}) },
          contactUs: { ...DEFAULT_GLOBAL_CONTENT.contactUs, ...(parsed.contactUs || {}) },
          footer: { ...DEFAULT_GLOBAL_CONTENT.footer, ...(parsed.footer || {}) },
          comboOffers: { ...DEFAULT_GLOBAL_CONTENT.comboOffers, ...(parsed.comboOffers || {}) }
        };
      }
    } catch (e) {
      console.error("Failed to parse global content", e);
    }
    return DEFAULT_GLOBAL_CONTENT;
  });

  // Fetch content from MongoDB on mount
  useEffect(() => {
    async function loadFromMongoDB() {
      try {
        const res = await fetch('/api/cms');
        const json = await res.json();
        if (json.success && json.data) {
          const dbData = json.data;
          setGlobalContent(prev => ({
            home: { ...prev.home, ...(dbData.home || {}) },
            services: { ...prev.services, ...(dbData.services || {}) },
            aboutUs: { ...prev.aboutUs, ...(dbData.aboutUs || {}) },
            sidebar: { ...prev.sidebar, ...(dbData.sidebar || {}) },
            whyUs: { ...prev.whyUs, ...(dbData.whyUs || {}) },
            contactUs: { ...prev.contactUs, ...(dbData.contactUs || {}) },
            footer: { ...prev.footer, ...(dbData.footer || {}) },
            comboOffers: { ...prev.comboOffers, ...(dbData.comboOffers || {}) }
          }));
        }
      } catch (e) {
        console.error('Failed to load CMS content from MongoDB:', e);
      }
    }
    loadFromMongoDB();
  }, []);

  // Load edit mode from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = sessionStorage.getItem("ssr_is_edit_mode");
      if (savedMode === "true") {
        setIsEditMode(true);
      }
    }
  }, []);

  const toggleEditMode = (mode) => {
    setIsEditMode(mode);
    if (typeof window !== "undefined") {
      if (mode) {
        sessionStorage.setItem("ssr_is_edit_mode", "true");
      } else {
        sessionStorage.removeItem("ssr_is_edit_mode");
      }
    }
  };

  const syncToMongoDB = async (data) => {
    try {
      await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
    } catch (e) {
      console.error('Failed to sync CMS to MongoDB:', e);
    }
  };

  const updateContent = (page, key, value) => {
    const newContent = { ...globalContent };
    if (!newContent[page]) newContent[page] = {};
    newContent[page][key] = value;
    setGlobalContent(newContent);
    // Save to localStorage & sync to MongoDB Atlas
    if (typeof window !== "undefined") {
      localStorage.setItem("ssr_global_content", JSON.stringify(newContent));
    }
    syncToMongoDB(newContent);
  };

  const triggerSave = async (saveCallback) => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    await syncToMongoDB(globalContent);
    
    if (saveCallback) {
      await saveCallback();
    }
    
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <CMSContext.Provider
      value={{
        isEditMode,
        toggleEditMode,
        isSaving,
        saveSuccess,
        triggerSave,
        globalContent,
        updateContent
      }}
    >
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const context = useContext(CMSContext);
  if (!context) {
    return {
      isEditMode: false,
      toggleEditMode: () => {},
      isSaving: false,
      saveSuccess: false,
      triggerSave: () => {},
      globalContent: DEFAULT_GLOBAL_CONTENT,
      updateContent: () => {}
    };
  }
  // Ensure globalContent is never undefined
  if (!context.globalContent) {
    context.globalContent = DEFAULT_GLOBAL_CONTENT;
  }
  return context;
}
