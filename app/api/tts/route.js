import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      return NextResponse.json({ 
        error: 'Google Cloud API key not configured'
      }, { status: 500 });
    }

    console.log('Converting text to speech:', text.substring(0, 50) + '...');

    // Google Cloud Text-to-Speech endpoint
    const endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';

    const response = await fetch(`${endpoint}?key=${process.env.GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-J', // Natural, friendly male voice
          // Alternative voices:
          // 'en-US-Neural2-C' - Female, warm and friendly
          // 'en-US-Neural2-A' - Male, professional
          // 'en-US-Neural2-F' - Female, upbeat
          // 'en-US-Wavenet-D' - Male, conversational
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,  // Normal speed
          pitch: 0.0,         // Normal pitch
          volumeGainDb: 0.0,  // Normal volume
          effectsProfileId: ['headphone-class-device'] // Optimized for headphones
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API error:', errorText);
      throw new Error(`TTS failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Return base64 audio
    return NextResponse.json({ 
      audioContent: data.audioContent, // Base64 encoded MP3
      success: true
    });

  } catch (error) {
    console.error('Text-to-Speech error:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}
