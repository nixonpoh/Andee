'use client';

export default function DebugPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#10b981', marginBottom: '20px' }}>🔍 Andee Debug Page</h1>
      
      <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: '#60a5fa' }}>✅ This page is working!</h2>
        <p>If you can see this, your Next.js app is running.</p>
      </div>

      <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#fbbf24' }}>🧪 Test Checklist:</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>✅ Main page loads (you're here!)</li>
          <li>❓ Check auth: <a href="/api/auth/signin" style={{ color: '#60a5fa' }}>/api/auth/signin</a></li>
          <li>❓ Check AI route: <a href="/api/ai-test" style={{ color: '#60a5fa' }}>/api/ai-test</a></li>
        </ol>
      </div>

      <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#f87171' }}>📂 File Structure Check:</h3>
        <pre style={{ background: '#1a1a1a', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`app/
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.js  ← Should exist
│   ├── ai/
│   │   └── route.js  ← Did you create this?
│   └── calendar/
│       └── route.js  ← Should exist
├── layout.js
└── page.js  ← You're seeing this one`}
        </pre>
      </div>

      <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ color: '#a78bfa' }}>🔧 Next Steps:</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Click the auth link above - should NOT give 404</li>
          <li>If auth works but you get 404 on main app, the page.js has an error</li>
          <li>Check Vercel deployment logs for errors</li>
          <li>Make sure you pushed ALL files to GitHub</li>
        </ol>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#1e3a8a', borderRadius: '8px' }}>
        <p style={{ margin: 0 }}>
          <strong>Tell me what happens when you click the links above!</strong>
        </p>
      </div>
    </div>
  );
}
