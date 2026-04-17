import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getAdminStatus } from '@/lib/google-directory';

const ALLOWED_DOMAINS: string[] = [
  'rhei.com',
  'bbtv.com',
  'broadbandtvcorp.com',
  'bbtvholdingsinc.com',
  'canaracorp.com',
  'c.bbtv.com',
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          hd: 'rhei.com',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const domain = user.email.split('@')[1]?.toLowerCase();
      return ALLOWED_DOMAINS.includes(domain);
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, determine role from Google Directory
      if (account && user?.email) {
        const { isAdmin, isDelegatedAdmin } = await getAdminStatus(user.email);
        if (isAdmin) {
          token.role = 'superadmin';
        } else if (isDelegatedAdmin) {
          token.role = 'admin';
        } else {
          token.role = 'user';
        }
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as 'user' | 'admin' | 'superadmin') || 'user';
        session.user.email = token.email || session.user.email;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
