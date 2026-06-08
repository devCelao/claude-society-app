import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuário', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.usuario.findUnique({
          where: { username: credentials.username.toUpperCase() },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return { id: String(user.id), name: user.name, email: user.username }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.name = user.name
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.name = token.name as string
      return session
    },
  },
}
