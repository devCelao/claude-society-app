'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { X, Pencil, Plus, Check, Loader2, Undo2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getCorTime, COR_NEUTRA } from '@/lib/cores-time'

type JogadorMin = { id: number; nome: string }
type TimeMin = { id?: number; nome: string; cor: string; jogadores: JogadorMin[] }
type PartidaMin = { id: number }

type GolAudit = {
  id: number
  timeId: number
  jogador: { id: number; nome: string }
  golContra: boolean
  assistencia: { id: number; jogador: { id: number; nome: string } } | null
}

type PartidaAuditData = {
  id: number
  timeAId: number
  timeBId: number
  vencedorId: number | null
  timeA: { id: number; nome: string; cor: string }
  timeB: { id: number; nome: string; cor: string }
  gols: GolAudit[]
}

// Gol no rascunho de edicao: nada vai para a API ate o usuario confirmar o "Salvar"
type GolRascunho = {
  chave: string
  id: number | null // null = gol novo
  timeId: number
  golContra: boolean
  jogadorId: number
  assistId: number | null
  removido: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  diaId: number
  partida: PartidaMin
  times: TimeMin[]
  /** Chamado apos salvar alteracoes (ex.: para atualizar placar do dia) */
  onAlterado?: () => void
}

function paraRascunho(g: GolAudit): GolRascunho {
  return {
    chave: `g${g.id}`,
    id: g.id,
    timeId: g.timeId,
    golContra: g.golContra,
    jogadorId: g.jogador.id,
    assistId: g.assistencia?.jogador.id ?? null,
    removido: false,
  }
}

