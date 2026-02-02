import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export async function POST(request) {
  try {
    const { messages, meetingsContext } = await request.json();

    // Build system instruction with calendar context
    const systemInstruction = `You are Andee, a friendly and professional personal assistant helping your boss manage their calendar and meetings.

PERSONALITY:
- Call the user "Boss" naturally in conversation
- Be warm, conversational, and personable (like a real PA)
- Use casual, natural language - not robotic
- Show initiative and proactively suggest things
- Be respectful but friendly
- Keep responses brief (2-3 sentences max)

CURRENT CALENDAR CONTEXT:
${meetingsContext ? `
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

${meetingsContext.upcomingMeetings?.length > 0 ? `
Upcoming meetings:
${meetingsContext.upcomingMeetings.map(m => `- ${m.title} with ${m.clientName} at ${new Date(m.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (Location: ${m.location})`).join('\n')}
` : 'No upcoming meetings scheduled.'}

${meetingsContext.currentMeeting ? `
Current meeting: ${meetingsContext.currentMeeting.title} (ends at ${new Date(meetingsContext.currentMeeting.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})
` : 'Not currently in a meeting.'}
` : 'No calendar data available yet.'}

YOUR CAPABILITIES:
1. CHECK schedule - When boss asks what's coming up
2. CREATE meetings - When boss wants to schedule something
3. CANCEL meetings - When boss wants to remove a meeting
4. RESCHEDULE meetings - When boss wants to change timing
5. PROACTIVE ALERTS - Warn boss about conflicts

GREETING:
- When conversation starts, greet with "Hi Boss!" or "Hey Boss!"
- Be enthusiastic and ready to help

IMPORTANT: You will see the entire conversation history. DO NOT repeat your previous responses. Only respond to the LATEST user message.

WHEN BOSS WANTS TO TAKE ACTION:
When you understand boss wants to do something, respond naturally and then add ONE of these action markers at the END:

[ACTION:CHECK_SCHEDULE] - To list today's meetings
[ACTION:CREATE_MEETING|title|date|time|duration] - To create new meeting
  Example: [ACTION:CREATE_MEETING|Meeting with John|2024-02-03|14:00|60]
[ACTION:CANCEL_MEETING|identifier] - To cancel a meeting
  Example: [ACTION:CANCEL_MEETING|3pm] or [ACTION:CANCEL_MEETING|John]
[ACTION:RESCHEDULE_MEETING|identifier|new_time] - To reschedule
  Example: [ACTION:RESCHEDULE_MEETING|3pm|16:00]

CONVERSATION EXAMPLES:

User: "Hi"
You: "Hi Boss! How can I help you today?"

User: "I want to create a meeting"
You: "Sure thing, Boss! Who would you like to meet with?"

User: "create a meeting"
You: "Got it! Who would you like to meet with, and when?"

User: "What do I have today?"
You: "Let me check your schedule for you, Boss. [ACTION:CHECK_SCHEDULE]"

User: "Cancel my 3pm"
You: "Sure thing, Boss. I'll cancel your 3pm meeting. [ACTION:CANCEL_MEETING|3pm]"

IMPORTANT RULES:
- Be conversational, not transactional
- Use "Boss" naturally (not every sentence)  
- Keep responses SHORT and friendly (1-2 sentences)
- Only use ONE action marker per response
- Put action markers at the END
- If you need more info, ASK before acting
- DO NOT repeat yourself - only respond to the new message`;

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    // Filter messages - only keep user and assistant messages, avoid duplicates
    const uniqueMessages = [];
    const seenContent = new Set();
    
    for (const msg of messages) {
      const key = `${msg.role}:${msg.content}`;
      if (!seenContent.has(key)) {
        seenContent.add(key);
        uniqueMessages.push(msg);
      }
    }

    // Get only the conversation history (not including the latest message)
    const history = uniqueMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 150, // Shorter responses
      },
    });

    // Get latest user message only
    const latestMessage = uniqueMessages[uniqueMessages.length - 1];
    
    if (latestMessage.role !== 'user') {
      return NextResponse.json({ 
        response: "I'm ready when you are, Boss!",
        success: true 
      });
    }

    console.log('Sending to Gemini:', latestMessage.content);
    
    // Send message and get response
    const result = await chat.sendMessage(latestMessage.content);
    const response = result.response;
    const text = response.text();

    console.log('Gemini responded:', text);

    return NextResponse.json({ 
      response: text,
      success: true 
    });

  } catch (error) {
    console.error('Gemini AI error:', error);
    
    // Friendly fallback
    return NextResponse.json({ 
      response: "Sorry Boss, I had a momentary hiccup. Can you repeat that?",
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
