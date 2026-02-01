# 🎯 Andee - Your Real-Time Meeting Guardian

A voice-first meeting conflict management system for contractors and field workers.

## Features

- ✅ Real-time meeting monitoring
- ✅ Voice alerts when conflicts detected
- ✅ Voice command processing (Yes/No/Push/Cancel)
- ✅ Automatic calendar rescheduling
- ✅ Client notifications (SMS simulation in demo)
- ✅ Clean, professional interface

## Demo Mode

This version uses simulated meetings. Try these voice commands:
- "Yes" - Confirm you can make it
- "No" - Trigger reschedule flow
- "Push by 15 minutes" - Delay and notify
- "Cancel" - Cancel the meeting

## Tech Stack

- Next.js 14
- React
- Tailwind CSS
- Web Speech API
- Lucide React Icons

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for step-by-step instructions.

## Roadmap

- [ ] Google Calendar API integration
- [ ] Twilio SMS integration
- [ ] Travel time calculation (Google Maps API)
- [ ] Background monitoring (PWA)
- [ ] Multi-calendar support
