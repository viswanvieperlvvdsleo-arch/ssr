"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '../hooks/useTheme';
import { useCMS } from './CMSContext';

function triggerConfetti() {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles = [];
  const colors = ['#2E5E99', '#7BA4D0', '#004d80', '#E7F0FA', '#1B4F7A'];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 50,
      y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 14 - 6,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8
    });
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    let alive = false;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // friction
      p.rotation += p.rotationSpeed;

      if (p.y < window.innerHeight + 20) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(update);
    } else {
      try {
        document.body.removeChild(canvas);
      } catch (e) {
        // ignore if already removed
      }
    }
  }

  update();
}

const PRIMARY_PHONE = '+91 9010062578';
const SECONDARY_PHONE = '+91 90100 62578';
const CONTACT_EMAIL = 'sales@ssrbusinesssolutions.com';
const PAGE_ACTIONS = [
  { href: '/', label: 'Home', aliases: ['home', 'home page', 'homepage', 'main page', 'landing page'] },
  { href: '/about-us', label: 'About Us', aliases: ['about us', 'about page', 'company page'] },
  { href: '/why-us', label: 'Why Us', aliases: ['why us', 'why us page', 'why page'] },
  { href: '/training', label: 'Training', aliases: ['training', 'training page', 'sap training'] },
  { href: '/placements', label: 'Staffing & Solutions', aliases: ['staffing', 'staffing page', 'staffing and solutions', 'staffing & solutions', 'placements', 'placements page', 'hire page'] },
  { href: '/development', label: 'Development', aliases: ['development', 'development page', 'software development', 'project page'] },
  { href: '/contact-us', label: 'Contact Us', aliases: ['contact', 'contact us', 'contact page', 'contact us page'] },
  { href: '/showcase', label: 'Showcase', aliases: ['showcase', 'showcase page', 'gallery', 'gallery page', 'images page'] },
  { href: '/#clients', label: 'Clients', aliases: ['client', 'clients', 'client page', 'clients page', 'clients section', 'client section'] },
  { href: '/#testimonials', label: 'Testimonials', aliases: ['testimonials', 'testimonial section', 'reviews section'] }
];

const PAGE_OPTIONS_DATA = {
  'home': {
    name: 'Home',
    path: '/',
    options: [
      { num: 1, label: 'Real-Time SAP Training', elementId: 'it-training', desc: 'The Real-Time SAP Training section highlights our certified corporate trainers, 24/7 server access, and placement support.' },
      { num: 2, label: 'End-to-End Software Development', elementId: 'software-development', desc: 'The End-to-End Software Development section explains our effective design processes managing scope, budget, and quality.' },
      { num: 3, label: 'IT Staffing', elementId: 'staffing-solutions', desc: 'The IT Staffing section details our models: Permanent Hire, Contract-to-Hire, and Campus Recruitment.' },
      { num: 4, label: 'Our Core Services', elementId: 'services', desc: 'Our Core Services section lists our three primary pillars: professional training, client staffing, and custom software builds.' },
      { num: 5, label: 'About SSR', elementId: 'about', desc: 'The About SSR section shares our metrics like 500+ students trained, 100+ placements, and our founding in 2020 by IT consultants.' },
      { num: 6, label: 'Our Advantages', elementId: 'whyus', desc: 'Our Advantages section showcases why clients choose us: real-time consultants, soft skills training, and 24/7 student servers.' }
    ],
    speech: 'There are lots of sections on our Home page: 1. Real-Time SAP Training, 2. End-to-End Software Development, 3. IT Staffing, 4. Our Core Services, 5. About SSR, and 6. Our Advantages. About what do you want to know?'
  },
  'about-us': {
    name: 'About Us',
    path: '/about-us',
    options: [
      { num: 1, label: 'About SSR Business Solutions', elementId: 'about-ssr', desc: 'SSR Business Solutions is a premier IT Training and Service provider founded in 2020 by industry consultants.' },
      { num: 2, label: 'Our Core Focus Areas', elementId: 'core-focus', desc: 'Our strategic business units focus on IT Training and Placements, IT Staffing, and IT Development.' },
      { num: 3, label: 'Founded Year and SAP Authorization', elementId: 'authorization', desc: 'We were founded in 2020, and we are an authorized SAP training center with online and classroom modes.' }
    ],
    speech: 'There are lots of sections on our About Us page: 1. About SSR Business Solutions, 2. Our Core Focus Areas, 3. Founded Year and SAP Authorization. About what do you want to know?'
  },
  'why-us': {
    name: 'Why Us',
    path: '/why-us',
    options: [
      { num: 1, label: 'Why Choose SSR Business Solutions?', elementId: 'whychoose', desc: 'Our advantages include trainers with over 10 years of experience and deep domain expertise.' },
      { num: 2, label: 'Our Project Experience', elementId: 'projectexp', desc: 'We have proven experience in SAP migrations, upgrades, support, and end-to-end development projects.' },
      { num: 3, label: 'Key Advantages', elementId: 'advantages', desc: 'Key advantages include certified SAP trainers, 24/7 server access, and soft skills training.' }
    ],
    speech: 'There are lots of sections on our Why Us page: 1. Why Choose SSR Business Solutions?, 2. Our Project Experience, 3. Key Advantages. About what do you want to know?'
  },
  'training': {
    name: 'Training',
    path: '/training',
    options: [
      { num: 1, label: 'Professional IT Training', elementId: 'pro-training', desc: 'We provide placement assistance, personality development, and soft-skills training as value-added services.' },
      { num: 2, label: 'SAP Programmes', elementId: 'sap-programmes', desc: 'We offer courses in SAP FICO, MM, SD, PP, ABAP, and HANA.' },
      { num: 3, label: 'Real Time Trainers', elementId: 'realtime-trainers', desc: 'Our instructors are working consultants with proof of industrial experience.' },
      { num: 4, label: 'Training Modes Available', elementId: 'training-modes', desc: 'We support Online, Classroom, and Corporate training modes.' }
    ],
    speech: 'There are lots of sections on our Training page: 1. Professional IT Training, 2. SAP Programmes, 3. Real Time Trainers, 4. Training Modes Available. About what do you want to know?'
  },
  'placements': {
    name: 'Staffing & Solutions',
    path: '/placements',
    options: [
      { num: 1, label: 'IT Staffing & Solutions', elementId: 'it-staffing', desc: 'Our staffing services include database resources across technologies to reduce development times.' },
      { num: 2, label: 'Permanent Hire Service', elementId: 'permanent-hire', desc: 'Permanent Hire model manages candidate search and screening for direct hiring.' },
      { num: 3, label: 'Contract to Hire Service', elementId: 'contract-hire', desc: 'Contract to Hire places resources on SSR payroll to serve clients on a contract basis.' },
      { num: 4, label: 'Campus Recruitment Service', elementId: 'campus-recruitment', desc: 'We manage freshman placement, campus interviews, and onboarding.' }
    ],
    speech: 'There are lots of sections on our Staffing page: 1. IT Staffing & Solutions, 2. Permanent Hire Service, 3. Contract to Hire Service, 4. Campus Recruitment Service. About what do you want to know?'
  },
  'development': {
    name: 'Development',
    path: '/development',
    options: [
      { num: 1, label: 'Software Development Services', elementId: 'software-dev', desc: 'We build applications managing constraints like scope, schedule, budget, and quality.' },
      { num: 2, label: 'Project Formulation', elementId: 'formulation', desc: 'We use simple steps to start projects, evaluating technology, inputs, cost, and timelines.' },
      { num: 3, label: 'Project Design Framework', elementId: 'design-framework', desc: 'Our design framework defines outcomes, monitors risks, and monitors budget controls.' }
    ],
    speech: 'There are lots of sections on our Development page: 1. Software Development Services, 2. Project Formulation, 3. Project Design Framework. About what do you want to know?'
  },
  'showcase': {
    name: 'Showcase',
    path: '/showcase',
    options: [
      { num: 1, label: 'Title Heading', elementId: 'title-heading', desc: 'Cinematic layout with a rotating multi-column gallery.' },
      { num: 2, label: 'Subtitles', elementId: 'subtitles', desc: 'Highlights our key focus areas of training and placement.' },
      { num: 3, label: 'Image Grid', elementId: 'image-grid', desc: 'Dynamic columns displaying SAP training, certification, and lab images.' }
    ],
    speech: 'There are lots of sections on our Showcase page: 1. Title Heading, 2. Subtitles, 3. Image Grid. About what do you want to know?'
  },
  'contact-us': {
    name: 'Contact Us',
    path: '/contact-us',
    options: [
      { num: 1, label: 'Visakhapatnam Office', elementId: 'vizag-office', desc: 'Our head office located in Dwaraka Nagar 2nd Lane, Visakhapatnam.' },
      { num: 2, label: 'Hyderabad Office', elementId: 'hyd-office', desc: 'Our Hyderabad branch office located in Melkiors Pride, HITEX, Izzat Nagar.' },
      { num: 3, label: 'Send Message Form', elementId: 'message-form', desc: 'The contact form where you can submit questions directly to our team.' }
    ],
    speech: 'There are lots of sections on our Contact Us page: 1. Visakhapatnam Office, 2. Hyderabad Office, 3. Send Message Form. About what do you want to know?'
  }
};

