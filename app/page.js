'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Calendar, Clock, MapPin, Phone, AlertCircle, CheckCircle, XCircle, LogIn, LogOut, MessageCircle, Sparkles } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';

const TRAVEL_TIME_MINUTES = 25;
const WARNING_BUFFER_MINUTES = 5;

export default function Andee() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [alertActive, setAlertActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        setSpeechSupported(true);
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          handleUserMessage(transcript);
          setListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setListening(false);
        };

        recognitionRef.current.onend = () => {
          setListening(false);
        };
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchCalendarEvents();
      const interval = setInterval(fetchCalendarEvents, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    if (meetings.length > 0 && !alertActive) {
      const interval = setInterval(() => {
        checkMeetingConflict();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [meetings, alertActive]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar');
      if (response.ok) {
        const data = await response.json();
        const transformedMeetings = data.events.map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Meeting',
          location: event.location || 'No location specified',
          startTime: new Date(event.start.dateTime || event.start.date),
          endTime: new Date(event.end.dateTime || event.end.date),
          clientName: extractClientName(event),
          clientPhone: extractClientPhone(event),
          description: event.description || ''
        }));
        setMeetings(transformedMeetings);
        addNotification('Calendar synced', 'success');
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractClientName = (event) => {
    if (event.attendees && event.attendees.length > 0) {
      return event.attendees[0].displayName || event.attendees[0].email?.split('@')[0] || 'Client';
    }
    const match = event.summary?.match(/with (.+?)(?:\s-|\s@|$)/i);
    return match ? match[1] : 'Client';
  };

  const extractClientPhone = (event) => {
    if (event.description) {
      const phoneMatch = event.description.match(/(?:phone|tel|mobile):\s*(\+?\d[\d\s-()]+)/i);
      if (phoneMatch) return phoneMatch[1].replace(/\s/g, '');
    }
    return null;
  };

  const checkMeetingConflict = () => {
    const now = new Date();
    const sortedMeetings = [...meetings].sort((a, b) => a.startTime - b.startTime);
    
    const current = sortedMeetings.find(m => m.startTime <= now && m.endTime > now);
    const next = sortedMeetings.find(m => m.startTime > now);
    
    setCurrentMeeting(current);
    setNextMeeting(next);
    
    if (current && next && !alertActive) {
      const timeUntilNext = (next.startTime - now) / 60000;
      const totalTimeNeeded = TRAVEL_TIME_MINUTES + WARNING_BUFFER_MINUTES;
      
      if (timeUntilNext <= totalTimeNeeded && timeUntilNext > 0) {
        triggerAlert(next, timeUntilNext);
      }
    }
  };

  const triggerAlert = (meeting, minutesUntil) => {
    setAlertActive(true);
    const message = `Hey Boss! Just a heads up - you have a meeting with ${meeting.clientName} in ${Math.round(minutesUntil)} minutes, and travel time is about ${TRAVEL_TIME_MINUTES} minutes. Can you make it?`;
    
    addToConversation('Andee', message);
    speak(message, () => {
      startListening();
    });
  };

  const startConversation = () => {
    if (!conversationStarted) {
      setConversationStarted(true);
      const greeting = "Hi Boss! How can I help you today?";
      addToConversation('Andee', greeting);
      speak(greeting, () => {
        startListening();
      });
    } else {
      startListening();
    }
  };

  const handleUserMessage = async (message) => {
    addToConversation('You', message);
    setIsProcessing(true);

    try {
      // Build context
      const meetingsContext = {
        upcomingMeetings: meetings.slice(0, 5).map(m => ({
          id: m.id,
          title: m.title,
          clientName: m.clientName,
          startTime: m.startTime,
          location: m.location
        })),
        currentMeeting: currentMeeting ? {
          title: currentMeeting.title,
          endTime: currentMeeting.endTime
        } : null
      };

      // Send to Gemini AI
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationRef.current,
          meetingsContext
        })
      });

      const data = await response.json();
      let aiResponse = data.response;

      // Check for and execute actions
      const actionExecuted = await executeActions(aiResponse);
      
      // Remove action markers from display
      const cleanResponse = aiResponse.replace(/\[ACTION:.*?\]/g, '').trim();
      
      addToConversation('Andee', cleanResponse);
      speak(cleanResponse, () => {
        // Continue listening if not closing statement
        if (!cleanResponse.toLowerCase().includes('anything else') && 
            !cleanResponse.toLowerCase().includes("that's all")) {
          setTimeout(() => startListening(), 500);
        }
      });

    } catch (error) {
      console.error('Conversation error:', error);
      const errorMsg = "Sorry Boss, I had a hiccup there. Can you say that again?";
      addToConversation('Andee', errorMsg);
      speak(errorMsg, () => {
        setTimeout(() => startListening(), 500);
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeActions = async (response) => {
    // Check schedule
    if (response.includes('[ACTION:CHECK_SCHEDULE]')) {
      // Calendar info already in context, AI will speak it
      return true;
    }

    // Create meeting
    const createMatch = response.match(/\[ACTION:CREATE_MEETING\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\]/);
    if (createMatch) {
      const [, title, date, time, duration] = createMatch;
      await createMeeting(title, date, time, parseInt(duration));
      return true;
    }

    // Cancel meeting
    const cancelMatch = response.match(/\[ACTION:CANCEL_MEETING\|([^\]]+)\]/);
    if (cancelMatch) {
      const identifier = cancelMatch[1];
      await cancelMeetingByIdentifier(identifier);
      return true;
    }

    // Reschedule meeting
    const rescheduleMatch = response.match(/\[ACTION:RESCHEDULE_MEETING\|([^|]+)\|([^\]]+)\]/);
    if (rescheduleMatch) {
      const [, identifier, newTime] = rescheduleMatch;
      await rescheduleMeetingByIdentifier(identifier, newTime);
      return true;
    }

    return false;
  };

  const createMeeting = async (title, dateStr, timeStr, duration) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hour, minute);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const response = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: '',
          description: ''
        })
      });

      if (response.ok) {
        addNotification(`Meeting created: ${title}`, 'success');
        await fetchCalendarEvents();
      }
    } catch (error) {
      console.error('Create meeting error:', error);
      addNotification('Failed to create meeting', 'error');
    }
  };

  const cancelMeetingByIdentifier = async (identifier) => {
    const meeting = findMeetingByIdentifier(identifier);
    if (!meeting) {
      addNotification('Meeting not found', 'error');
      return;
    }

    try {
      const response = await fetch('/api/calendar/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: meeting.id })
      });

      if (response.ok) {
        setMeetings(prev => prev.filter(m => m.id !== meeting.id));
        addNotification(`Cancelled: ${meeting.title}`, 'warning');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      addNotification('Failed to cancel meeting', 'error');
    }
  };

  const rescheduleMeetingByIdentifier = async (identifier, newTimeStr) => {
    const meeting = findMeetingByIdentifier(identifier);
    if (!meeting) {
      addNotification('Meeting not found', 'error');
      return;
    }

    try {
      const [newHour, newMinute] = newTimeStr.split(':').map(Number);
      const oldTime = meeting.startTime;
      const delayMinutes = (newHour * 60 + newMinute) - (oldTime.getHours() * 60 + oldTime.getMinutes());

      const response = await fetch('/api/calendar/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: meeting.id,
          delayMinutes
        })
      });

      if (response.ok) {
        const newStart = new Date(meeting.startTime.getTime() + delayMinutes * 60000);
        const newEnd = new Date(meeting.endTime.getTime() + delayMinutes * 60000);
        
        setMeetings(prev => prev.map(m => 
          m.id === meeting.id 
            ? { ...m, startTime: newStart, endTime: newEnd }
            : m
        ));
        addNotification(`Rescheduled to ${newTimeStr}`, 'success');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      addNotification('Failed to reschedule', 'error');
    }
  };

  const findMeetingByIdentifier = (identifier) => {
    // Try to find by time (e.g., "3pm", "15:00")
    const timeMatch = identifier.match(/(\d+)\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const isPM = timeMatch[2]?.toLowerCase() === 'pm';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      return meetings.find(m => m.startTime.getHours() === hour);
    }

    // Try to find by name
    const lowerIdentifier = identifier.toLowerCase();
    return meetings.find(m => 
      m.clientName.toLowerCase().includes(lowerIdentifier) ||
      m.title.toLowerCase().includes(lowerIdentifier)
    );
  };

  const addToConversation = (sender, message) => {
    const entry = { sender, message, timestamp: new Date() };
    setConversation(prev => [...prev, entry]);
    conversationRef.current = [
      ...conversationRef.current,
      { role: sender === 'You' ? 'user' : 'assistant', content: message }
    ];
  };

  const speak = (text, onEnd) => {
    if (!synthRef.current) return;
    
    const cleanText = text.replace(/\[ACTION:.*?\]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (onEnd) {
      utterance.onend = onEnd;
    }
    
    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setListening(false);
      }
    }
  };

  const addNotification = (message, type) => {
    setNotifications(prev => [{
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    }, ...prev].slice(0, 5));
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMinutesUntil = (date) => {
    return Math.round((date - new Date()) / 60000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto mb-6">
            <Sparkles className="w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black mb-4">Andee</h1>
          <p className="text-slate-400 text-lg mb-2">AI-Powered Assistant</p>
          <p className="text-slate-500 text-sm mb-8">Powered by Google Gemini AI</p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all duration-300 hover:scale-105 shadow-xl mx-auto"
          >
            <LogIn className="w-6 h-6" />
            Connect Google Calendar
          </button>
        </div>
      </div>
    );
  }

  if (!speechSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Browser Not Supported</h2>
          <p className="text-slate-300 mb-6">
            Andee requires Chrome, Edge, or Safari for voice features.
          </p>
          <button onClick={() => signOut()} className="text-slate-400 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:"url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')"}}></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Andee</h1>
              <p className="text-slate-400 text-sm">Gemini AI • {session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversation Panel */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/30">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                  Conversation with Andee
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {conversationStarted ? 'Powered by Google Gemini AI' : 'Tap mic to start'}
                </p>
              </div>

              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {conversation.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Mic className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500">Tap the microphone to start</p>
                      <p className="text-sm text-slate-600 mt-2">Andee will say "Hi Boss!"</p>
                    </div>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.sender === 'You' 
                          ? 'bg-emerald-500/20 border border-emerald-500/30' 
                          : 'bg-slate-700/50 border border-slate-600/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">{msg.sender}</span>
                          <span className="text-xs text-slate-500">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-200">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-slate-700/30 bg-slate-800/50">
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={startConversation}
                    disabled={listening || isProcessing}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                      listening 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Mic className={`w-10 h-10 ${listening ? 'animate-pulse' : ''}`} />
                  </button>
                  <div className="text-left">
                    <p className="text-lg font-semibold text-slate-200">
                      {listening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Tap to talk'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {isProcessing ? 'Gemini AI processing...' : 'Natural conversation'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-emerald-400">Now</h3>
              </div>
              {currentMeeting ? (
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white">{currentMeeting.title}</div>
                  <div className="text-sm text-slate-400">{currentMeeting.clientName}</div>
                  <div className="text-xs text-slate-500">Ends {formatTime(currentMeeting.endTime)}</div>
                </div>
              ) : (
                <div className="text-slate-500 italic text-sm">No active meeting</div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-blue-400">Next</h3>
              </div>
              {nextMeeting ? (
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white">{nextMeeting.title}</div>
                  <div className="text-sm text-slate-400">{nextMeeting.clientName}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500">{formatTime(nextMeeting.startTime)}</div>
                    <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-300">
                      {getMinutesUntil(nextMeeting.startTime)}m
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic text-sm">No upcoming meetings</div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h3 className="text-sm font-bold text-slate-400 mb-3">Today</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Meetings</span>
                  <span className="text-white font-bold">
                    {meetings.filter(m => m.startTime.toDateString() === new Date().toDateString()).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Total</span>
                  <span className="text-white font-bold">{meetings.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-4 overflow-x-auto">
              {notifications.map(notif => (
                <div key={notif.id} className="flex items-center gap-2 px-4 py-2 bg-slate-700/30 rounded-lg border border-slate-600/20 whitespace-nowrap">
                  {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-orange-400" />}
                  {notif.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="text-sm text-slate-300">{notif.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
