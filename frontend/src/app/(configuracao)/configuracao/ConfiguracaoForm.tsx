'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarRange, Save, Trash2 } from 'lucide-react'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { Button } from '@/components/ui/button'

interface Props {
  corteInicioInicial: string | null
  corteFimInicial: string | null
}

export function ConfiguracaoForm({ corteInicioInicial, corteFimInicial }: Props) {
  const router = useRouter()
  const [corteInicio, setCorteInicio] = useState(corteInicioInicial ?? '')
  const [corteFim, setCorteFim] = useState(corteFimInicial ?? '')
  const [salvando, setSalvando] = useState(false)

  const temAlteracao =
    corteInicio !== (corteInicioInicial ?? '') ||
    corteFim !== (corteFimInicial ?? '')
  const temConfig = !!(corteInicioInicial || corteFimInicial)

  async function handleSalvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/configuracao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corteInicio: corteInicio || null,
          corteFim: corteFim || null,
        }),
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
        body: JSON.stringify({ corteInicio: null, corteFim: null }),
      })
      if (!res.ok) return
      setCorteInicio('')
      setCorteFim('')
      toast.success('Datas de corte removidas')
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
              Data de Corte
            </div>
            <div className="font-barlow-condensed text-xs text-muted-foreground">
              Define o período do ciclo para novos confrontos
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground block mb-1.5">
              Início do período
            </label>
            <DatePickerField
              value={corteInicio}
              onChange={setCorteInicio}
              placeholder="Sem data de início"
            />
          </div>
          <div>
            <label className="font-barlow-condensed text-xs tracking-widest uppercase text-muted-foreground block mb-1.5">
              Fim do período
            </label>
            <DatePickerField
              value={corteFim}
              onChange={setCorteFim}
              placeholder="Sem data de fim"
            />
          </div>
        </div>

        <p
          className="font-barlow-condensed text-xs leading-relaxed"
          style={{ color: '#555' }}
        >
          Ao iniciar um confronto, o sistema vincula automaticamente ao ciclo deste período.
          Sem data configurada, o ciclo é criado com início na data atual.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleSalvar}
            disabled={salvando || !temAlteracao}
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
              Limpar datas
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