function resolvePageKey(text) {
  const lower = text.toLowerCase().trim();
  if (lower.includes('home') || lower.includes('landing') || lower.includes('main')) return 'home';
  if (lower.includes('about')) return 'about-us';
  if (lower.includes('why')) return 'why-us';
  if (lower.includes('training')) return 'training';
  if (lower.includes('placement') || lower.includes('staffing') || lower.includes('solution')) return 'placements';
  if (lower.includes('development') || lower.includes('software') || lower.includes('project')) return 'development';
  if (lower.includes('showcase') || lower.includes('gallery') || lower.includes('image')) return 'showcase';
  if (lower.includes('contact')) return 'contact-us';
  return null;
}

function resolveCurrentPageKey(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.includes('about')) return 'about-us';
  if (pathname.includes('why')) return 'why-us';
  if (pathname.includes('training')) return 'training';
  if (pathname.includes('placement')) return 'placements';
  if (pathname.includes('development')) return 'development';
  if (pathname.includes('showcase')) return 'showcase';
  if (pathname.includes('contact')) return 'contact-us';
  return 'home';
}

function parseOptionSelection(text, options) {
  const lower = text.toLowerCase().trim();
  
  if (/\b(1|one|first|first-one|firstone|frist|fristone|frist-one)\b/.test(lower)) return options.find(o => o.num === 1);
  if (/\b(2|two|second|second-one|secondone)\b/.test(lower)) return options.find(o => o.num === 2);
  if (/\b(3|three|third|third-one|thirdone)\b/.test(lower)) return options.find(o => o.num === 3);
  if (/\b(4|four|fourth|fourth-one|fourthone)\b/.test(lower)) return options.find(o => o.num === 4);
  if (/\b(5|five|fifth|fifth-one|fifthone)\b/.test(lower)) return options.find(o => o.num === 5);
  if (/\b(6|six|sixth|sixth-one|sixthone)\b/.test(lower)) return options.find(o => o.num === 6);

  const matched = options.find(o => {
    const labelLower = o.label.toLowerCase();
    const cleanedLabel = labelLower.replace(/[^\w\s]/g, '');
    return lower.includes(labelLower) || labelLower.includes(lower) || lower.includes(cleanedLabel) || cleanedLabel.includes(lower);
  });
  if (matched) return matched;

  return null;
}

function scrollToOption(selectedOption) {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(selectedOption.elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const labelLower = selectedOption.label.toLowerCase();
  const cleanedLabel = labelLower.replace(/[^\w\s]/g, '').trim();
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong, li, dt, th, p, span'));
  
  const found = headings.find(h => {
    const textLower = h.textContent.toLowerCase();
    const cleanedText = textLower.replace(/[^\w\s]/g, '');
    return textLower.includes(labelLower) || cleanedText.includes(cleanedLabel);
  });

  if (found) {
    found.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    if (scrollHeight > clientHeight) {
      const targetY = (selectedOption.num - 1) * (scrollHeight / 4);
      window.scrollTo({ top: Math.min(targetY, scrollHeight - clientHeight), behavior: 'smooth' });
    }
  }
}

function triggerMailLaunch(url) {
  if (typeof window === 'undefined') return;
  let iframe = document.getElementById('mail-helper-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'mail-helper-iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  iframe.src = url;
}

function normalizePhoneNumber(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function sanitizeHistoryForApi(history) {
  return history
    .map((entry) => ({
      role: entry?.role === 'model' ? 'model' : 'user',
      parts: (entry?.parts || [])
        .map((part) => ({ text: typeof part?.text === 'string' ? part.text : '' }))
        .filter((part) => part.text)
    }))
    .filter((entry) => entry.parts.length);
}

function detectPageAction(text) {
  const lower = text.toLowerCase().trim();
  const wantsNavigation = /(take me to|take to|go to|open|show me|show|navigate to|bring me to|move to|scroll to)/.test(lower);
  const matchedPage = PAGE_ACTIONS.find((page) =>
    page.aliases.some((alias) => lower === alias || lower.includes(alias))
  );

  if (!matchedPage) {
    return null;
  }

  const exactAliasOnly = matchedPage.aliases.some((alias) => lower === alias);
  if (!wantsNavigation && !exactAliasOnly) {
    return null;
  }

  return {
    kind: 'navigate',
    href: matchedPage.href,
    label: matchedPage.label,
    actionLabel: `Opening ${matchedPage.label}`,
    reply: `Sure - taking you to the ${matchedPage.label} page now.`
  };
}

function detectCallAction(text) {
  const lower = text.toLowerCase();
  if (!/(call|dial|phone|make a call|ring)/.test(lower)) {
    return null;
  }

  const wantsSecondary = /sales|operations|second|secondary/.test(lower);
  const phone = wantsSecondary ? SECONDARY_PHONE : PRIMARY_PHONE;
  const label = wantsSecondary ? 'Sales & Operations' : 'Office';

  return {
    kind: 'call',
    phone,
    label,
    actionLabel: `Calling ${label}`,
    reply: `Sure - opening your phone dialer for our ${label.toLowerCase()} line now.`
  };
}

function detectThemeAction(text) {
  const lower = text.toLowerCase();
  if (!/(theme|mode)/.test(lower) && !/(dark|light|blue)/.test(lower)) {
    return null;
  }

  if (/(light theme|light mode|salt and pepper|salt & pepper|switch to light|change to light|use light)/.test(lower)) {
    return {
      kind: 'theme',
      mode: 'light',
      label: 'Light Theme',
      actionLabel: 'Switching to Light Theme',
      reply: 'Sure - switching the website to the light theme now.'
    };
  }

  if (/(dark theme|dark mode|blue theme|switch to dark|change to dark|use dark|switch to blue)/.test(lower)) {
    return {
      kind: 'theme',
      mode: 'dark',
      label: 'Dark Theme',
      actionLabel: 'Switching to Dark Theme',
      reply: 'Sure - switching the website to the dark theme now.'
    };
  }

  return null;
}

function detectScrollAction(text) {
  const lower = text.toLowerCase().trim();

  if (/(scroll to top|back to top|go to top)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'top',
      label: 'Top of Page',
      actionLabel: 'Scrolling to Top',
      reply: 'Sure - scrolling to the top of the page now.'
    };
  }

  if (/(scroll to bottom|go to bottom|bottom of page)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'bottom',
      label: 'Bottom of Page',
      actionLabel: 'Scrolling to Bottom',
      reply: 'Sure - scrolling to the bottom of the page now.'
    };
  }

  if (/(scroll down|go down|^down$)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'relative-down',
      label: 'Scroll Down',
      actionLabel: 'Scrolling Down',
      reply: 'Sure - scrolling down now.'
    };
  }

  if (/(scroll up|go up|^up$)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'relative-up',
      label: 'Scroll Up',
      actionLabel: 'Scrolling Up',
      reply: 'Sure - scrolling up now.'
    };
  }

  return null;
}

