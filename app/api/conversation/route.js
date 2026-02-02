import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Check API key
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not configured');
      return NextResponse.json({ 
        response: "Boss, my API key isn't configured. Add GOOGLE_AI_API_KEY to environment variables.",
        success: false
      }, { status: 500 });
    }

    const { messages, meetingsContext } = await request.json();

    console.log('Processing conversation...');
    console.log('Messages received:', messages?.length);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    
    // Use the correct model name for the package version
    let model;
    try {
      // Try gemini-1.5-flash first (newest)
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (e) {
      try {
        // Fallback to gemini-pro
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
      } catch (e2) {
        console.error('Model initialization failed:', e2);
        return NextResponse.json({ 
          response: "Boss, I'm having trouble loading my AI model. Let me try a simpler approach...",
          success: false
        }, { status: 500 });
      }
    }

    // Build simple, focused system instruction
    const systemPrompt = `You are Andee, a friendly personal assistant. Call the user "Boss". Keep responses very brief (1-2 sentences). Be helpful with calendar management.

Current context:
${meetingsContext?.upcomingMeetings?.length > 0 ? 
  `Upcoming: ${meetingsContext.upcomingMeetings.map(m => `${m.title} at ${new Date(m.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}`).join(', ')}` 
  : 'No meetings scheduled'}

When boss wants to:
- Check schedule: respond with "[ACTION:CHECK_SCHEDULE]"
- Create meeting: ask who/when, then "[ACTION:CREATE_MEETING|title|date|time|60]"
- Cancel meeting: "[ACTION:CANCEL_MEETING|identifier]"

Examples:
User: "Hi" → You: "Hi Boss! How can I help?"
User: "create a meeting" → You: "Sure! Who do you want to meet with?"`;

    // Remove duplicate messages
    const uniqueMessages = [];
    const seen = new Set();
    for (const msg of messages || []) {
      const key = `${msg.role}:${msg.content}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMessages.push(msg);
      }
    }

    if (uniqueMessages.length === 0) {
      return NextResponse.json({ 
        response: "Hi Boss! How can I help you today?",
        success: true 
      });
    }

    // Get last user message
    const lastMessage = uniqueMessages[uniqueMessages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ 
        response: "I'm listening, Boss!",
        success: true 
      });
    }

    console.log('User said:', lastMessage.content);

    // Build conversation history for Gemini
    const history = uniqueMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    console.log('Starting chat with', history.length, 'history items');

    // Start chat
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 100,
      },
    });

    // Add system context to user message
    const messageWithContext = `${systemPrompt}\n\nUser: ${lastMessage.content}`;

    console.log('Sending to Gemini...');
    
    // Send message
    const result = await chat.sendMessage(messageWithContext);
    const responseText = result.response.text();
    
    console.log('Gemini responded:', responseText);

    return NextResponse.json({ 
      response: responseText,
      success: true 
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide helpful fallback based on error
    let fallbackResponse = "Sorry Boss, ";
    
    if (error.message?.includes('API_KEY')) {
      fallbackResponse += "my API key has an issue. Please check it's configured correctly.";
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      fallbackResponse += "I hit my rate limit. Can you try again in a minute?";
    } else if (error.message?.includes('model')) {
      fallbackResponse += "there's a problem with my AI model. The package might need updating.";
    } else {
      fallbackResponse += "I had a technical hiccup. Can you try again?";
    }
    
    return NextResponse.json({ 
      response: fallbackResponse,
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
