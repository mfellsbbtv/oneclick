import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: [
    '/quick-provision/:path*',
    '/terminate/:path*',
    '/users/:path*',
    '/schedules/:path*',
    '/requests/:path*',
    '/admin/:path*',
    '/api/directory/:path*',
    '/api/provision-n8n/:path*',
    '/api/terminate-n8n/:path*',
    '/api/scheduler/:path*',
    '/api/change-requests/:path*',
  ],
};