function detectReadPageAction(text) {
  const lower = text.toLowerCase().trim();

  if (/(read( out)? (what was on this page|what is on this page|this page|the page|for me|it to me))|(read the screen)|(what does this page say)/.test(lower)) {
    return {
      kind: 'read-page',
      label: 'Read Page',
      actionLabel: 'Reading Page Content',
      reply: 'Sure, I will read the visible text on this screen.'
    };
  }

  return null;
}

function detectMailAction(text) {
  const lower = text.toLowerCase().trim();
  const hasMailKeyword = /\b(gmail|email|mail)\b/i.test(lower);
  const hasComposeIntent = /\b(send|make|write|open|compose|draft|start)\b/i.test(lower);
  const wantsMailCompose =
    ['mail', 'email', 'gmail'].includes(lower) ||
    (hasMailKeyword && hasComposeIntent) ||
    /\b(mail|email)\s+(ssr|sales)\b/i.test(lower);

  if (!wantsMailCompose) {
    return null;
  }

  return {
    kind: 'mail-composer',
    label: 'Email Client',
    actionLabel: 'Opening Email Client',
    reply: `Sure - opening the email compose window. Do you want me to write it?`
  };
}

function detectInstantAction(text) {
  return (
    detectCloseMailAction(text) ||
    detectCallAction(text) ||
    detectMailAction(text) ||
    detectThemeAction(text) ||
    detectScrollAction(text) ||
    detectReadPageAction(text) ||
    detectPageAction(text)
  );
}

function getPreferredRecognitionLanguage() {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }

  const browserLanguages = [...(navigator.languages || []), navigator.language]
    .filter((value, index, array) => typeof value === 'string' && array.indexOf(value) === index)
    .map((value) => value.toLowerCase());

  if (browserLanguages.some((language) => language.startsWith('en-in') || language.startsWith('hi'))) {
    return 'en-IN';
  }

  if (browserLanguages.some((language) => language.startsWith('en-gb'))) {
    return 'en-GB';
  }

  return 'en-US';
}

function extractRecognitionTranscript(results) {
  let finalTranscript = '';
  let interimTranscript = '';

  Array.from(results || []).forEach((result) => {
    const candidate = result?.[0]?.transcript?.trim() || '';

    if (!candidate) {
      return;
    }

    if (result.isFinal) {
      finalTranscript = `${finalTranscript} ${candidate}`.trim();
      return;
    }

    interimTranscript = `${interimTranscript} ${candidate}`.trim();
  });

  return {
    finalTranscript,
    interimTranscript,
    previewTranscript: finalTranscript || interimTranscript
  };
}

function matchesSpeechStopCommand(text) {
  const normalized = text.toLowerCase().trim();
  return /\b(ok stop|stop|stop speaking|stop talking)\b/.test(normalized);
}

function matchesVoiceOfflineCommand(text) {
  const normalized = text.toLowerCase().trim();
  return /\b(fine bye|good bye|goodbye|bye|go offline|offline)\b/.test(normalized);
}

function detectCloseMailAction(text) {
  const normalized = text.toLowerCase().trim();

  if (!/\b(close mail|close gmail|close email|cancel mail|cancel email|cancel gmail|back to the page|back to page|back to website|return to website|return to page|come back to page|come back to website)\b/.test(normalized)) {
    return null;
  }

  return {
    kind: 'mail-composer-close',
    label: 'Email Client',
    actionLabel: 'Closing Email Client',
    reply: 'Sure - closing the email compose window now.'
  };
}

