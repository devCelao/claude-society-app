import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PerfilForm } from '@/components/auth/PerfilForm'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const usuario = await prisma.usuario.findUnique({
    where: { username: session.user.email! },
    select: { name: true },
  })
  if (!usuario) redirect('/login')

  return (
    <div className="max-w-sm space-y-8">
      <div>
        <h1 className="font-bebas text-3xl text-gold tracking-widest">MEU PERFIL</h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground tracking-wide mt-1">
          Altere seu nome ou senha de acesso
        </p>
      </div>

      <PerfilForm nome={usuario.name} />
    </div>
  )
}
