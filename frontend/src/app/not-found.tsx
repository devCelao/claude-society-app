import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">404 — Pagina não encontrada</h2>
      <p className="text-muted-foreground">A página que você está procurando não existe.</p>
      <Link
        href="/dashboard"
        className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
