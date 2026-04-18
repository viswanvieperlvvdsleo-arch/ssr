import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
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
  phonePrimary: '+91 7013749901',
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

function formatSlot(slot) {
  return `ID ${slot.id} on ${new Date(slot.date).toLocaleDateString()} from ${slot.startTime} to ${slot.endTime}`;
}

function listSlots(slots, limit = 4) {
  if (!slots.length) {
    return 'We do not have open meeting slots right now, but you can still contact us at sales@ssrbusinesssolutions.com or +91 7013749901.';
  }

  return slots
    .slice(0, limit)
    .map((slot) => formatSlot(slot))
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
  return slots.find((slot) => lowered.includes(slot.id.toLowerCase())) || null;
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
    /how are you|how are u|how r you|how's it going|who are you|who are u|what are you|what can you do|thank you|thanks|thank u|help|help me|what should i ask/i.test(normalizedMessage)
  );
}

function hasUsableReply(reply) {
  return typeof reply === 'string' && reply.trim().length > 0;
}

function localAssistantReply(message, chatHistory, slots) {
  const text = message.toLowerCase();
  const availabilityIntent = /available|availability|slots|slot timings|meeting times/.test(text);
  const greetingIntent = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text.trim());
  const bookingDetails = buildFallbackBookingPayload(message, chatHistory, slots);
  const bookingIntent =
    /book|schedule|appointment|meeting|slot|call|demo/.test(text) ||
    Boolean(bookingDetails.selectedSlot) ||
    /name|email|purpose/.test(text);

  if (bookingIntent || availabilityIntent) {
    if (!slots.length) {
      return 'We do not have open meeting slots right now. You can still contact us at sales@ssrbusinesssolutions.com or +91 7013749901 and our team will help you directly.';
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

  if (/how are you|how are u|how r you|how's it going/.test(text)) {
    return 'I am doing well and ready to help you with the SSR website. You can ask me to open pages, switch theme, call the office, or answer questions about SSR.';
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
    const { message, chatHistory } = await request.json();
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
          .map((slot) => `ID: ${slot.id} | Date: ${new Date(slot.date).toLocaleDateString()} | Time: ${slot.startTime} - ${slot.endTime}`)
          .join('\n')
      : 'No open slots currently available.';

    const systemPrompt = `You are a helpful, conversational AI voice assistant for "SSR Business Solutions".
Your goal is to answer visitor questions briefly and assist them in booking meetings.
Since your text will be read aloud by a Voice API, keep your answers short, conversational, and natural. Do NOT use emojis, markdown formatting, or bold text.

Current Available Meeting Slots:
${slotsString}

If the user wants to book, ask them which slot they prefer, and then ask for their Name, Email, and Purpose.
Once they provide all this information, strictly say "BOOKING_JSON:" followed immediately by the raw JSON of their booking: {"availabilityId": "...", "visitorName": "...", "visitorEmail": "...", "purpose": "..."}.
This JSON string will be caught by the system to physically book it in the database. DO NOT include the json block inside markdown ticks.

If the user asks you to perform an action or answer a question that is entirely outside of your capabilities as a website assistant (such as writing code, generating images, or unrelated web searches), you must strictly respond with: "it not able to do, that kinda of task".`;

    let responseText;
    let modelName;

    if (shouldUseLocalFirst(message.trim())) {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots);
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

        responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots);
        modelName = 'local-fallback';
      }
    } else {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots);
      modelName = 'local-fallback';
    }

    if (!hasUsableReply(responseText)) {
      responseText = localAssistantReply(message.trim(), sanitizedChatHistory, slots);
      modelName = 'local-fallback';
    }

    if (responseText.includes('BOOKING_JSON:')) {
      try {
        const jsonString = responseText.split('BOOKING_JSON:')[1].trim();
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '');
        const bookingData = JSON.parse(cleanJson);

        await prisma.$transaction([
          prisma.booking.create({ data: bookingData }),
          prisma.availability.update({
            where: { id: bookingData.availabilityId },
            data: { isBooked: true }
          })
        ]);

        responseText = 'Your booking has been successfully confirmed! We look forward to speaking with you.';
      } catch (error) {
        console.error('Booking parse error:', error);
        responseText = "I'm sorry, I ran into an issue saving your booking. Please try again.";
      }
    }

    return NextResponse.json({ reply: responseText, model: modelName });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
}




