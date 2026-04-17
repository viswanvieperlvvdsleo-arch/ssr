"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '../hooks/useTheme';

const PRIMARY_PHONE = '+91 7013749901';
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
  { href: '/#clients', label: 'Clients', aliases: ['client', 'clients', 'client page', 'clients page', 'clients section', 'client section'] },
  { href: '/#testimonials', label: 'Testimonials', aliases: ['testimonials', 'testimonial section', 'reviews section'] }
];

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
  const lower = text.toLowerCase();

  if (/(scroll to top|back to top|go to top)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'top',
      label: 'Top of Page',
      actionLabel: 'Scrolling to Top',
      reply: 'Sure - scrolling to the top of the page now.'
    };
  }

  if (/(scroll down|go down|scroll to bottom|go to bottom|bottom of page)/.test(lower)) {
    return {
      kind: 'scroll',
      target: 'bottom',
      label: 'Bottom of Page',
      actionLabel: 'Scrolling to Bottom',
      reply: 'Sure - scrolling to the bottom of the page now.'
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
    kind: 'mail',
    href: '/contact-us?compose=1#message-form',
    email: CONTACT_EMAIL,
    label: 'SSR Message Form',
    actionLabel: 'Opening SSR Message Form',
    reply: `Sure - opening the SSR message form for ${CONTACT_EMAIL} now.`
  };
}

function detectInstantAction(text) {
  return (
    detectCloseMailAction(text) ||
    detectCallAction(text) ||
    detectMailAction(text) ||
    detectThemeAction(text) ||
    detectScrollAction(text) ||
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

  if (!/\b(close mail|close gmail|back to the page|back to page|back to website|return to website|return to page|come back to page|come back to website)\b/.test(normalized)) {
    return null;
  }

  return {
    kind: 'mail-return',
    label: 'SSR Website',
    actionLabel: 'Closing Message Form',
    reply: 'Sure - closing the message form and returning to the website now.'
  };
}

export default function AIAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
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

    if (action.kind === 'mail') {
      if (action.href.includes('#')) {
        window.location.assign(action.href);
        return true;
      }

      router.push(action.href);
      return true;
    }

    if (action.kind === 'mail-return') {
      if (pathname === '/contact-us' && window.history.length > 1) {
        window.history.back();
        return true;
      }

      router.push('/');
      return true;
    }

    if (action.kind === 'theme') {
      setTheme(action.mode);
      return true;
    }

    if (action.kind === 'scroll') {
      const top = action.target === 'top' ? 0 : document.body.scrollHeight;
      window.scrollTo({ top, behavior: 'smooth' });
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
      } else if (instantAction.kind === 'mail-return') {
        if (pathname === '/contact-us') {
          appendAssistantMessage(instantAction.reply, {
            label: instantAction.actionLabel,
            kind: instantAction.kind
          }, false);
          performInstantAction(instantAction);
        } else {
          appendAssistantMessage('You are already on the SSR website. There is no message form open right now.', null, false);
        }
      } else if (instantAction.kind === 'mail') {
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

    const historyBeforeSend = sanitizeHistoryForApi(
      historyRef.current.filter((entry, index, array) => index < array.length - 1)
    );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedText, chatHistory: historyBeforeSend })
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

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
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
      ) : (
        <div className="max-w-[15rem] sm:max-w-[20rem] rounded-2xl sm:rounded-3xl border border-[#7BA4D0]/28 bg-[#0D2440]/82 px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-xs font-medium leading-tight sm:leading-5 tracking-[0.08em] text-[#DCE8F6] shadow-[0_12px_30px_rgba(13,36,64,0.45)] sm:shadow-[0_16px_40px_rgba(13,36,64,0.35)] backdrop-blur-xl">
          {statusHint}
        </div>
      )}

      <div className="flex items-center gap-3">


        <button
          onClick={toggleListening}
          disabled={!voiceAvailable}
          aria-label={voiceAvailable ? 'Start voice assistant' : 'Voice input unavailable'}
          className={`relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} shadow-[0_0_15px_rgba(0,0,0,0.6)] sm:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 focus:outline-none ring-2 sm:ring-4 ${ringColor} ${voiceAvailable ? 'hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-60'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-white drop-shadow-md">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      </div>

      <div className="hidden sm:block max-w-[20rem] rounded-full border border-[#7BA4D0]/22 bg-white/8 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D6E6F8] backdrop-blur-lg">
        {statusText}
      </div>
    </div>
  );
}
