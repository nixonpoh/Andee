import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, meetingsContext } = await request.json();

    console.log('Processing with Vertex AI...');

    // Check credentials
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_API_KEY) {
      return NextResponse.json({ 
        response: "Boss, I need Google Cloud credentials configured. Add GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_API_KEY.",
        success: false
      }, { status: 500 });
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = 'us-central1'; // or your preferred region
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    // Build system instruction
    const systemInstruction = `You are Andee, a friendly personal assistant. Call the user "Boss". Keep responses VERY brief (1-2 sentences max).

Current calendar:
${meetingsContext?.upcomingMeetings?.length > 0 ? 
  `Meetings: ${meetingsContext.upcomingMeetings.map(m => `${m.title} at ${new Date(m.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}`).join(', ')}` 
  : 'No meetings scheduled'}

When boss wants action, add marker:
[ACTION:CHECK_SCHEDULE] - list schedule
[ACTION:CREATE_MEETING|title|date|time|60] - create
[ACTION:CANCEL_MEETING|identifier] - cancel
[ACTION:RESCHEDULE_MEETING|identifier|time] - reschedule

Examples:
User: "Hi" → "Hi Boss! How can I help?"
User: "create a meeting" → "Sure! Who do you want to meet with?"`;

    // Remove duplicates
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

    // Build conversation history
    const contents = [];
    
    // Add system instruction as first user message
    contents.push({
      role: 'user',
      parts: [{ text: systemInstruction }]
    });
    
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I am Andee, your assistant.' }]
    });

    // Add conversation history
    for (let i = 0; i < uniqueMessages.length - 1; i++) {
      const msg = uniqueMessages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add latest message
    contents.push({
      role: 'user',
      parts: [{ text: lastMessage.content }]
    });

    // Vertex AI endpoint
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

    console.log('Calling Vertex AI...');

    // Call Vertex AI
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 100,
          topK: 40,
          topP: 0.95,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error:', errorText);
      throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Vertex AI response:', data);

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                        "Sorry Boss, I didn't get a proper response. Can you try again?";

    console.log('Responding:', responseText);

    return NextResponse.json({ 
      response: responseText,
      success: true 
    });

  } catch (error) {
    console.error('Vertex AI Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    let fallbackResponse = "Sorry Boss, ";
    
    if (error.message?.includes('API key')) {
      fallbackResponse += "my Google Cloud API key isn't working. Check the environment variables.";
    } else if (error.message?.includes('403') || error.message?.includes('permission')) {
      fallbackResponse += "I don't have permission. Make sure Vertex AI API is enabled in Google Cloud.";
    } else if (error.message?.includes('404')) {
      fallbackResponse += "the Vertex AI endpoint wasn't found. Check your project ID.";
    } else {
      fallbackResponse += "I had a hiccup with Vertex AI. Can you try again?";
    }
    
    return NextResponse.json({ 
      response: fallbackResponse,
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
