'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarRange, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  diaDeCorteInicial: number | null
}

export function ConfiguracaoForm({ diaDeCorteInicial }: Props) {
  const router = useRouter()
  const [valor, setValor] = useState(diaDeCorteInicial != null ? String(diaDeCorteInicial) : '')
  const [salvando, setSalvando] = useState(false)

  const numerico = valor === '' ? null : parseInt(valor, 10)
  const invalido = valor !== '' && (isNaN(numerico!) || numerico! < 1 || numerico! > 31)
  const temAlteracao = numerico !== diaDeCorteInicial
  const temConfig = diaDeCorteInicial != null

  async function handleSalvar() {
    if (invalido) return
    setSalvando(true)
    try {
      const res = await fetch('/api/configuracao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaDeCorte: numerico }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao salvar configuração')
        return
      }
      toast.success('Configuração salva')
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  async function handleLimpar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/configuracao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaDeCorte: null }),
      })
      if (!res.ok) return
      setValor('')
      toast.success('Dia de corte removido')
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <div className="w-8 h-[3px] rounded-sm mb-2" style={{ background: '#f5c400' }} />
        <h1 className="font-bebas text-4xl md:text-5xl tracking-widest leading-none">
          CONFIGURAÇÕES
        </h1>
        <p className="font-barlow-condensed text-sm text-muted-foreground mt-1.5 tracking-wide">
          Ajustes gerais do sistema
        </p>
      </div>

      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: '#242424', background: '#111111' }}
      >
        <div className="flex items-center gap-2.5">
          <CalendarRange size={16} style={{ color: '#f5c400' }} />
          <div>
            <div className="font-barlow-condensed text-sm font-semibold tracking-wide text-foreground">
              Dia de Corte Padrão
            </div>
            <div className="font-barlow-condensed text-xs text-muted-foreground">
              Dia do mês em que cada ciclo começa (1–31)
            </div>
          </div>
        </div>

        <div className="max-w-[160px]">
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 15"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {invalido && (
            <p className="text-sm text-destructive mt-1 font-barlow-condensed">
              Informe um dia entre 1 e 31
            </p>
          )}
        </div>

        <p
          className="font-barlow-condensed text-xs leading-relaxed"
          style={{ color: '#555' }}
        >
          Ao iniciar um confronto, o sistema vincula automaticamente ao ciclo do período atual.
          Sem dia configurado, o ciclo é criado com início na data atual.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleSalvar}
            disabled={salvando || !temAlteracao || invalido}
            className="font-barlow-condensed tracking-wide gap-1.5 disabled:opacity-40"
            style={{ background: '#f5c400', color: '#000' }}
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>

          {temConfig && (
            <Button
              variant="ghost"
              onClick={handleLimpar}
              disabled={salvando}
              className="font-barlow-condensed tracking-wide gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={13} />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