export function PartidaAuditoria({ diaId, partida, times, onAlterado }: Props) {
  const { data, mutate, isLoading } = useSWR<PartidaAuditData>(
    `/api/dias-de-jogo/${diaId}/partidas/${partida.id}`,
    fetcher
  )

  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<GolRascunho[]>([])
  const [editChave, setEditChave] = useState<string | null>(null)
  const [editJogadorValue, setEditJogadorValue] = useState<string>('')
  const [assistValue, setAssistValue] = useState<string>('')
  const [adicionando, setAdicionando] = useState(false)
  const [novoTimeId, setNovoTimeId] = useState<string>('')
  const [novoJogadorId, setNovoJogadorId] = useState<string>('')
  const [novoAssistId, setNovoAssistId] = useState<string>('')
  const [novoGolContra, setNovoGolContra] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin" style={{ color: '#555' }} />
      </div>
    )
  }

  const hexA = getCorTime(data.timeA.cor).hex
  const hexB = getCorTime(data.timeB.cor).hex

  const timesPartida = [
    { id: data.timeAId, nome: data.timeA.nome, cor: hexA },
    { id: data.timeBId, nome: data.timeB.nome, cor: hexB },
  ]

  const jogadoresDoTime = (timeId: number) =>
    times.find((t) => t.id === timeId)?.jogadores ?? []
  const nomeJogador = (id: number | null) =>
    id == null ? null : [...jogadoresDoTime(data.timeAId), ...jogadoresDoTime(data.timeBId)].find((j) => j.id === id)?.nome ?? '—'

  // Gol contra: autor e do time adversario ao time que recebe o gol
  const adversario = (timeId: number) => (timeId === data.timeAId ? data.timeBId : data.timeAId)
  const autoresDoGol = (timeId: number, golContra: boolean) =>
    jogadoresDoTime(golContra ? adversario(timeId) : timeId)

  // Placar original x placar do rascunho (previa)
  const originais = data.gols.map(paraRascunho)
  const gols = editando ? rascunho : originais
  const ativos = gols.filter((g) => !g.removido)
  const placar = (lista: GolRascunho[]) => ({
    a: lista.filter((g) => g.timeId === data.timeAId).length,
    b: lista.filter((g) => g.timeId === data.timeBId).length,
  })
  const placarAtual = placar(originais)
  const placarNovo = placar(ativos)

  const alterado = (g: GolRascunho) => {
    if (g.id == null) return false
    const orig = originais.find((o) => o.id === g.id)
    return !!orig && (orig.jogadorId !== g.jogadorId || orig.assistId !== g.assistId)
  }
  const removidos = rascunho.filter((g) => g.id != null && g.removido)
  const novos = rascunho.filter((g) => g.id == null)
  const editados = rascunho.filter((g) => !g.removido && alterado(g))
  const temAlteracoes = removidos.length + novos.length + editados.length > 0

  // So o vencedor (pelo placar, inclusive na previa da edicao) aparece na cor do time
  const corNomeA = placarNovo.a > placarNovo.b ? hexA : COR_NEUTRA
  const corNomeB = placarNovo.b > placarNovo.a ? hexB : COR_NEUTRA

  const descreverResultado = (p: { a: number; b: number }) =>
    p.a > p.b ? `vitória ${data.timeA.nome}` : p.b > p.a ? `vitória ${data.timeB.nome}` : 'empate'

  function entrarEdicao() {
    setRascunho(originais)
    setEditando(true)
  }

  function sairEdicao() {
    setEditando(false)
    setRascunho([])
    setEditChave(null)
    fecharAdicao()
  }

  function fecharAdicao() {
    setAdicionando(false)
    setNovoTimeId('')
    setNovoJogadorId('')
    setNovoAssistId('')
    setNovoGolContra(false)
  }

  function alternarRemocao(chave: string) {
    setRascunho((prev) =>
      prev
        // gol novo removido some do rascunho; gol existente fica marcado (pode desfazer)
        .filter((g) => !(g.chave === chave && g.id == null))
        .map((g) => (g.chave === chave ? { ...g, removido: !g.removido } : g))
    )
    if (editChave === chave) setEditChave(null)
  }

  function aplicarEdicaoGol(chave: string) {
    if (!editJogadorValue) {
      toast.error('Selecione o jogador')
      return
    }
    const jogadorId = parseInt(editJogadorValue, 10)
    const assistId = assistValue === '' || assistValue === 'none' ? null : parseInt(assistValue, 10)
    setRascunho((prev) =>
      prev.map((g) =>
        g.chave === chave
          ? { ...g, jogadorId, assistId: g.golContra || assistId === jogadorId ? null : assistId }
          : g
      )
    )
    setEditChave(null)
  }

  function adicionarAoRascunho() {
    if (!novoTimeId || !novoJogadorId) {
      toast.error('Selecione time e jogador')
      return
    }
    const assistId = novoAssistId === '' || novoAssistId === 'none' ? null : parseInt(novoAssistId, 10)
    setRascunho((prev) => [
      ...prev,
      {
        chave: `novo-${Date.now()}`,
        id: null,
        timeId: parseInt(novoTimeId, 10),
        golContra: novoGolContra,
        jogadorId: parseInt(novoJogadorId, 10),
        assistId: novoGolContra ? null : assistId,
        removido: false,
      },
    ])
    fecharAdicao()
  }

  // Envia o rascunho para a API: remocoes, edicoes e depois inclusoes.
  // Se algo falhar no meio, recarrega o que ficou gravado no servidor.
  async function salvar() {
    setSalvando(true)
    const base = `/api/dias-de-jogo/${diaId}/partidas/${partida.id}/gols`
    const falhar = async (res: Response, padrao: string) => {
      const b = await res.json().catch(() => ({}))
      throw new Error(b.error ?? padrao)
    }
    try {
      for (const g of removidos) {
        const res = await fetch(`${base}/${g.id}`, { method: 'DELETE' })
        if (!res.ok) await falhar(res, 'Erro ao remover gol')
      }
      for (const g of editados) {
        const res = await fetch(`${base}/${g.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jogadorId: g.jogadorId, assistenciaJogadorId: g.assistId }),
        })
        if (!res.ok) await falhar(res, 'Erro ao editar gol')
      }
      for (const g of novos) {
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeId: g.timeId,
            jogadorId: g.jogadorId,
            assistenciaJogadorId: g.assistId,
            golContra: g.golContra,
          }),
        })
        if (!res.ok) await falhar(res, 'Erro ao adicionar gol')
      }
      toast.success('Alterações salvas')
    } catch (err) {
      toast.error(`${err instanceof Error ? err.message : 'Erro ao salvar'} — partida recarregada`)
    } finally {
      await mutate()
      onAlterado?.()
      setConfirmando(false)
      setSalvando(false)
      sairEdicao()
    }
  }

  const jogadoresNovoTime = novoTimeId ? autoresDoGol(parseInt(novoTimeId, 10), novoGolContra) : []
  const jogadoresAssistNovoTime = novoTimeId ? jogadoresDoTime(parseInt(novoTimeId, 10)) : []
  const jogadoresSemNovoGolador = novoJogadorId
    ? jogadoresAssistNovoTime.filter((j) => j.id !== parseInt(novoJogadorId, 10))
    : jogadoresAssistNovoTime

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#111111', border: `1px solid ${editando ? 'rgba(245,196,0,0.35)' : '#1e1e1e'}` }}
    >
      {/* Header da partida: placar (previa durante a edicao) + lapis */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ background: '#161616', borderBottom: '1px solid #1e1e1e' }}>
        <span className="font-bebas tracking-widest text-base" style={{ color: corNomeA }}>{data.timeA.nome}</span>
        <span className="font-bebas text-xl tabular-nums tracking-widest">{placarNovo.a}<span className="mx-1">×</span>{placarNovo.b}</span>
        <span className="font-bebas tracking-widest text-base" style={{ color: corNomeB }}>{data.timeB.nome}</span>
        {!editando ? (
          <button
            onClick={entrarEdicao}
            title="Editar gols"
            aria-label="Editar gols"
            className="ml-auto w-10 h-10 -mr-2 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#888' }}
          >
            <Pencil size={16} />
          </button>
        ) : (
          <span className="ml-auto font-barlow-condensed text-[11px] tracking-widest uppercase py-3" style={{ color: '#f5c400' }}>
            Editando
          </span>
        )}
      </div>

      {/* Lista de gols */}
      <div className="divide-y" style={{ borderColor: '#1a1a1a' }}>
        {gols.length === 0 && (
          <div className="px-4 py-4 font-barlow-condensed text-xs text-muted-foreground text-center">
            Nenhum gol registrado
          </div>
        )}
        {gols.map((gol) => {
          const corTime = gol.timeId === data.timeAId ? hexA : hexB
          const isEditando = editChave === gol.chave
          const jogadoresTimeGol = autoresDoGol(gol.timeId, gol.golContra)
          const jogadoresParaAssist = jogadoresDoTime(gol.timeId).filter((j) => String(j.id) !== editJogadorValue)
          const marca = gol.id == null ? 'novo' : alterado(gol) ? 'alterado' : null

          return (
            <div key={gol.chave} className="px-4 py-2.5 space-y-1.5" style={{ opacity: gol.removido ? 0.45 : 1 }}>
              {/* Linha principal do gol */}
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: corTime }} />
                {/* Autor + assistencia na mesma linha; nomes longos sao cortados com "…" */}
                <div
                  className="flex-1 min-w-0 flex items-baseline gap-2 font-barlow-condensed"
                  style={{ textDecoration: gol.removido ? 'line-through' : 'none' }}
                >
                  <span className="text-sm text-foreground truncate" style={{ flexShrink: 0.5 }}>
                    {nomeJogador(gol.jogadorId)}
                    {gol.golContra && <span className="ml-1.5 text-[10px] tracking-wide" style={{ color: '#fb923c' }}>(contra)</span>}
                  </span>
                  {gol.assistId && !isEditando && (
                    <span className="text-xs truncate" style={{ color: '#3b82f6', flexShrink: 1 }}>
                      🎯 {nomeJogador(gol.assistId)}
                    </span>
                  )}
                  {editando && marca && (
                    <span className="text-[10px] tracking-wide flex-shrink-0" style={{ color: '#f5c400' }}>• {marca}</span>
                  )}
                </div>
                {editando && !gol.removido && (
                  <button
                    onClick={() => {
                      setEditChave(isEditando ? null : gol.chave)
                      setEditJogadorValue(String(gol.jogadorId))
                      setAssistValue(gol.assistId ? String(gol.assistId) : '')
                    }}
                    title="Editar gol"
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ color: isEditando ? '#f5c400' : '#666' }}
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {editando && (
                  <button
                    onClick={() => alternarRemocao(gol.chave)}
                    title={gol.removido ? 'Desfazer remoção' : 'Remover gol'}
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ color: gol.removido ? '#f5c400' : '#666' }}
                  >
                    {gol.removido ? <Undo2 size={14} /> : <X size={14} />}
                  </button>
                )}
              </div>

              {/* Editor inline: jogador + assistência (altera so o rascunho) */}
              {isEditando && (
                <div className="pl-[18px] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Select value={editJogadorValue} onValueChange={(v) => setEditJogadorValue(v ?? '')}>
                      <SelectTrigger className="h-8 text-xs flex-1 min-w-0" style={{ fontSize: '12px' }}>
                        <SelectValue placeholder="Jogador">
                          {(value) => jogadoresTimeGol.find((j) => String(j.id) === String(value))?.nome ?? 'Jogador'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {jogadoresTimeGol.map((j) => (
                          <SelectItem key={j.id} value={String(j.id)}>
                            {j.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => aplicarEdicaoGol(gol.chave)}
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                      title="Aplicar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditChave(null)}
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ color: '#555' }}
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {!gol.golContra && (
                    <Select value={assistValue} onValueChange={(v) => setAssistValue(v ?? '')}>
                      <SelectTrigger className="h-8 text-xs w-full" style={{ fontSize: '12px' }}>
                        <SelectValue placeholder="Sem assistência">
                          {(value) =>
                            value && value !== 'none'
                              ? jogadoresParaAssist.find((j) => String(j.id) === String(value))?.nome ?? 'Sem assistência'
                              : 'Sem assistência'
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem assistência</SelectItem>
                        {jogadoresParaAssist.map((j) => (
                          <SelectItem key={j.id} value={String(j.id)}>
                            {j.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Formulário inline de adicionar gol (vai para o rascunho) */}
      {editando && adicionando && (
        <div
          className="px-4 py-3 space-y-2.5"
          style={{ borderTop: '1px solid #1e1e1e', background: '#0e0e0e' }}
        >
          <p className="font-barlow-condensed text-[11px] tracking-widest uppercase" style={{ color: '#f5c400' }}>
            Adicionar Gol
          </p>
          <label className="flex items-center gap-2 min-h-9 cursor-pointer select-none font-barlow-condensed text-xs"
            style={{ color: novoGolContra ? '#fb923c' : '#aaa' }}>
            <input
              type="checkbox"
              checked={novoGolContra}
              onChange={(e) => { setNovoGolContra(e.target.checked); setNovoJogadorId(''); setNovoAssistId('') }}
              className="w-4 h-4"
              style={{ accentColor: '#fb923c' }}
            />
            Gol contra (jogador do time adversário)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Time</p>
              <Select value={novoTimeId} onValueChange={(v) => { setNovoTimeId(v ?? ''); setNovoJogadorId('') }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione...">
                    {(value) => {
                      const t = timesPartida.find((t) => String(t.id) === String(value))
                      return t ? <span style={{ color: t.cor }}>{t.nome}</span> : 'Selecione...'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timesPartida.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span style={{ color: t.cor }}>{t.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Jogador</p>
              <Select value={novoJogadorId} onValueChange={(v) => setNovoJogadorId(v ?? '')} disabled={!novoTimeId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione...">
                    {(value) => jogadoresNovoTime.find((j) => String(j.id) === String(value))?.nome ?? 'Selecione...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {jogadoresNovoTime.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!novoGolContra && <div>
            <p className="font-barlow-condensed text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Assistência (opcional)</p>
            <Select value={novoAssistId} onValueChange={(v) => setNovoAssistId(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sem assistência">
                  {(value) =>
                    value && value !== 'none'
                      ? jogadoresSemNovoGolador.find((j) => String(j.id) === String(value))?.nome ?? 'Sem assistência'
                      : 'Sem assistência'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem assistência</SelectItem>
                {jogadoresSemNovoGolador.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={adicionarAoRascunho}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-barlow-condensed text-xs font-bold tracking-wide"
              style={{ background: '#f5c400', color: '#000' }}
            >
              <Check size={13} />
              Adicionar
            </button>
            <button
              onClick={fecharAdicao}
              className="px-3 py-2 rounded-lg font-barlow-condensed text-xs tracking-wide border"
              style={{ borderColor: '#333', color: '#888' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rodapé da edição: adicionar gol + cancelar/salvar */}
      {editando && (
        <div className="px-4 py-3 space-y-3" style={{ borderTop: '1px solid #1a1a1a' }}>
          {!adicionando && (
            <button
              onClick={() => setAdicionando(true)}
              className="flex items-center gap-1.5 font-barlow-condensed text-xs tracking-wide min-h-8"
              style={{ color: '#888' }}
            >
              <Plus size={13} />
              Adicionar Gol
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={sairEdicao}
              className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm tracking-wide border"
              style={{ borderColor: '#333', color: '#aaa' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => setConfirmando(true)}
              disabled={!temAlteracoes}
              className="flex-1 py-2.5 rounded-xl font-barlow-condensed text-sm font-bold tracking-wide disabled:opacity-30"
              style={{ background: '#f5c400', color: '#000' }}
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Confirmação do salvar */}
      <Dialog open={confirmando} onOpenChange={(v) => { if (!salvando) setConfirmando(v) }}>
        <DialogContent style={{ background: '#111111', border: '1px solid #242424' }}>
          <DialogHeader>
            <DialogTitle className="font-bebas tracking-widest text-2xl">Salvar alterações?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1 font-barlow-condensed text-sm" style={{ color: '#f0ede0' }}>
            <ul className="space-y-1">
              {removidos.length > 0 && <li>• {removidos.length} gol(s) removido(s)</li>}
              {novos.length > 0 && <li>• {novos.length} gol(s) adicionado(s)</li>}
              {editados.length > 0 && <li>• {editados.length} gol(s) alterado(s)</li>}
            </ul>
            <div className="rounded-lg px-3 py-2" style={{ background: '#161616' }}>
              <div>
                Placar: {placarAtual.a}×{placarAtual.b} → <strong>{placarNovo.a}×{placarNovo.b}</strong>
              </div>
              {descreverResultado(placarAtual) !== descreverResultado(placarNovo) && (
                <div style={{ color: '#fb923c' }}>
                  Resultado: {descreverResultado(placarAtual)} → {descreverResultado(placarNovo)}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={salvar} disabled={salvando} className="font-barlow-condensed tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}>
                {salvando ? 'Salvando...' : 'Sim, salvar'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmando(false)} disabled={salvando} className="font-barlow-condensed">
                Voltar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
