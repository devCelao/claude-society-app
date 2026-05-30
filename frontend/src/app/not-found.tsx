import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">404 — Pagina nao encontrada</h2>
      <p className="text-muted-foreground">A pagina que voce esta procurando nao existe.</p>
      <Link
        href="/dashboard"
        className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  )
}
