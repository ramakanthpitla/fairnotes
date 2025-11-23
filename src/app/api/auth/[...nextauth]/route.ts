import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        console.log('[NextAuth] Redirect callback:', { url, baseUrl });
        // Allow relative callback URLs
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        const target = new URL(url);
        const base = new URL(baseUrl);
        // Only allow same-origin redirects
        if (target.origin === base.origin) return url;
      } catch (error) {
        console.error('[NextAuth] Redirect error:', error);
      }
      return baseUrl;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) || 'USER';
      }
      return session;
    },
    async jwt({ token, user, account, profile }: { token: JWT; user?: any; account?: any; profile?: any }) {
      try {
        console.log('[NextAuth] JWT callback triggered:', {
          hasUser: !!user,
          hasAccount: !!account,
          tokenSub: token.sub,
          tokenRole: token.role
        });

        // First time JWT is created (user just signed in)
        if (user) {
          console.log('[NextAuth] New user sign in, user object:', { id: user.id, email: user.email });
          token.role = user.role || 'USER';
        }

        // On subsequent requests, load role from DB if missing
        if (!token.role && token.sub) {
          console.log('[NextAuth] Loading role from DB for user:', token.sub);
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
          });
          token.role = dbUser?.role || 'USER';
          console.log('[NextAuth] Loaded role:', token.role);
        }

        // Fallback: ensure role exists
        if (!token.role) {
          console.log('[NextAuth] No role found, defaulting to USER');
          token.role = 'USER';
        }
      } catch (error) {
        console.error('[NextAuth] JWT callback error:', error);
        token.role = 'USER';
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
