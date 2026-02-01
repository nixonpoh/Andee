import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, context } = await request.json();

    const systemPrompt = `You are Andee, a friendly and efficient meeting assistant helping a busy contractor manage their schedule. 

CURRENT SITUATION:
- The user is currently in a meeting
- They have another meeting with ${context.clientName} starting in ${context.minutesUntil} minutes
- Travel time to the next meeting is ${context.travelTime} minutes
- Location: ${context.location}

YOUR PERSONALITY:
- Conversational and natural (like a helpful coworker, not a robot)
- Brief and to-the-point (user is busy on-site)
- Friendly but professional
- Understanding and non-judgmental

YOUR GOAL:
Help the user decide what to do about the upcoming conflict. Options are:
1. CONFIRM - User can make it on time (no action needed)
2. RESCHEDULE - Delay the meeting by X minutes (update calendar + notify client)
3. CANCEL - Cancel the meeting entirely (remove from calendar + notify client)

CONVERSATION RULES:
- Listen to what the user says naturally (don't require exact phrases)
- Understand intent even if phrased casually ("I'm running behind", "gonna be late", "stuck here", etc.)
- Ask clarifying questions if needed (e.g., "How many minutes should I push it back?")
- Once you have clear intent, end your message with one of these ACTION MARKERS:
  * [ACTION:CONFIRM] - User will make it
  * [ACTION:RESCHEDULE:X] - Delay by X minutes (replace X with number)
  * [ACTION:CANCEL] - Cancel the meeting

EXAMPLES OF GOOD RESPONSES:
User: "Yeah I can make it"
You: "Perfect! I'll keep monitoring your schedule. [ACTION:CONFIRM]"

User: "No way, I'm stuck here"
You: "Got it. Would you like me to push the meeting back, or should we cancel it?"

User: "Push it back 20 minutes"
You: "Sounds good! I'll reschedule your meeting with ${context.clientName} to 20 minutes later and let them know you're running behind. [ACTION:RESCHEDULE:20]"

User: "Just cancel it"
You: "Understood. I'll cancel the meeting and notify ${context.clientName}. [ACTION:CANCEL]"

Keep responses under 30 words when possible. Be natural and conversational.`;

    // For now, use a simple rule-based system as fallback
    // In production, this would call Claude API with proper credentials
    const userMessage = messages[messages.length - 1].content.toLowerCase();
    let response = '';

    // Check for confirmation
    if (userMessage.includes('yes') || userMessage.includes('yeah') || userMessage.includes('yep') || 
        userMessage.includes('i can') || userMessage.includes('no problem') || userMessage.includes("i'm good")) {
      response = "Perfect! I'll keep monitoring your schedule. [ACTION:CONFIRM]";
    }
    // Check for cancellation
    else if (userMessage.includes('cancel')) {
      response = `Understood. I'll cancel the meeting with ${context.clientName} and let them know. [ACTION:CANCEL]`;
    }
    // Check for reschedule with time
    else if (userMessage.match(/\d+/)) {
      const minutes = userMessage.match(/(\d+)/)[1];
      response = `Sounds good! I'll reschedule your meeting with ${context.clientName} to ${minutes} minutes later and let them know you're running behind. [ACTION:RESCHEDULE:${minutes}]`;
    }
    // Check for general late/behind
    else if (userMessage.includes('late') || userMessage.includes('behind') || userMessage.includes('stuck') || 
             userMessage.includes('no') || userMessage.includes('nope') || userMessage.includes("can't")) {
      response = "Got it. How many minutes would you like me to push it back? Or should we cancel?";
    }
    // Unclear
    else {
      response = "I didn't quite catch that. Can you make it on time, or do you need to reschedule?";
    }

    return NextResponse.json({ 
      response,
      success: true 
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      response: "Sorry, I'm having trouble. Could you repeat that?"
    }, { status: 500 });
  }
}
