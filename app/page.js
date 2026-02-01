'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Calendar, Clock, MapPin, Phone, AlertCircle, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react';
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
  const [userResponse, setUserResponse] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

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
          const transcript = event.results[0][0].transcript.toLowerCase();
          setUserResponse(transcript);
          handleVoiceResponse(transcript);
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
    if (meetings.length > 0) {
      const interval = setInterval(() => {
        checkMeetingConflict();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [meetings]);

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
        addNotification('Calendar synced successfully', 'success');
      } else {
        addNotification('Failed to fetch calendar events', 'error');
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
      addNotification('Error connecting to calendar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractClientName = (event) => {
    if (event.attendees && event.attendees.length > 0) {
      const attendee = event.attendees[0];
      return attendee.displayName || attendee.email?.split('@')[0] || 'Client';
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
    
    const current = sortedMeetings.find(m => 
      m.startTime <= now && m.endTime > now
    );
    
    const next = sortedMeetings.find(m => m.startTime > now);
    
    setCurrentMeeting(current);
    setNextMeeting(next);
    
    if (current && next) {
      const timeUntilNext = (next.startTime - now) / 60000;
      const totalTimeNeeded = TRAVEL_TIME_MINUTES + WARNING_BUFFER_MINUTES;
      
      if (timeUntilNext <= totalTimeNeeded && timeUntilNext > 0 && !alertActive) {
        triggerAlert(next, timeUntilNext);
      }
    }
  };

  const triggerAlert = (meeting, minutesUntil) => {
    setAlertActive(true);
    const message = `Warning! You have a meeting with ${meeting.clientName} in ${Math.round(minutesUntil)} minutes. Travel time is ${TRAVEL_TIME_MINUTES} minutes. Can you make it on time?`;
    speak(message, () => {
      startListening();
    });
  };

  const speak = (text, onEnd) => {
    if (!synthRef.current) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (onEnd) {
      utterance.onend = onEnd;
    }
    
    synthRef.current.cancel();
    synthRef.current.speak(utterance);
    setSystemMessage(text);
  };

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      setUserResponse('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setListening(false);
      }
    }
  };

  const handleVoiceResponse = async (response) => {
    setIsProcessing(true);
    
    if (response.includes('yes') || response.includes('yeah') || response.includes('yep')) {
      speak("Great! I'll keep monitoring your schedule.");
      setAlertActive(false);
      addNotification('User confirmed they can make it on time', 'success');
    } 
    else if (response.includes('no') || response.includes('nope') || response.includes("can't")) {
      speak("Understood. Would you like to reschedule or cancel the meeting?", () => {
        setTimeout(() => startListening(), 500);
      });
      addNotification('User cannot make the meeting', 'warning');
    }
    else if (response.includes('push') || response.includes('delay') || response.includes('reschedule')) {
      const delayMatch = response.match(/(\d+)/);
      const delayMinutes = delayMatch ? parseInt(delayMatch[1]) : 15;
      await handleReschedule(delayMinutes);
    }
    else if (response.includes('cancel')) {
      await handleCancel();
    }
    else {
      speak("I didn't catch that. Please say yes, no, or push by a specific time.");
      setTimeout(() => startListening(), 1000);
    }
    
    setIsProcessing(false);
  };

  const handleReschedule = async (delayMinutes) => {
    if (!nextMeeting) return;
    
    try {
      const response = await fetch('/api/calendar/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: nextMeeting.id,
          delayMinutes
        })
      });

      if (response.ok) {
        const newStartTime = new Date(nextMeeting.startTime.getTime() + delayMinutes * 60000);
        const newEndTime = new Date(nextMeeting.endTime.getTime() + delayMinutes * 60000);
        
        setMeetings(prev => prev.map(m => 
          m.id === nextMeeting.id 
            ? { ...m, startTime: newStartTime, endTime: newEndTime }
            : m
        ));

        if (nextMeeting.clientPhone) {
          await sendSMS(nextMeeting.clientPhone, 
            `Hi ${nextMeeting.clientName}, I'm running behind schedule. I'll be arriving approximately ${delayMinutes} minutes late. Sorry for the inconvenience!`
          );
        }

        speak(`Meeting rescheduled. I've updated your calendar${nextMeeting.clientPhone ? ` and notified ${nextMeeting.clientName}` : ''}.`);
        setAlertActive(false);
        addNotification(`Meeting pushed ${delayMinutes} minutes${nextMeeting.clientPhone ? ', client notified' : ''}`, 'success');
      } else {
        throw new Error('Failed to reschedule');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      addNotification('Failed to reschedule meeting', 'error');
      speak('Sorry, I encountered an error rescheduling the meeting.');
    }
  };

  const handleCancel = async () => {
    if (!nextMeeting) return;
    
    try {
      const response = await fetch('/api/calendar/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: nextMeeting.id })
      });

      if (response.ok) {
        if (nextMeeting.clientPhone) {
          await sendSMS(nextMeeting.clientPhone,
            `Hi ${nextMeeting.clientName}, I need to cancel our meeting today. I'll reach out to reschedule. Apologies for the short notice.`
          );
        }

        setMeetings(prev => prev.filter(m => m.id !== nextMeeting.id));
        speak(`Meeting cancelled.${nextMeeting.clientPhone ? ` I've notified ${nextMeeting.clientName}.` : ''}`);
        setAlertActive(false);
        addNotification(`Meeting cancelled${nextMeeting.clientPhone ? ', client notified' : ''}`, 'warning');
      } else {
        throw new Error('Failed to cancel');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      addNotification('Failed to cancel meeting', 'error');
      speak('Sorry, I encountered an error cancelling the meeting.');
    }
  };

  const sendSMS = async (phone, message) => {
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message })
      });
      return response.ok;
    } catch (error) {
      console.error('SMS error:', error);
      return false;
    }
  };

  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 5));
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
            <AlertCircle className="w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black mb-4">Andee</h1>
          <p className="text-slate-400 text-lg mb-8">Your Real-Time Meeting Guardian</p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all duration-300 hover:scale-105 shadow-xl mx-auto"
          >
            <LogIn className="w-6 h-6" />
            Connect Google Calendar
          </button>
          <p className="text-sm text-slate-500 mt-6">
            Andee monitors your calendar and alerts you before conflicts happen
          </p>
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
            Andee requires a browser with Web Speech API support. Please use Chrome, Edge, or Safari.
          </p>
          <button
            onClick={() => signOut()}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Andee</h1>
              <p className="text-slate-400 text-sm">Monitoring {session.user.email}</p>
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

        {alertActive && (
          <div className="mb-8 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-2xl p-6 backdrop-blur-sm animate-pulse">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-300 mb-2">⚠️ Conflict Detected</h3>
                <p className="text-slate-200 mb-4">{systemMessage}</p>
                {listening && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Mic className="w-5 h-5 animate-pulse" />
                    <span className="font-semibold">Listening...</span>
                  </div>
                )}
                {userResponse && (
                  <div className="mt-3 text-sm text-slate-300">
                    You said: <span className="font-semibold text-emerald-400">"{userResponse}"</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-emerald-400">Current Meeting</h3>
            </div>
            {currentMeeting ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xl font-bold text-white mb-1">{currentMeeting.title}</div>
                  <div className="text-sm text-slate-400">{currentMeeting.clientName}</div>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-slate-500" />
                  <span className="text-sm">{currentMeeting.location}</span>
                </div>
                <div className="text-sm text-slate-400">
                  Ends at {formatTime(currentMeeting.endTime)}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">No active meeting</div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-blue-400">Next Meeting</h3>
            </div>
            {nextMeeting ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xl font-bold text-white mb-1">{nextMeeting.title}</div>
                  <div className="text-sm text-slate-400">{nextMeeting.clientName}</div>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-slate-500" />
                  <span className="text-sm">{nextMeeting.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Starts at {formatTime(nextMeeting.startTime)}
                  </div>
                  <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-300">
                    in {getMinutesUntil(nextMeeting.startTime)} min
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">No upcoming meetings</div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 shadow-xl mb-8">
          <h3 className="text-lg font-bold mb-4 text-center">Voice Control</h3>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startListening}
              disabled={listening || isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                listening 
                  ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Mic className={`w-10 h-10 ${listening ? 'animate-pulse' : ''}`} />
            </button>
            <p className="text-sm text-slate-400 text-center">
              {listening ? 'Listening...' : 'Tap to speak'}
            </p>
            {systemMessage && !alertActive && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/30 max-w-md">
                <p className="text-sm text-slate-300 text-center italic">"{systemMessage}"</p>
              </div>
            )}
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30 shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-slate-400" />
              Recent Actions
            </h3>
            <div className="space-y-2">
              {notifications.map(notif => (
                <div 
                  key={notif.id}
                  className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/20"
                >
                  {notif.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
                  {notif.type === 'warning' && <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />}
                  {notif.type === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {notif.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between p-4 bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/20">
          <p className="text-sm text-slate-400">
            {loading ? 'Syncing calendar...' : `${meetings.length} meetings loaded`}
          </p>
          <button
            onClick={fetchCalendarEvents}
            disabled={loading}
            className="text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            {loading ? 'Syncing...' : 'Refresh Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
}
