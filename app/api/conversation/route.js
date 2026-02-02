import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set');
      return NextResponse.json({ 
        response: "Boss, I need my API key configured. Please add GOOGLE_AI_API_KEY to your environment variables.",
        success: false,
        error: 'API key missing'
      }, { status: 500 });
    }

    const { messages, meetingsContext } = await request.json();

    console.log('Received messages:', messages?.length || 0);
    console.log('Has meetings context:', !!meetingsContext);

    // Build system instruction
    const systemInstruction = `You are Andee, a friendly personal assistant helping your boss manage their calendar.

PERSONALITY:
- Call the user "Boss" naturally
- Be warm and conversational
- Keep responses VERY brief (1-2 sentences max)
- Be helpful and proactive

CURRENT SITUATION:
${meetingsContext ? `
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

${meetingsContext.upcomingMeetings?.length > 0 ? `
Upcoming meetings: ${meetingsContext.upcomingMeetings.map(m => `${m.title} with ${m.clientName} at ${new Date(m.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`).join(', ')}
` : 'No meetings scheduled.'}
` : ''}

CAPABILITIES:
- Check schedule
- Create meetings
- Cancel meetings  
- Reschedule meetings

WHEN BOSS WANTS ACTION:
Add ONE action marker at the end:
- [ACTION:CHECK_SCHEDULE]
- [ACTION:CREATE_MEETING|title|date|time|duration]
- [ACTION:CANCEL_MEETING|identifier]
- [ACTION:RESCHEDULE_MEETING|identifier|new_time]

EXAMPLES:
User: "Hi" → You: "Hi Boss! How can I help you today?"
User: "create a meeting" → You: "Sure! Who would you like to meet with?"
User: "What's today" → You: "Let me check your schedule, Boss. [ACTION:CHECK_SCHEDULE]"

IMPORTANT: 
- Only respond to the LATEST message
- Keep it short and natural
- Ask questions if you need info`;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    
    // Use gemini-1.5-flash (faster and more reliable than gemini-pro)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });

    // Remove duplicates from messages
    const uniqueMessages = [];
    const seen = new Set();
    
    for (const msg of messages) {
      const key = `${msg.role}:${msg.content}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMessages.push(msg);
      }
    }

    console.log('Unique messages:', uniqueMessages.length);

    // Get history (all but last message)
    const history = uniqueMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Get latest message
    const latestMessage = uniqueMessages[uniqueMessages.length - 1];
    
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json({ 
        response: "I'm listening, Boss!",
        success: true 
      });
    }

    console.log('Latest user message:', latestMessage.content);

    // Start chat
    const chat = model.startChat({
      history: history,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 100,
      },
    });

    // Send message
    console.log('Sending to Gemini...');
    const result = await chat.sendMessage(latestMessage.content);
    const text = result.response.text();
    
    console.log('Gemini response:', text);

    return NextResponse.json({ 
      response: text,
      success: true 
    });

  } catch (error) {
    console.error('Gemini error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Better error messages
    let errorMsg = "Sorry Boss, I had a hiccup. ";
    
    if (error.message?.includes('API key')) {
      errorMsg += "My API key isn't working. Check the environment variable.";
    } else if (error.message?.includes('quota')) {
      errorMsg += "I've hit my usage limit. Try again in a minute.";
    } else if (error.message?.includes('model')) {
      errorMsg += "There's an issue with my AI model configuration.";
    } else {
      errorMsg += "Can you try saying that again?";
    }
    
    return NextResponse.json({ 
      response: errorMsg,
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
