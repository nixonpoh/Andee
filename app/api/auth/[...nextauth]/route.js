import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // ← ADD THIS LINE - Critical for Vercel
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**The key change:** Added `trustHost: true` to the authOptions.

**Also verify your Vercel Environment Variables:**

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Make sure these are set for **Production, Preview, and Development**:
```
NEXTAUTH_URL=https://andee-ruby.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**And in Google Cloud Console:**

Make sure these redirect URIs are registered:
```
https://andee-ruby.vercel.app/api/auth/callback/google
https://localhost:3000/api/auth/callback/google