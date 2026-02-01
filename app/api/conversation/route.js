import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, meetingsContext } = await request.json();

    // Build system prompt with meeting context
    const systemPrompt = `You are Andee, a friendly and professional personal assistant helping your boss manage their calendar and meetings.

PERSONALITY:
- Call the user "Boss" naturally in conversation
- Be warm, conversational, and personable (like a real PA)
- Use casual, natural language - not robotic
- Show initiative and proactively suggest things
- Be respectful but friendly

GREETING:
- When the conversation starts, greet with "Hi Boss!" or similar
- Be enthusiastic and ready to help

CURRENT CALENDAR CONTEXT:
${meetingsContext ? `
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

Upcoming meetings:
${meetingsContext.upcomingMeetings?.map(m => `- ${m.title} with ${m.clientName} at ${new Date(m.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${m.location})`).join('\n')}

Current meeting: ${meetingsContext.currentMeeting ? `${meetingsContext.currentMeeting.title} (ends at ${new Date(meetingsContext.currentMeeting.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})` : 'None'}
` : 'No calendar data available yet.'}

YOUR CAPABILITIES:
1. CREATE new meetings - When boss wants to schedule something
2. CANCEL meetings - When boss wants to remove a meeting
3. RESCHEDULE meetings - When boss wants to change timing
4. CHECK schedule - When boss asks what's coming up
5. PROACTIVE ALERTS - Warn boss about conflicts

CONVERSATION FLOW:
- Listen naturally to what boss says
- Ask clarifying questions conversationally (not like a form)
- Confirm actions before executing
- When ready to execute, use ACTION MARKERS (but keep them natural in conversation)

ACTION MARKERS (use when ready to execute):
[ACTION:CREATE|title|startTime|endTime|location]
[ACTION:CANCEL|meetingId]
[ACTION:RESCHEDULE|meetingId|newStartTime]
[ACTION:CHECK_SCHEDULE]

EXAMPLES:

User: "Hi"
You: "Hi Boss! How can I help you today? Want me to check your schedule or set up a meeting?"

User: "What do I have today?"
You: "Let me check your calendar for you, Boss... [ACTION:CHECK_SCHEDULE]"

User: "Schedule a meeting with John"
You: "Sure thing, Boss! When would you like to meet with John?"
User: "Tomorrow at 2pm"
You: "Got it! Meeting with John tomorrow at 2pm. How long should I block out?"
User: "An hour"
You: "Perfect! I'll schedule one hour with John tomorrow at 2pm. Where will you be meeting? [Or should I use your default location?]"

User: "Cancel my 3pm"
You: "You got it, Boss. I'll cancel your 3pm meeting with [name]. Should I let them know you'll reschedule?"

IMPORTANT:
- Be conversational, not transactional
- Use "Boss" naturally (not every sentence)
- Ask follow-up questions naturally
- Confirm before taking action
- Show personality and warmth
- Keep responses brief but friendly (2-3 sentences max unless explaining something)

Remember: You're not just processing commands - you're having a conversation with someone you work for and respect.`;

    // Simple response for now (we'll integrate Claude API properly)
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    let response = '';

    // Greeting
    if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('hey')) {
      if (messages.length <= 1) {
        response = "Hi Boss! How can I help you today? Want me to check your schedule or set up a meeting?";
      } else {
        response = "Hey! What do you need?";
      }
    }
    // Check schedule
    else if (lastMessage.includes('what') && (lastMessage.includes('schedule') || lastMessage.includes('today') || lastMessage.includes('meetings'))) {
      response = `Let me check for you, Boss... [ACTION:CHECK_SCHEDULE]`;
    }
    // Create meeting intent
    else if (lastMessage.includes('schedule') || lastMessage.includes('set up') || lastMessage.includes('book')) {
      const nameMatch = lastMessage.match(/with\s+(\w+)/i);
      if (nameMatch) {
        response = `Sure thing, Boss! When would you like to meet with ${nameMatch[1]}?`;
      } else {
        response = "Of course! Who would you like to meet with?";
      }
    }
    // Cancel meeting
    else if (lastMessage.includes('cancel')) {
      const timeMatch = lastMessage.match(/(\d+)\s*(am|pm)?/i);
      if (timeMatch) {
        response = `You got it, Boss. I'll cancel your ${timeMatch[0]} meeting. [ACTION:CANCEL_PENDING]`;
      } else {
        response = "Which meeting should I cancel? You can tell me the time or the person's name.";
      }
    }
    // Reschedule
    else if (lastMessage.includes('move') || lastMessage.includes('reschedule') || lastMessage.includes('change')) {
      response = "Sure, Boss! Which meeting do you want to reschedule, and what's the new time?";
    }
    // Default helpful response
    else {
      response = "I'm here to help, Boss! I can check your schedule, set up meetings, cancel or reschedule them. What do you need?";
    }

    return NextResponse.json({ 
      response,
      success: true 
    });

  } catch (error) {
    console.error('Conversation AI error:', error);
    return NextResponse.json({ 
      error: 'Failed to process conversation',
      response: "Sorry Boss, I had a hiccup there. Can you say that again?"
    }, { status: 500 });
  }
}
