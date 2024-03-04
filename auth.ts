import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import credentials from 'next-auth/providers/credentials'; // *
import { z } from "zod"
import { sql } from '@vercel/postgres';
import { User } from './app/lib/definitions';
import bcrypt from 'bcrypt';

// * The Credentials provider allows you to handle signing in with arbitrary credentials
// * such as a username and password, domain, or two factor authentication or hardware device
 
async function getUser(email: string): Promise<User | undefined> { // fetch user
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
        return user.rows[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [credentials({
        async authorize(credentials) { // async function to verify credentials
            const parsedCredentials = z.object({ // zod schema to check validate credentials format
                email: z.string().email(),
                password: z.string().min(6),
            }).safeParse(credentials)

            if (parsedCredentials.success) { // if credentials are valid format
                const { email, password } = parsedCredentials.data;
                const user = await getUser(email); // fetch user
                if (!user) return null;
                const passwordsMatch = await bcrypt.compare(password, user.password); // compare password against db hashed password

                if (passwordsMatch) return user;
            }

            console.log('Invalid credentials');
            return null; // return null if credentials are invalid
        },
    })]
});