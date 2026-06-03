import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-8 space-y-8"
        style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}
      >
        <div className="text-center space-y-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: '#f5c400', boxShadow: '0 0 0 3px #1a1600' }}
          >
            🦍
          </div>
          <h1 className="font-bebas text-3xl text-gold tracking-widest">CONFRA MONSTRA</h1>
          <p className="font-barlow-condensed text-xs text-muted-foreground tracking-widest uppercase">
            PEL@D4 · SOCCER
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
