import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: { //The authorized callback is used to verify if the request is authorized to access a page via Next.js Middleware.
        authorized({ auth, request: { nextUrl } }) { // auth = user session, request = incoming request object, nextUrl = URL object
        const isLoggedIn = !!auth?.user; // obtenir un boolean basé sur l'existence de auth?.user (ici: isLoggedIn sera true si auth?.user existe, et false s'il est undefined)
        const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
        if (isOnDashboard) {
            if (isLoggedIn) return true;
            return false; // Redirect unauthenticated users to login page
        } else if (isLoggedIn) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
        },
    },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;