export default function AIAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { globalContent, isEditMode, updateContent } = useCMS();
  
  const enableAIAssistant = globalContent?.home?.enableAIAssistant ?? true;

  const transcriptRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);
  const sendHandlerRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionActiveRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const startTimeoutRef = useRef(null);
  const micPermissionGrantedRef = useRef(false);
  const recognitionTranscriptRef = useRef('');
  const recognitionResultHandledRef = useRef(false);
  const recognitionErrorRef = useRef('');
  const voiceSessionActiveRef = useRef(false);
  const speechInterruptRecognitionRef = useRef(null);
  const speechRecognitionCtorRef = useRef(null);
  const speechCancelReasonRef = useRef(null);
  const speechInterruptRetryTimeoutRef = useRef(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mailWritingStep, setMailWritingStep] = useState(null); // 'ask-write', 'listening-body'
  const [dictatedMailBody, setDictatedMailBody] = useState('');
  const [pageFlowState, setPageFlowState] = useState(null); // 'waiting-option', 'waiting-repeat'
  const [flowPageKey, setFlowPageKey] = useState(null);
  const [conversationalState, setConversationalState] = useState(null); // 'waiting-how-are-you-sentiment'
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [statusHint, setStatusHint] = useState('Tap mic once to start voice mode. Tap again to stop.');

  const recentMessages = useMemo(() => chatHistory.slice(-8), [chatHistory]);
  const quickActions = useMemo(
    () => [
      { label: 'Training', prompt: 'Open training page' },
      { label: 'Call Office', prompt: 'Call office' },
      { label: 'Meeting Slots', prompt: 'Show available meeting slots' }
    ],
    []
  );

  const clearStartTimeout = () => {
    if (startTimeoutRef.current) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };

  const resetRecognitionState = () => {
    recognitionTranscriptRef.current = '';
    recognitionResultHandledRef.current = false;
    recognitionErrorRef.current = '';
  };

  const stopSpeechInterruptListener = () => {
    const interruptRecognition = speechInterruptRecognitionRef.current;

    if (speechInterruptRetryTimeoutRef.current) {
      window.clearTimeout(speechInterruptRetryTimeoutRef.current);
      speechInterruptRetryTimeoutRef.current = null;
    }

    if (!interruptRecognition) {
      return;
    }

    interruptRecognition.onstart = null;
    interruptRecognition.onresult = null;
    interruptRecognition.onerror = null;
    interruptRecognition.onend = null;
    interruptRecognition.stop?.();
    speechInterruptRecognitionRef.current = null;
  };

  useEffect(() => {
    historyRef.current = chatHistory;
  }, [chatHistory]);

  useEffect(() => {
    voiceSessionActiveRef.current = isVoiceSessionActive;
  }, [isVoiceSessionActive]);

  useEffect(() => {
    if (isPanelOpen) {
      inputRef.current?.focus();
    }
  }, [isPanelOpen]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [recentMessages, isProcessing, isPanelOpen]);

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatusHint('Voice reply is not available in this browser.');
      return;
    }

    const startSpeechInterruptListener = () => {
      const SpeechRecognitionCtor = speechRecognitionCtorRef.current;
      const scheduleSpeechInterruptRetry = (delay = 220) => {
        if (!voiceSessionActiveRef.current || !window.speechSynthesis.speaking || speechCancelReasonRef.current) {
          return;
        }

        if (speechInterruptRetryTimeoutRef.current) {
          window.clearTimeout(speechInterruptRetryTimeoutRef.current);
        }

        speechInterruptRetryTimeoutRef.current = window.setTimeout(() => {
          speechInterruptRetryTimeoutRef.current = null;

          if (voiceSessionActiveRef.current && window.speechSynthesis.speaking && !speechCancelReasonRef.current) {
            startSpeechInterruptListener();
          }
        }, delay);
      };

      if (!voiceSessionActiveRef.current || !SpeechRecognitionCtor) {
        return;
      }

      stopSpeechInterruptListener();

      try {
        const interruptRecognition = new SpeechRecognitionCtor();
        interruptRecognition.continuous = true;
        interruptRecognition.interimResults = true;
        interruptRecognition.lang = getPreferredRecognitionLanguage();
        interruptRecognition.maxAlternatives = 1;

        interruptRecognition.onresult = (event) => {
          const { previewTranscript } = extractRecognitionTranscript(event.results);
          const heardText = previewTranscript.trim();

          if (!heardText) {
            return;
          }

          if (matchesSpeechStopCommand(heardText)) {
            speechCancelReasonRef.current = 'resume';
            stopSpeechInterruptListener();
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setStatusHint('Stopped speaking. Listening again...');
            window.setTimeout(() => {
              if (voiceSessionActiveRef.current) {
                void startListeningCycle();
              }
            }, 180);
            return;
          }

          if (matchesVoiceOfflineCommand(heardText)) {
            speechCancelReasonRef.current = 'offline';
            stopSpeechInterruptListener();
            window.speechSynthesis.cancel();
            stopInteraction('Voice mode stopped. See you soon.');
          }
        };

        interruptRecognition.onerror = (event) => {
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error('Speech interrupt listener error:', event.error);
          }

          if (event.error !== 'aborted' && !speechCancelReasonRef.current) {
            scheduleSpeechInterruptRetry();
          }
        };

        interruptRecognition.onend = () => {
          if (speechInterruptRecognitionRef.current === interruptRecognition) {
            speechInterruptRecognitionRef.current = null;
          }

          if (voiceSessionActiveRef.current && typeof window !== 'undefined' && window.speechSynthesis.speaking && !speechCancelReasonRef.current) {
            scheduleSpeechInterruptRetry(140);
          }
        };

        speechInterruptRecognitionRef.current = interruptRecognition;
        interruptRecognition.start();
      } catch (error) {
        console.error('Speech interrupt listener start error:', error);

        if (!speechCancelReasonRef.current) {
          scheduleSpeechInterruptRetry(260);
        }
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume?.();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getPreferredRecognitionLanguage();
    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusHint('Speaking now');
      if (speechInterruptRetryTimeoutRef.current) {
        window.clearTimeout(speechInterruptRetryTimeoutRef.current);
        speechInterruptRetryTimeoutRef.current = null;
      }
      speechInterruptRetryTimeoutRef.current = window.setTimeout(() => {
        speechInterruptRetryTimeoutRef.current = null;

        if (voiceSessionActiveRef.current && !speechCancelReasonRef.current) {
          startSpeechInterruptListener();
        }
      }, 220);
    };
    utterance.onend = () => {
      stopSpeechInterruptListener();
      setIsSpeaking(false);
      const cancelReason = speechCancelReasonRef.current;
      speechCancelReasonRef.current = null;

      if (cancelReason === 'resume' || cancelReason === 'offline') {
        return;
      }

      setStatusHint(
        voiceSessionActiveRef.current
          ? 'Voice mode is active. Speak again or tap once to stop.'
          : 'Tap mic once to start voice mode.'
      );
    };
    utterance.onerror = () => {
      stopSpeechInterruptListener();
      setIsSpeaking(false);
      speechCancelReasonRef.current = null;
      setStatusHint(
        voiceSessionActiveRef.current
          ? 'Voice reply could not play. Speak again or tap once to stop voice mode.'
          : 'Voice reply could not play on this browser.'
      );
    };
    utterance.rate = 1.0;
    utterance.pitch = 1.06;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.name.includes('Google US English') || voice.name.includes('Samantha')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechCancelReasonRef.current = null;
    setIsSpeaking(true);
    stopSpeechInterruptListener();
    window.speechSynthesis.speak(utterance);
  };

  const appendAssistantMessage = (text, actionMeta = null, shouldSpeak = true) => {
    setChatHistory((prev) => {
      const next = [...prev, { role: 'model', parts: [{ text }], actionMeta }];
      historyRef.current = next;
      return next;
    });

    setStatusHint(text);

    if (!shouldSpeak) {
      return;
    }

    speakText(text);
  };

  const performInstantAction = (action) => {
    if (typeof window === 'undefined') {
      return false;
    }

    if (action.kind === 'navigate') {
      if (action.href.includes('#')) {
        window.location.assign(action.href);
        return true;
      }

      router.push(action.href);
      return true;
    }

    if (action.kind === 'call') {
      window.location.href = `tel:${normalizePhoneNumber(action.phone)}`;
      return true;
    }

    if (action.kind === 'mail-composer') {
      triggerMailLaunch(`mailto:${CONTACT_EMAIL}`);
      setMailWritingStep('ask-write');
      setDictatedMailBody('');
      return true;
    }

    if (action.kind === 'mail-composer-close') {
      setMailWritingStep(null);
      setDictatedMailBody('');
      return true;
    }

    if (action.kind === 'read-page') {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p'));
      const visibleTexts = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
          el.innerText && el.innerText.trim().length > 0
        );
        
        if (isVisible) {
          visibleTexts.push(el.innerText.trim());
        }
      }

      let pageText = "";
      if (visibleTexts.length > 0) {
        const uniqueTexts = Array.from(new Set(visibleTexts)).filter(t => t.length > 2);
        pageText = "On your screen I can see: " + uniqueTexts.join('. ');
      } else {
        pageText = "I don't see any readable text currently on the screen limit.";
      }
      
      setTimeout(() => {
        appendAssistantMessage(pageText);
      }, 800);

      return true;
    }

    if (action.kind === 'theme') {
      setTheme(action.mode);
      return true;
    }

    if (action.kind === 'scroll') {
      if (action.target === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action.target === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else if (action.target === 'relative-down') {
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
      } else if (action.target === 'relative-up') {
        window.scrollBy({ top: -window.innerHeight * 0.7, behavior: 'smooth' });
      }
      return true;
    }

    return false;
  };

  const stopInteraction = (message = 'Voice mode stopped. Tap the mic again when you are ready.') => {
    voiceSessionActiveRef.current = false;
    setIsVoiceSessionActive(false);
    speechCancelReasonRef.current = null;
    recognitionStartingRef.current = false;
    recognitionActiveRef.current = false;
    clearStartTimeout();
    resetRecognitionState();
    stopSpeechInterruptListener();
    recognitionRef.current?.stop?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setStatusHint(message);
  };


  const handleSendTranscript = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    // INTERCEPT 0: If the mail flow is active
    if (mailWritingStep) {
      const lowerText = trimmedText.toLowerCase();

      // Check if they want to cancel/close
      if (lowerText === 'close' || lowerText === 'close mail' || lowerText === 'cancel' || lowerText === 'cancel mail') {
        setMailWritingStep(null);
        setDictatedMailBody('');
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        appendAssistantMessage("Sure - cancelling the email flow.");
        return;
      }

      // State: Waiting to see if they want us to write the body
      if (mailWritingStep === 'ask-write') {
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        if (lowerText.includes('yes') || lowerText.includes('write') || lowerText.includes('sure') || lowerText.includes('ok') || lowerText.includes('yah') || lowerText === 'y') {
          setMailWritingStep('listening-body');
          appendAssistantMessage("ok tell me what to wirte ?");
        } else {
          setMailWritingStep(null);
          appendAssistantMessage("sure no problem ill be waiting for you, any help needed right me out.");
        }
        return;
      }

      // State: Actively typing body
      if (mailWritingStep === 'listening-body') {
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        if (lowerText === 'stop' || lowerText === 'done' || lowerText === 'finish' || lowerText === 'stop writing') {
          setMailWritingStep(null);
          if (dictatedMailBody.trim()) {
            appendAssistantMessage("Got it. Opening your email app with your message.");
            triggerMailLaunch(`mailto:${CONTACT_EMAIL}?body=${encodeURIComponent(dictatedMailBody)}`);
          } else {
            appendAssistantMessage("sure no problem ill be waiting for you, any help needed right me out.");
          }
          return;
        }

        setDictatedMailBody((prev) => {
          const nextBody = prev ? `${prev} ${trimmedText}` : trimmedText;
          appendAssistantMessage(`Typed: "${trimmedText}". Say "done" when you are finished.`);
          return nextBody;
        });
        return;
      }
    }

    const lowerText = trimmedText.toLowerCase();

    // INTERCEPT 0.5: Conversational sentiment check
    if (conversationalState === 'waiting-how-are-you-sentiment') {
      const isPositive = /\b(good|great|fine|happy|awesome|nice|ok|okay|well|cool|super|fantastic|excellent|doing good)\b/i.test(lowerText);
      const isNegative = /\b(bad|sad|not good|terrible|awful|unhappy|sick|stressed|bored|down|depressed)\b/i.test(lowerText);

      if (isPositive) {
        setConversationalState(null);
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        appendAssistantMessage("that great");
        return;
      } else if (isNegative) {
        setConversationalState(null);
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        appendAssistantMessage("sorry to hear that");
        return;
      } else {
        setConversationalState(null);
      }
    }

    // INTERCEPT 2: If we are actively in the page options flow
    if (pageFlowState === 'waiting-option') {
      setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
      if (lowerText === 'nothing' || lowerText === 'no' || lowerText === 'nah' || lowerText === 'stop' || lowerText === 'cancel' || lowerText === 'nevermind' || lowerText === 'none') {
        setPageFlowState(null);
        setFlowPageKey(null);
        appendAssistantMessage("sure no issue, is there any thing else ?");
        return;
      }
      const pageData = PAGE_OPTIONS_DATA[flowPageKey];
      const selectedOption = parseOptionSelection(trimmedText, pageData.options);

      if (selectedOption) {
        setPageFlowState(null);
        setFlowPageKey(null);

        const responseText = `${selectedOption.desc} I am taking you to that section now.`;
        appendAssistantMessage(responseText);

        if (pathname === pageData.path) {
          scrollToOption(selectedOption);
        } else {
          router.push(`${pageData.path}#${selectedOption.elementId}`);
        }
      } else {
        setPageFlowState('waiting-repeat');
        appendAssistantMessage("nah that page not there would u want me to repate it again ?");
      }
      return;
    }

    if (pageFlowState === 'waiting-repeat') {
      setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
      if (lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('ok') || lowerText.includes('repeat') || lowerText === 'y') {
        const pageData = PAGE_OPTIONS_DATA[flowPageKey];
        setPageFlowState('waiting-option');
        appendAssistantMessage(pageData.speech);
      } else if (lowerText.includes('no') || lowerText.includes('nah') || lowerText.includes('stop') || lowerText === 'n') {
        setPageFlowState(null);
        setFlowPageKey(null);
        appendAssistantMessage("sure no issue, is there any thing else ?");
      } else {
        appendAssistantMessage("Would you want me to repeat it again? Please say yes or no.");
      }
      return;
    }

    // Detect "what was in X page" or "what is in X"
    const isPageQuery = /(what was in|what is in|what was on|what is on|what's in|what's on|what sections|tell me sections|tell me what is in)\s+(?:the\s+)?([a-z0-9\s-&]+?)(?:\s+page)?\??$/i.test(lowerText) ||
                        /^(what was in the page|what is in the page|what was in this page|what is in this page|what was in page|what is on the page|what is on this page|what's in the page|what's on the page|what sections are in this page)\??$/i.test(lowerText);

    if (isPageQuery) {
      let resolvedKey = null;
      const match = lowerText.match(/(?:what was in|what is in|what was on|what is on|what's in|what's on|what sections|tell me sections|tell me what is in)\s+(?:the\s+)?([a-z0-9\s-&]+?)(?:\s+page)?\??$/i);
      if (match && match[1]) {
        resolvedKey = resolvePageKey(match[1]);
      }
      if (!resolvedKey) {
        resolvedKey = resolveCurrentPageKey(pathname);
      }

      if (resolvedKey && PAGE_OPTIONS_DATA[resolvedKey]) {
        const pageData = PAGE_OPTIONS_DATA[resolvedKey];
        setPageFlowState('waiting-option');
        setFlowPageKey(resolvedKey);
        
        setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
        appendAssistantMessage(pageData.speech);
        return;
      }
    }

    // Detect "how are u" or greeting check
    const isHowAreYou = /^(how are you|how are u|how r u|how's it going)\??$/i.test(lowerText);
    if (isHowAreYou) {
      setConversationalState('waiting-how-are-you-sentiment');
      setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: trimmedText }] }]);
      appendAssistantMessage("Yah, I am doing good. What about you?");
      return;
    }

    setChatHistory((prev) => {
      const next = [...prev, { role: 'user', parts: [{ text: trimmedText }] }];
      historyRef.current = next;
      return next;
    });
    setIsProcessing(true);
    setStatusHint('Working on that...');

    const instantAction = detectInstantAction(trimmedText);
    if (instantAction) {
      const alreadyOnTarget =
        instantAction.kind === 'navigate' &&
        !instantAction.href.includes('#') &&
        pathname === instantAction.href;

      await new Promise((resolve) => setTimeout(resolve, 140));

      if (alreadyOnTarget) {
        appendAssistantMessage(`You are already on the ${instantAction.label} page. What would you like to do there next?`);
      } else if (instantAction.kind === 'mail-composer-close') {
        appendAssistantMessage(instantAction.reply, {
          label: instantAction.actionLabel,
          kind: instantAction.kind
        }, false);
        performInstantAction(instantAction);
      } else if (instantAction.kind === 'mail-composer') {
        appendAssistantMessage(instantAction.reply, {
          label: instantAction.actionLabel,
          kind: instantAction.kind
        }, false);
        performInstantAction(instantAction);
      } else {
        appendAssistantMessage(instantAction.reply, {
          label: instantAction.actionLabel,
          kind: instantAction.kind
        });
        window.setTimeout(() => performInstantAction(instantAction), 320);
      }

      setIsProcessing(false);
      return;
    }

    const getCookie = (name) => {
      if (typeof window === 'undefined') return '';
      const parts = `; ${document.cookie}`.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
      return '';
    };

    const visitorName = getCookie('visitor_name');
    const visitorEmail = getCookie('visitor_email');

    const historyBeforeSend = sanitizeHistoryForApi(
      historyRef.current.filter((entry, index, array) => index < array.length - 1)
    );

    let cmsModules = [];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ssr_cms_modules');
        if (saved) {
          cmsModules = JSON.parse(saved);
        }
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: trimmedText, 
          chatHistory: historyBeforeSend,
          visitorName,
          visitorEmail,
          cmsModules
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'The assistant could not answer right now.');
      }

      const replyText = typeof data.reply === 'string' ? data.reply.trim() : '';

      if (!replyText) {
        appendAssistantMessage('I heard you, but I could not generate a reply just now. Please try again.');
        return;
      }

      appendAssistantMessage(
        replyText,
        data.model === 'local-fallback' ? { label: 'Voice fallback active', kind: 'info' } : null
      );

      if (data.booking) {
        const setCookie = (name, value, days = 365) => {
          const expires = new Date(Date.now() + days * 86400000).toUTCString();
          document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
        };
        setCookie('visitor_name', data.booking.visitorName);
        setCookie('visitor_email', data.booking.visitorEmail);
        if (data.booking.visitorPhone) {
          setCookie('visitor_phone', data.booking.visitorPhone);
        }
      }

      if (replyText.toLowerCase().includes('confirmed')) {
        try {
          triggerConfetti();
        } catch (confettiErr) {
          console.error('Confetti animation failed:', confettiErr);
        }
      }
    } catch (error) {
      console.error('Chat API error:', error);
      appendAssistantMessage(error?.message || 'The assistant is temporarily unavailable. Please try again.', null, false);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    sendHandlerRef.current = handleSendTranscript;
  }, [handleSendTranscript]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceAvailable(Boolean(SpeechRecognition));
    speechRecognitionCtorRef.current = SpeechRecognition || null;

    if (!SpeechRecognition) {
      setStatusHint('Voice input is not supported in this browser. Open chat to type.');
      return undefined;
    }

    const reco = new SpeechRecognition();
    reco.continuous = false;
    reco.interimResults = true;
    reco.lang = getPreferredRecognitionLanguage();
    reco.maxAlternatives = 3;

    const submitRecognizedText = async (rawTranscript) => {
      const transcript = rawTranscript.trim();

      if (!transcript || recognitionResultHandledRef.current) {
        return;
      }

      recognitionResultHandledRef.current = true;
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);
      setStatusHint(`Heard: "${transcript}"`);
      await sendHandlerRef.current?.(transcript);
    };

    reco.onstart = () => {
      clearStartTimeout();
      resetRecognitionState();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = true;
      setIsListening(true);
      setStatusHint(voiceSessionActiveRef.current ? 'Voice mode is on. Listening now...' : 'Listening now...');
    };

    reco.onresult = async (event) => {
      clearStartTimeout();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = true;
      const { finalTranscript, interimTranscript, previewTranscript } = extractRecognitionTranscript(event.results);
      recognitionTranscriptRef.current = previewTranscript;

      if (!previewTranscript) {
        setStatusHint('Listening now...');
        return;
      }

      if (!finalTranscript) {
        setStatusHint(`Hearing: "${interimTranscript}"`);
        return;
      }

      reco.stop?.();
      await submitRecognizedText(finalTranscript);
    };

    reco.onnomatch = () => {
      clearStartTimeout();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      recognitionErrorRef.current = 'nomatch';
      setIsListening(false);

      if (voiceSessionActiveRef.current) {
        setStatusHint('I could not understand that clearly. Speak again or tap once to stop voice mode.');
        return;
      }

      appendAssistantMessage('I could not understand that clearly. Please tap the mic and say it again.', null, false);
    };

    reco.onerror = (event) => {
      clearStartTimeout();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);
      setIsProcessing(false);
      recognitionErrorRef.current = event.error || 'unknown';

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }

      if (event.error === 'aborted') {
        setStatusHint(voiceSessionActiveRef.current ? 'Voice mode stopped.' : 'Voice stopped. Tap the mic again when you are ready.');
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        voiceSessionActiveRef.current = false;
        setIsVoiceSessionActive(false);
        appendAssistantMessage('Microphone access is blocked. Please allow microphone permission and try again.', null, false);
        return;
      }

      if (event.error === 'audio-capture') {
        voiceSessionActiveRef.current = false;
        setIsVoiceSessionActive(false);
        appendAssistantMessage('No microphone was detected on this device. Please connect a microphone and try again.', null, false);
        return;
      }

      if (event.error === 'network') {
        voiceSessionActiveRef.current = false;
        setIsVoiceSessionActive(false);
        appendAssistantMessage('Voice recognition needs a stable connection right now. Please check your network and try again.', null, false);
        return;
      }

      if (event.error === 'no-speech') {
        if (voiceSessionActiveRef.current) {
          setStatusHint('I did not catch that. Speak again or tap once to stop voice mode.');
          return;
        }

        appendAssistantMessage('I could not hear any words from the microphone. Check the input device selected in Windows and Chrome, then tap the mic and speak close to it.', null, false);
        return;
      }

      voiceSessionActiveRef.current = false;
      setIsVoiceSessionActive(false);
      appendAssistantMessage('Voice input could not start properly. Please tap the mic again and speak right away.', null, false);
    };

    reco.onend = () => {
      const pendingTranscript = recognitionTranscriptRef.current.trim();
      const recognitionFailed = recognitionErrorRef.current;

      clearStartTimeout();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);

      if (!recognitionFailed && pendingTranscript && !recognitionResultHandledRef.current) {
        void submitRecognizedText(pendingTranscript);
        return;
      }

      setStatusHint((current) => (
        current === 'Listening now...' || current.startsWith('Hearing:') || current === 'Voice mode is on. Listening now...'
          ? (voiceSessionActiveRef.current ? 'Voice mode is active. Speak now or tap once to stop.' : 'Tap mic once to start voice mode.')
          : current
      ));
    };

    recognitionRef.current = reco;

    return () => {
      clearStartTimeout();
      resetRecognitionState();
      stopSpeechInterruptListener();
      speechRecognitionCtorRef.current = null;
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      reco.onstart = null;
      reco.onresult = null;
      reco.onnomatch = null;
      reco.onerror = null;
      reco.onend = null;
      reco.stop?.();
      recognitionRef.current = null;
    };
  }, []);

  const ensureMicrophoneReady = async () => {
    if (typeof window === 'undefined') {
      return { ok: false, message: 'Voice input is only available in the browser.' };
    }

    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!window.isSecureContext && !isLocalHost) {
      return {
        ok: false,
        message: 'Voice commands need HTTPS on mobile. Open the secure Vercel link instead of the local IP address.'
      };
    }

    if (micPermissionGrantedRef.current || !navigator.mediaDevices?.getUserMedia) {
      return { ok: true };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      micPermissionGrantedRef.current = true;
      return { ok: true };
    } catch (error) {
      const errorName = error?.name || '';

      if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
        return {
          ok: false,
          message: 'Microphone permission is blocked. Please allow the mic in your browser settings and try again.'
        };
      }

      if (errorName === 'NotFoundError') {
        return {
          ok: false,
          message: 'No microphone was found on this device. Please connect one and try again.'
        };
      }

      return {
        ok: false,
        message: 'Microphone access could not be started. Please try again in Chrome over HTTPS.'
      };
    }
  };

  const startListeningCycle = async () => {
    const recognition = recognitionRef.current;

    if (!voiceAvailable || !recognition) {
      setStatusHint('Voice input is not supported in this browser. Open chat to type.');
      return;
    }

    if (recognitionStartingRef.current || recognitionActiveRef.current || isListening || isSpeaking || isProcessing) {
      return;
    }

    const micCheck = await ensureMicrophoneReady();
    if (!micCheck.ok) {
      voiceSessionActiveRef.current = false;
      setIsVoiceSessionActive(false);
      appendAssistantMessage(micCheck.message, null, false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    resetRecognitionState();
    recognitionStartingRef.current = true;
    setStatusHint(voiceSessionActiveRef.current ? 'Voice mode is active. Starting microphone...' : 'Starting microphone...');
    clearStartTimeout();
    startTimeoutRef.current = window.setTimeout(() => {
      voiceSessionActiveRef.current = false;
      setIsVoiceSessionActive(false);
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);
      appendAssistantMessage('The microphone did not start. On mobile, please use Chrome with microphone permission enabled and a secure HTTPS link.', null, false);
    }, 2600);

    try {
      recognition.start();
    } catch (error) {
      clearStartTimeout();
      recognitionStartingRef.current = false;
      const isAlreadyStarted = error?.name === 'InvalidStateError' || /already started/i.test(error?.message || '');
      if (isAlreadyStarted) {
        setStatusHint('Listening is already active. Speak now or tap once to stop.');
        return;
      }

      voiceSessionActiveRef.current = false;
      setIsVoiceSessionActive(false);
      console.error('Speech recognition start error:', error);
      appendAssistantMessage('Voice input could not start. Please tap the mic again and speak right away.', null, false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash) {
      const id = decodeURIComponent(hash.replace('#', ''));
      const element = document.getElementById(id);
      if (element) {
        window.setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else {
        window.setTimeout(() => {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong, li, dt, th, p, span'));
          const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const found = headings.find(h => {
            const cleanText = h.textContent.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            return cleanText.includes(cleanId);
          });
          if (found) {
            found.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const resumeVoiceSession = () => {
      if (
        document.visibilityState === 'visible' &&
        voiceSessionActiveRef.current &&
        !recognitionStartingRef.current &&
        !recognitionActiveRef.current &&
        !isListening &&
        !isProcessing &&
        !isSpeaking
      ) {
        void startListeningCycle();
      }
    };

    document.addEventListener('visibilitychange', resumeVoiceSession);
    window.addEventListener('focus', resumeVoiceSession);

    return () => {
      document.removeEventListener('visibilitychange', resumeVoiceSession);
      window.removeEventListener('focus', resumeVoiceSession);
    };
  }, [isListening, isProcessing, isSpeaking, voiceAvailable]);

  useEffect(() => {
    if (!isVoiceSessionActive || !voiceAvailable) {
      return undefined;
    }

    if (recognitionStartingRef.current || recognitionActiveRef.current || isListening || isProcessing || isSpeaking) {
      return undefined;
    }

    const restartTimeout = window.setTimeout(() => {
      void startListeningCycle();
    }, 260);

    return () => {
      window.clearTimeout(restartTimeout);
    };
  }, [isVoiceSessionActive, isListening, isProcessing, isSpeaking, voiceAvailable]);

  const toggleListening = async () => {
    const recognition = recognitionRef.current;

    if (!voiceAvailable || !recognition) {
      setStatusHint('Voice input is not supported in this browser. Open chat to type.');
      return;
    }

    if (voiceSessionActiveRef.current || recognitionStartingRef.current || recognitionActiveRef.current || isListening || isSpeaking || isProcessing) {
      stopInteraction();
      return;
    }

    voiceSessionActiveRef.current = true;
    setIsVoiceSessionActive(true);
    setStatusHint('Voice mode is active. Speak now or tap once to stop.');
    await startListeningCycle();
  };

  const handleTextSubmit = (event) => {
    event.preventDefault();
    if (!textInput.trim() || isProcessing) {
      return;
    }

    const value = textInput.trim();
    setTextInput('');
    stopInteraction();
    handleSendTranscript(value);
  };

  const handleQuickAction = (prompt) => {
    if (isProcessing) {
      return;
    }

    stopInteraction();
    handleSendTranscript(prompt);
  };

  const renderVoiceVisualizer = () => {
    if (!isListening && !isSpeaking && !isProcessing) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-white drop-shadow-md">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      );
    }

    return (
      <div className="relative z-10 flex items-center justify-center gap-[3px] h-8">
        <span className="voice-bar"></span>
        <span className="voice-bar"></span>
        <span className="voice-bar"></span>
        <span className="voice-bar"></span>
        <span className="voice-bar"></span>
      </div>
    );
  };

  let statusText = statusHint;
  let ringColor = 'ring-blue-500/30';
  let bgGradient = 'from-[#2E5E99] to-[#0D2440]';

  if (isListening) {
    statusText = 'Listening now';
    ringColor = 'ring-red-500/50 animate-pulse';
    bgGradient = 'from-red-500 to-red-700';
  } else if (isProcessing) {
    statusText = 'Working';
    ringColor = 'ring-sky-500/50 animate-pulse';
    bgGradient = 'from-sky-500 to-[#2E5E99]';
  } else if (isSpeaking) {
    statusText = 'Speaking';
    ringColor = 'ring-emerald-500/50 animate-pulse';
    bgGradient = 'from-emerald-500 to-emerald-700';
  } else if (isVoiceSessionActive) {
    statusText = 'Voice Mode On';
    ringColor = 'ring-cyan-400/40';
    bgGradient = 'from-cyan-500 to-[#1B4F7A]';
  }

  if (!enableAIAssistant && !isEditMode) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voiceWave {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1.35); }
        }
        .voice-bar {
          display: inline-block;
          width: 3px;
          height: 18px;
          background-color: white;
          border-radius: 2px;
          animation: voiceWave 0.8s ease-in-out infinite;
          transform-origin: center;
        }
        .voice-bar:nth-child(1) { animation-delay: 0.1s; }
        .voice-bar:nth-child(2) { animation-delay: 0.3s; animation-duration: 0.6s; }
        .voice-bar:nth-child(3) { animation-delay: 0.5s; animation-duration: 0.9s; }
        .voice-bar:nth-child(4) { animation-delay: 0.2s; animation-duration: 0.7s; }
        .voice-bar:nth-child(5) { animation-delay: 0.4s; animation-duration: 0.8s; }
      `}} />

      {isPanelOpen ? (
        <div className="w-[min(24rem,calc(100vw-1.5rem))] rounded-[30px] border border-[#7BA4D0]/35 bg-[linear-gradient(180deg,rgba(13,36,64,0.95),rgba(18,45,78,0.88))] p-4 text-white shadow-[0_30px_90px_rgba(13,36,64,0.45)] backdrop-blur-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#7BA4D0]/40 bg-white/10 text-xs font-semibold tracking-[0.24em] text-[#E7F0FA] shadow-lg">
                AI
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[0.28em] text-[#E7F0FA]/85">SSR ASSISTANT</div>
                <div className="mt-1 text-xs leading-5 text-[#C8DAEE]">
                  Voice is primary. Chat is optional here when you want to type.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="rounded-full border border-[#7BA4D0]/28 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E7F0FA] transition hover:bg-white/14"
            >
              Close
            </button>
          </div>

          <div ref={transcriptRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto rounded-[24px] border border-white/10 bg-white/5 p-3">
            {recentMessages.length === 0 ? (
              <div className="rounded-2xl border border-[#7BA4D0]/18 bg-white/6 px-4 py-3 text-sm leading-6 text-[#DCE8F6]">
                Tap the mic once to start voice mode, then tap again when you want to stop. Try <span className="text-white">open training page</span>, <span className="text-white">take me to client page</span>, <span className="text-white">send a mail</span>, or <span className="text-white">switch to light theme</span>.
              </div>
            ) : (
              recentMessages.map((item, index) => {
                const isUser = item.role === 'user';
                return (
                  <div key={`${item.role}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[92%] gap-2 ${isUser ? 'flex-row-reverse' : 'items-start'}`}>
                      {!isUser ? (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#7BA4D0]/30 bg-white/10 text-[10px] font-semibold tracking-[0.2em] text-[#E7F0FA]">
                          AI
                        </div>
                      ) : null}
                      <div>
                        <div
                          className={`rounded-[22px] px-4 py-3 text-sm leading-7 shadow-lg ${
                            isUser
                              ? 'bg-gradient-to-br from-[#7BA4D0] to-[#2E5E99] text-white'
                              : 'border border-[#7BA4D0]/20 bg-[#E7F0FA]/12 text-[#EAF3FC]'
                          }`}
                        >
                          {item.parts?.[0]?.text || ''}
                        </div>
                        {!isUser && item.actionMeta ? (
                          <div className="mt-2 inline-flex rounded-full border border-[#7BA4D0]/25 bg-[#7BA4D0]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#CFE2F7]">
                            {item.actionMeta.label}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isProcessing ? (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#7BA4D0]/30 bg-white/10 text-[10px] font-semibold tracking-[0.2em] text-[#E7F0FA]">
                    AI
                  </div>
                  <div className="flex items-center gap-1 rounded-[22px] border border-[#7BA4D0]/20 bg-[#E7F0FA]/10 px-4 py-4 text-[#EAF3FC] shadow-lg">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#7BA4D0] [animation-delay:-0.2s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#7BA4D0] [animation-delay:-0.1s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#7BA4D0]"></span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleQuickAction(action.prompt)}
                className="rounded-full border border-[#7BA4D0]/28 bg-white/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#DCE8F6] transition-all hover:-translate-y-0.5 hover:border-[#7BA4D0]/55 hover:bg-white/12"
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-[9px] font-bold tracking-[0.2em] text-[#7BA4D0]/95 mb-2 uppercase">SAP Module Training Info:</div>
            <div className="flex flex-wrap gap-1.5">
              {['SAP FICO', 'SAP MM', 'SAP SD', 'SAP ABAP', 'SAP HANA'].map((module) => (
                <button
                  key={module}
                  type="button"
                  onClick={() => handleQuickAction(`Tell me about your ${module} course`)}
                  className="rounded-full border border-[#7BA4D0]/18 bg-white/5 px-2.5 py-1 text-[10px] font-medium tracking-[0.02em] text-[#C8DAEE] transition hover:-translate-y-0.5 hover:border-[#7BA4D0]/35 hover:bg-white/10 active:scale-95"
                >
                  {module}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="Type only when you want chat..."
              autoComplete="off"
              className="w-full rounded-2xl border border-[#7BA4D0]/40 bg-[#E7F0FA]/10 px-4 py-3 text-sm text-white placeholder-[#D8E7F8]/55 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#7BA4D0]"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="rounded-2xl border border-[#7BA4D0]/30 bg-gradient-to-br from-[#7BA4D0] to-[#2E5E99] px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(46,94,153,0.35)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        {pathname?.startsWith('/services') && (
          <a 
            href="tel:+919010062578" 
            className="sm:hidden flex items-center justify-center gap-2 rounded-full border border-[#7BA4D0]/40 bg-gradient-to-r from-[#1E3A5F] to-[#0D2440] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 hover:border-[#7BA4D0] hover:shadow-[0_0_15px_rgba(123,164,208,0.4)]"
          >
            Call now for demo session
          </a>
        )}
        <button
          onClick={toggleListening}
          disabled={!voiceAvailable}
          aria-label={voiceAvailable ? 'Start voice assistant' : 'Voice input unavailable'}
          className={`relative flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} shadow-[0_0_15px_rgba(0,0,0,0.6)] sm:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 focus:outline-none ring-2 sm:ring-4 ${ringColor} ${voiceAvailable ? 'hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-60'}`}
        >
          {renderVoiceVisualizer()}
        </button>
      </div>

      {isEditMode && (
        <div className="mt-2 flex items-center justify-end bg-black/80 rounded px-2 py-1 shadow-lg border border-white/20">
          <label className="flex items-center space-x-2 text-[10px] text-white cursor-pointer">
            <span>Show AI Mic:</span>
            <input 
              type="checkbox" 
              checked={enableAIAssistant} 
              onChange={(e) => updateContent('home', 'enableAIAssistant', e.target.checked)} 
              className="form-checkbox h-3 w-3 text-emerald-500 rounded bg-white/10"
            />
          </label>
        </div>
      )}

    </div>
  );
}
