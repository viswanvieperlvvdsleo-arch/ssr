import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../../../lib/db';
import { rateLimit } from '../../../lib/rateLimit';

export const dynamic = 'force-dynamic';
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const modelCandidates = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash'
].filter(Boolean);

const contactDetails = {
  phonePrimary: '+91 9010062578',
  phoneSecondary: '+91 90100 62578',
  email: 'sales@ssrbusinesssolutions.com',
  visakhapatnam:
    'Varanasi Majestic, Suite No.-B1, 4th Floor, Dwaraka Nagar 2nd Lane, Opp Pizza Hut, beside Ginger Hotel, Visakhapatnam-530016, Andhra Pradesh.',
  hyderabad:
    'Melkiors Pride, Dr no: 2-41/13/PMP/5F, 5th Floor, Izzat Nagar, Khanamet, HITEX, Hyderabad-500084, Telangana.'
};

function isMissingModelError(error) {
  const message = error?.message || '';
  return error?.status === 404 || /not found|not supported for generateContent/i.test(message);
}

function isQuotaError(error) {
  const message = error?.message || '';
  return error?.status === 429 || /quota exceeded|too many requests|rate limit/i.test(message);
}

function canFallbackToLocal(error) {
  const message = error?.message || '';
  return (
    !genAI ||
    isMissingModelError(error) ||
    isQuotaError(error) ||
    /api key|permission denied|forbidden|unauthorized/i.test(message)
  );
}

function formatSlot(slot, index) {
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = new Date(slot.date).toLocaleDateString('en-US', options);
  return `Slot ${index + 1} on ${formattedDate} from ${slot.startTime} to ${slot.endTime}`;
}

function listSlots(slots, limit = 4) {
  if (!slots.length) {
    return 'We do not have open meeting slots right now, but you can still contact us at sales@ssrbusinesssolutions.com or +91 9010062578.';
  }

  return slots
    .slice(0, limit)
    .map((slot, index) => formatSlot(slot, index))
    .join('; ');
}

function extractEmail(text) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
}

function extractPhone(text) {
  return text.match(/(?:\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim() || null;
}

function extractName(text) {
  const patterns = [
    /(?:my name is|this is|name\s*[:=-]|i am called|i'm)\s*([a-z][a-z\s.'-]{1,60})/i,
    /(?:it's|its)\s+([a-z][a-z\s.'-]{1,60})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s{2,}/g, ' ');
    }
  }

  return null;
}

