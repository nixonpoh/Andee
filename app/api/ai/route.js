import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'working',
    message: 'AI API route is accessible!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  return NextResponse.json({
    status: 'working',
    message: 'AI API POST endpoint is working!',
    receivedData: true
  });
}
