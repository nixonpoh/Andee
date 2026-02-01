'use client';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>✅</div>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '10px',
          fontWeight: 'bold'
        }}>
          Andee is Running!
        </h1>
        <p style={{
          color: '#94a3b8',
          marginBottom: '30px'
        }}>
          If you can see this, your Next.js deployment is working.
        </p>
        
        <div style={{
          background: '#1e293b',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'left',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#10b981' }}>
            ✓ Deployment Status: WORKING
          </h2>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Your Vercel deployment is successful. This confirms:
          </p>
          <ul style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.8', marginTop: '10px' }}>
            <li>✓ Files are on GitHub</li>
            <li>✓ Vercel is building correctly</li>
            <li>✓ Next.js is running</li>
          </ul>
        </div>

        <div style={{
          background: '#1e3a8a',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          <strong>Next step:</strong> Now we can add back the Google Calendar features one by one.
        </div>

        <p style={{ fontSize: '12px', color: '#64748b' }}>
          Version: Minimal Test Build • {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