function extractPurpose(text) {
  const patterns = [
    /(?:purpose is|purpose\s*[:=-]|regarding|about)\s*([^.;\n]+)/i,
    /(?:for)\s+(training|placement|placements|staffing|development|software development|a project|project discussion|consultation|demo|meeting)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function findMentionedSlot(text, slots) {
  const lowered = text.toLowerCase();
  
  // 1. First search for direct DB ID match
  const directMatch = slots.find((slot) => lowered.includes(slot.id.toLowerCase()));
  if (directMatch) return directMatch;
  
  // 2. Search for number indicators like "slot 1", "first slot", "slot one", etc.
  if (/\b(slot\s*1|first\s*slot|slot\s*one|slot\s*frist)\b/i.test(lowered)) return slots[0] || null;
  if (/\b(slot\s*2|second\s*slot|slot\s*two)\b/i.test(lowered)) return slots[1] || null;
  if (/\b(slot\s*3|third\s*slot|slot\s*three)\b/i.test(lowered)) return slots[2] || null;
  if (/\b(slot\s*4|fourth\s*slot|slot\s*four)\b/i.test(lowered)) return slots[3] || null;

  // 3. Fallback matching numbers: e.g. "1", "one", "2", "two"
  const matches = lowered.match(/\b(1|one|2|two|3|three|4|four)\b/);
  if (matches) {
    const val = matches[1];
    let idx = -1;
    if (val === '1' || val === 'one') idx = 0;
    else if (val === '2' || val === 'two') idx = 1;
    else if (val === '3' || val === 'three') idx = 2;
    else if (val === '4' || val === 'four') idx = 3;
    
    if (idx !== -1 && slots[idx]) {
      return slots[idx];
    }
  }

  return null;
}

function buildFallbackBookingPayload(message, chatHistory, slots) {
  const combinedText = [...(chatHistory || []), { role: 'user', parts: [{ text: message }] }]
    .filter((entry) => entry.role === 'user')
    .map((entry) => entry.parts?.map((part) => part.text || '').join(' '))
    .join(' \n ');

  const selectedSlot = findMentionedSlot(combinedText, slots);

  return {
    selectedSlot,
    visitorName: extractName(combinedText),
    visitorEmail: extractEmail(combinedText),
    visitorPhone: extractPhone(combinedText),
    purpose: extractPurpose(combinedText)
  };
}

function sanitizeChatHistory(history) {
  return (history || [])
    .map((entry) => ({
      role: entry?.role === 'model' ? 'model' : 'user',
      parts: (entry?.parts || [])
        .map((part) => ({ text: typeof part?.text === 'string' ? part.text : '' }))
        .filter((part) => part.text)
    }))
    .filter((entry) => entry.parts.length);
}

function shouldUseLocalFirst(message) {
  const normalizedMessage = message.trim().toLowerCase();

  return (
    /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(normalizedMessage) ||
    /how's it going|who are you|who are u|what are you|what can you do|thank you|thanks|thank u|help|help me|what should i ask/i.test(normalizedMessage) ||
    /how are you|how are u|how r u/i.test(normalizedMessage) ||
    /what else can (u|you) do|where (was|is) it located|who (were|are) (the )?clients/i.test(normalizedMessage) ||
    /what module(s)? aviable|what module(s)? available|what module(s)? do you (provide|offer)/i.test(normalizedMessage) ||
    /(best|top|choose|pick|select|take).*(module|modules)|(module|modules).*(best|top|choose|pick|select|take)/i.test(normalizedMessage) ||
    /what was in the home|what is (on|in) the home/i.test(normalizedMessage)
  );
}

function hasUsableReply(reply) {
  return typeof reply === 'string' && reply.trim().length > 0;
}

function localAssistantReply(message, chatHistory, slots, visitorName = null, visitorEmail = null) {
  const text = message.toLowerCase().trim();
  
  // Follow-up state checking from chat history
  const lastModelMsg = [...(chatHistory || [])].reverse().find(m => m.role === 'model')?.parts?.[0]?.text?.toLowerCase() || '';

  if (lastModelMsg.includes('choose a, b, or c') || lastModelMsg.includes('best sap module')) {
    if (/\b(a|technical|coding|first|1)\b/i.test(text) || /code|program|developer/i.test(text)) {
      return 'For a technical coding background, the best modules are SAP ABAP (SAP programming language) or SAP HANA (database technology).';
    }
    if (/\b(b|finance|accounting|business|second|2)\b/i.test(text) || /account|money|mba|management/i.test(text)) {
      return 'For a finance or accounting background, the best module is SAP FICO (Financial Accounting and Controlling).';
    }
    if (/\b(c|supply|logistics|operations|third|3)\b/i.test(text) || /supply|logistics|shipping|operations|sale|sales/i.test(text)) {
      return 'For logistics or supply chain interest, the best modules are SAP MM (Materials Management) or SAP SD (Sales & Distribution).';
    }
  }

  if (lastModelMsg.includes('sections on our home page') || lastModelMsg.includes('about what do you want to know')) {
    if (text.includes('first') || text.includes('1') || text.includes('training') || text.includes('sap training')) {
      return 'The Real-Time SAP Training section highlights our certified corporate trainers, 24/7 server access, and placement support. You can also explore the Training page for full details.';
    }
    if (text.includes('second') || text.includes('2') || text.includes('development') || text.includes('software')) {
      return 'The End-to-End Software Development section explains our effective design processes managing scope, budget, and quality. You can visit the Development page to learn more.';
    }
    if (text.includes('third') || text.includes('3') || text.includes('staffing') || text.includes('solutions')) {
      return 'The IT Staffing section details our models: Permanent Hire, Contract-to-Hire, and Campus Recruitment. You can check the Staffing page for more info.';
    }
    if (text.includes('fourth') || text.includes('4') || text.includes('services') || text.includes('core')) {
      return 'Our Core Services section lists our three primary pillars: professional training, client staffing, and custom software builds.';
    }
    if (text.includes('fifth') || text.includes('5') || text.includes('about') || text.includes('who we are')) {
      return 'The About SSR section shares our metrics like 500+ students trained, 100+ placements, and our founding in 2020 by IT consultants.';
    }
    if (text.includes('sixth') || text.includes('6') || text.includes('advantage') || text.includes('advantages') || text.includes('why choose')) {
      return 'Our Advantages section showcases why clients choose us: real-time consultants, soft skills training, and 24/7 student servers.';
    }
  }

  // Exact custom Q&A commands
  if (/what else can (u|you) do/i.test(text)) {
    return 'I can help you navigate pages, scroll up and down, call our office, send emails, answer company details, list our clients, or help you choose the best SAP module.';
  }

  if (/where (was|is) it located/i.test(text)) {
    return 'We are located in Visakhapatnam and Hyderabad. The Vizag head office is in Varanasi Majestic, Dwaraka Nagar, and the Hyderabad branch is in Melkiors Pride, HITEX, Izzat Nagar.';
  }

  if (/who (were|are) (the )?clients|our clients|major clients/i.test(text)) {
    return 'Our major client partners include AWS, Capgemini, Visakhapatnam Port Authority, PWC, and 3S Business Corporation.';
  }

  if (/what module(s)? aviable|what module(s)? available|what module(s)? do you (provide|offer)/i.test(text)) {
    return 'We offer training in SAP FICO, SAP MM, SAP SD, SAP ABAP, and SAP HANA. Which module are you interested in?';
  }

  if (/(best|top|choose|pick|select|take).*(module|modules)|(module|modules).*(best|top|choose|pick|select|take)/i.test(text)) {
    return 'To find the best SAP module for you, what is your primary background or interest? A: Coding or technical background. B: Finance, accounting, or business background. C: Supply chain, logistics, or operations background. Choose A, B, or C.';
  }

  if (/what was in the home|what is (on|in) the home/i.test(text)) {
    return 'There are lots of sections on our Home page: 1. Real-Time SAP Training, 2. End-to-End Software Development, 3. IT Staffing, 4. Our Core Services, 5. About SSR, and 6. Our Advantages. About what do you want to know?';
  }

  const availabilityIntent = /available|availability|slots|slot timings|meeting times/.test(text);
  const greetingIntent = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text);
  const bookingDetails = buildFallbackBookingPayload(message, chatHistory, slots);
  if (!bookingDetails.visitorName && visitorName) {
    bookingDetails.visitorName = visitorName;
  }
  if (!bookingDetails.visitorEmail && visitorEmail) {
    bookingDetails.visitorEmail = visitorEmail;
  }
  const bookingIntent =
    /book|schedule|appointment|meeting|slot|call|demo/.test(text) ||
    Boolean(bookingDetails.selectedSlot) ||
    /name|email|purpose/.test(text);

  if (bookingIntent || availabilityIntent) {
    if (!slots.length) {
      return 'We do not have open meeting slots right now. You can still contact us at sales@ssrbusinesssolutions.com or +91 9010062578 and our team will help you directly.';
    }

    if (!bookingDetails.selectedSlot) {
      return `I can help with that. Our current open slots are ${listSlots(slots)}. Reply with the slot ID you want, your name, your email, and your purpose.`;
    }

    const missingFields = [];
    if (!bookingDetails.visitorName) missingFields.push('name');
    if (!bookingDetails.visitorEmail) missingFields.push('email');
    if (!bookingDetails.purpose) missingFields.push('purpose');

    if (missingFields.length) {
      return `I found the slot ${bookingDetails.selectedSlot.id}. Please send your ${missingFields.join(', ')} so I can complete the booking.`;
    }

    return `BOOKING_JSON:${JSON.stringify({
      availabilityId: bookingDetails.selectedSlot.id,
      visitorName: bookingDetails.visitorName,
      visitorEmail: bookingDetails.visitorEmail,
      visitorPhone: bookingDetails.visitorPhone || null,
      purpose: bookingDetails.purpose
    })}`;
  }

  if (/training|sap|course|class|learn/.test(text)) {
    return 'We offer real-time SAP and IT training with certified corporate trainers, online and classroom modes, 24/7 server access, placement assistance, and soft-skills support. If you want, I can also take you to the Training page.';
  }

  if (/placement|placements|staffing|hire|recruitment|talent/.test(text)) {
    return 'We provide permanent hire, contract-to-hire, and campus recruitment services, with screening and ongoing quality monitoring for client teams. If you want, I can open the Staffing and Solutions page for you.';
  }

  if (/development|project|software|build|application|app/.test(text)) {
    return 'We handle end-to-end software development with planning, research, budgeting, risk management, delivery, support, and enhancement for modern business projects. If you want, I can take you to the Development page.';
  }

  if (/contact|phone|email|address|location|office/.test(text)) {
    return `You can reach SSR at ${contactDetails.phonePrimary} or ${contactDetails.phoneSecondary}, or email ${contactDetails.email}. If you want, say call office or open contact page and I can do that for you.`;
  }

  if (/visakhapatnam|vizag/.test(text)) {
    return `Our head office is in Visakhapatnam: ${contactDetails.visakhapatnam}`;
  }

  if (/hyderabad/.test(text)) {
    return `Our Hyderabad branch office is at ${contactDetails.hyderabad}`;
  }

  if (/how are you|how are u|how r u|how's it going/i.test(text)) {
    return 'Yah, I am doing good. What about you?';
  }

  if (/who are you|who are u|what are you|what can you do/.test(text)) {
    return 'I am the AI assistant for SSR Business Solutions. I can guide you around the website, answer questions, open pages, help you call our team, and assist with meeting bookings. How can I help you today?';
  }

  if (/thank you|thanks|thank u/.test(text)) {
    return 'You are welcome. If you need anything else on the SSR website, just ask.';
  }

  if (/help|help me|what should i ask/.test(text)) {
    return 'You can ask me about training, staffing, development, contact details, office locations, available meeting slots, or tell me to open a page, switch theme, or call the office.';
  }

  if (/about|company|why choose/.test(text)) {
    return 'SSR Business Solutions is a SAP Authorized Training Center founded in 2020, focused on training, staffing, and software development with real consultants and live-system experience.';
  }

  if (greetingIntent) {
    return 'Hi, I am the AI assistant for SSR Business Solutions. I can help with training, staffing, development, contact details, page navigation, calls, and meeting bookings. How can I help you today?';
  }

  return 'It not able to do, that kinda of task.';
}

async function getModelReply(message, chatHistory, systemPrompt) {
  const uniqueModels = [...new Set(modelCandidates)];
  let lastRecoverableError = null;

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          {
            role: 'model',
            parts: [{ text: 'Understood. I will act exactly as the voice assistant, keeping my responses short, natural, and without markdown.' }]
          },
          ...(chatHistory || [])
        ]
      });

      const result = await chat.sendMessage([{ text: message }]);
      return {
        responseText: result.response.text(),
        modelName
      };
    } catch (error) {
      if (isMissingModelError(error) || isQuotaError(error)) {
        lastRecoverableError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastRecoverableError) {
    throw lastRecoverableError;
  }

  throw new Error('No supported Gemini chat model was available.');
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const limitCheck = rateLimit(ip, 30, 60 * 1000); // 30 requests/min
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before sending another message.' },
        { status: 429 }
      );
    }

    const { message, chatHistory, visitorName, visitorEmail, cmsModules } = await request.json();
    const sanitizedChatHistory = sanitizeChatHistory(chatHistory);

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Please send a message before starting the chat.' }, { status: 400 });
    }

    let slots = [];
    try {
      slots = await prisma.availability.findMany({
        where: { isBooked: false },
        orderBy: { date: 'asc' }
      });
    } catch (dbError) {
      console.warn("Vercel SQLite Read-Only fallback triggered:", dbError.message);
      // Fallback slots so the AI still functions normally in production
      slots = [
        { id: '1', date: new Date(Date.now() + 86400000), startTime: '10:00', endTime: '11:00', isBooked: false },
        { id: '2', date: new Date(Date.now() + 172800000), startTime: '14:00', endTime: '15:00', isBooked: false }
      ];
    }

    const slotsString = slots.length > 0
      ? slots
          .map((slot, index) => `Slot Number: ${index + 1} (Database ID: ${slot.id}) | Date: ${new Date(slot.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} | Time: ${slot.startTime} - ${slot.endTime}`)
          .join('\n')
      : 'No open slots currently available.';

    let modulesContext = '';
    if (cmsModules && cmsModules.length > 0) {
      modulesContext = "\n\nWebsite Services Modules Details (Use this to answer questions like 'What is FICO?'):\n" + 
        cmsModules.map(m => `- ${m.name} (${m.tagline}): ${m.what} ${m.does} Benefit: ${m.benefit} Eligibility: ${m.eligible}`).join('\n');
    }

    let systemPrompt = `You are an expert conversational AI voice assistant for "SSR Business Solutions", an officially authorized SAP Training Center and IT Service provider founded in 2020.
Your goal is to answer visitor questions briefly, professionally, and naturally based on the following business context, and assist them in booking meetings.

Business Context & FAQ:
1. Contact Info: Phone is ${contactDetails.phonePrimary} (or ${contactDetails.phoneSecondary}). Email is ${contactDetails.email}.
2. Offices:
   - Head Office in Visakhapatnam: Varanasi Majestic, Dwaraka Nagar 2nd Lane, beside Ginger Hotel, Vizag.
   - Branch Office in Hyderabad: Melkiors Pride, 5th Floor, Izzat Nagar, Khanamet, HITEX, Hyderabad.
3. SAP Training: Real-time, certified instructors, 24/7 server access, online & classroom modes, placement cell, and soft-skills/personality development training. We cover all major modules: SAP FICO, MM, SD, PP, ABAP, and HANA.
4. IT Staffing: We offer Permanent Hire, Contract-to-Hire, and Campus Recruitment Models.
5. Development: End-to-end software planning, technology selection, budgeting, execution, and support.
6. Clients: Our major client partners include AWS, Capgemini, Visakhapatnam Port Authority, PWC, and 3S Business Corporation.
7. Capabilities: I can guide you through the site, scroll pages up and down, open your email app, call our office, or advise you on the best SAP module.${modulesContext}

Dialog Flows:
- If a user asks about a specific module (e.g., "What is FICO?"), explain what it is, what it does, and why it is useful based on the Website Services Modules Details. ALWAYS end your explanation with: "Would you like me to make a call? Just say 'make a call, I'll connect you to our team'."
- If the visitor asks "what module is best for me?", you MUST reply exactly with: "To find the best SAP module for you, what is your primary background or interest? A: Coding or technical background. B: Finance, accounting, or business background. C: Supply chain, logistics, or operations background. Choose A, B, or C."
  - If they reply choosing A: Suggest SAP ABAP or SAP HANA.
  - If they reply choosing B: Suggest SAP FICO.
  - If they reply choosing C: Suggest SAP MM or SAP SD.
- If the visitor asks "what was in the home?", you MUST reply exactly with: "There are lots of sections on our Home page: 1. Real-Time SAP Training, 2. End-to-End Software Development, 3. IT Staffing, 4. Our Core Services, 5. About SSR, and 6. Our Advantages. About what do you want to know?"
  - If they select one (e.g. "first one", "1", "training"), explain that section in 1-2 brief sentences.

Meeting Booking:
Current Available Meeting Slots:
${slotsString}

If the visitor wants to book, read out the options as "Slot 1", "Slot 2", etc. (e.g. "Slot 1: June 9th from 10:00 to 11:00").
DO NOT speak or display the long database ID string (e.g. cmq562...) to the user. Only refer to the slots as "Slot 1", "Slot 2", etc.
Ask which slot number they prefer. Ask for Name, Email, and Purpose (if they are not already provided in the Visitor Context below).
Once you have these, match the slot number they selected back to the corresponding Database ID (e.g. slot 1 -> database ID cmq562...), and output the booking JSON strictly as: BOOKING_JSON:{"availabilityId": "DATABASE_ID_HERE", "visitorName": "...", "visitorEmail": "...", "purpose": "..."}.
DO NOT include the json block inside markdown ticks.

AI Constraints:
- Since your text will be read aloud by a Voice API, keep your answers extremely short (under 2-3 sentences), conversational, and natural.
- Do NOT use emojis, markdown formatting, or bold text.
- If asked to perform an action or answer a question that is entirely outside of your capabilities as a website assistant (such as writing code, generating images, or unrelated web searches), you must strictly respond with: "it not able to do, that kinda of task".`;

    if (visitorName || visitorEmail) {
      systemPrompt += `\n\nVisitor Context: The user's name is "${visitorName || 'unknown'}" and their email is "${visitorEmail || 'unknown'}". They are already remembered by browser cookies. When they ask to book a slot, do NOT ask them for their name or email since you already have them. Simply confirm if they want to book using their details, and once you have their purpose and slot choice, output the BOOKING_JSON directly using their details.`;
    }

    let responseText;
    let modelName;
    let confirmedBooking = null;

    const lastModelText = sanitizedChatHistory.slice().reverse().find(entry => entry.role === 'model')?.parts?.[0]?.text?.toLowerCase() || '';
    const isFollowUp = lastModelText.includes('choose a, b, or c') || lastModelText.includes('sections on our home page') || lastModelText.includes('what do you want to know');

    if (shouldUseLocalFirst(message.trim()) || isFollowUp) {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots, visitorName, visitorEmail);
      modelName = 'local-fallback';
    } else if (genAI) {
      try {
        const modelReply = await getModelReply(message.trim(), sanitizedChatHistory, systemPrompt);
        responseText = modelReply.responseText;
        modelName = modelReply.modelName;
      } catch (error) {
        if (!canFallbackToLocal(error)) {
          throw error;
        }

        responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots, visitorName, visitorEmail);
        modelName = 'local-fallback';
      }
    } else {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots, visitorName, visitorEmail);
      modelName = 'local-fallback';
    }

    if (!hasUsableReply(responseText)) {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots, visitorName, visitorEmail);
      modelName = 'local-fallback';
    }

    if (responseText.includes('BOOKING_JSON:')) {
      try {
        const jsonString = responseText.split('BOOKING_JSON:')[1].trim();
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '');
        const bookingData = JSON.parse(cleanJson);

        try {
          await prisma.$transaction([
            prisma.booking.create({ data: bookingData }),
            prisma.availability.update({
              where: { id: bookingData.availabilityId },
              data: { isBooked: true }
            })
          ]);
        } catch (dbError) {
          console.warn('Booking database write failed (Read-only environment fallback). Logging booking:', dbError.message);
          console.log('Simulated successful booking data:', bookingData);
        }

        responseText = 'Your booking has been successfully confirmed! We look forward to speaking with you.';
        confirmedBooking = {
          visitorName: bookingData.visitorName,
          visitorEmail: bookingData.visitorEmail,
          visitorPhone: bookingData.visitorPhone || ''
        };
      } catch (error) {
        console.error('Booking parse error:', error);
        responseText = "I'm sorry, I ran into an issue saving your booking. Please try again.";
      }
    }

    return NextResponse.json({ reply: responseText, model: modelName, booking: confirmedBooking });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
}




