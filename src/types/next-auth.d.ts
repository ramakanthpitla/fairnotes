import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'USER';
    } & DefaultSession['user'];
  }

  /**
   * Extend the built-in user types
   */
  interface User {
    role: 'ADMIN' | 'USER';
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the built-in JWT types
   */
  interface JWT {
    role?: 'ADMIN' | 'USER';
  }
}
