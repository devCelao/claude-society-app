'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { nomeDoCiclo } from '@/lib/validations/ciclo'
import type { ConfrontoDoCiclo } from '@/app/api/ciclos/[id]/confrontos/route'
import type { CicloAjustado, ResultadoAjuste } from '@/app/api/ciclos/ajustar/route'

// Ajuste de ciclo: renomear e mover confrontos para outro ciclo (ou um novo).
// "Marcar como atual" e uma acao separada, com confirmacao propria.
// As datas dos ciclos sao calculadas pelos confrontos — nao sao editadas aqui.

type CicloResumo = { id: number; nome: string; inicioEm: string; fimEm: string | null }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cicloSelecionado: CicloResumo | undefined
  ciclos: CicloResumo[]
  onConcluido: (cicloId: number) => void
}

const NOVO = 'novo'

const inputStyle = { background: '#0a0a0a', borderColor: '#242424', color: '#f0ede0', colorScheme: 'dark' as const }
const selectClass = 'w-full h-11 px-3 rounded-xl border font-barlow-condensed text-sm focus:outline-none'
const labelClass = 'font-barlow-condensed text-sm tracking-wide text-muted-foreground'

const STATUS: Record<ConfrontoDoCiclo['status'], { rotulo: string; cor: string }> = {
  PENDENTE: { rotulo: 'Pendente', cor: '#f5c400' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', cor: '#ef4444' },
  FINALIZADO: { rotulo: 'Finalizado', cor: '#4ade80' },
}

function formatarData(data: string | null) {
  if (!data) return 'sem data'
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

function formatarPeriodo(c: { inicioEm: string; fimEm: string | null }) {
  const curta = (d: string) => d.split('-').reverse().slice(0, 2).join('/')
  return `${curta(c.inicioEm)} – ${c.fimEm ? curta(c.fimEm) : 'atual'}`
}

const rotuloCiclo = (c: CicloResumo) => `${c.nome} (${formatarPeriodo(c)})`

const COR_SITUACAO: Record<CicloAjustado['situacao'], { cor: string; rotulo: string }> = {
  novo: { cor: '#4ade80', rotulo: 'novo' },
  alterado: { cor: '#f5c400', rotulo: 'alterado' },
  excluido: { cor: '#f87171', rotulo: 'excluído' },
}

export function AjustarCicloDialog({ open, onOpenChange, cicloSelecionado, ciclos, onConcluido }: Props) {
  const cicloAtual = ciclos.find((c) => c.fimEm === null)

  const [nome, setNome] = useState('')
  const [confrontos, setConfrontos] = useState<ConfrontoDoCiclo[] | null>(null)
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [destino, setDestino] = useState('') // id do ciclo, NOVO ou ''
  const [novoNome, setNovoNome] = useState('')
  const [confirmandoAtual, setConfirmandoAtual] = useState(false)
  const [previa, setPrevia] = useState<ResultadoAjuste | null>(null)
  const [excluirVazio, setExcluirVazio] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Ao abrir: parte do ciclo selecionado e carrega os confrontos dele
  useEffect(() => {
    if (!open || !cicloSelecionado) return
    setNome(cicloSelecionado.nome)
    setMarcados(new Set())
    setDestino('')
    setNovoNome('')
    setConfirmandoAtual(false)
    setPrevia(null)
    setExcluirVazio(false)
    setErro(null)
    setConfrontos(null)
    fetch(`/api/ciclos/${cicloSelecionado.id}/confrontos`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setConfrontos)
      .catch(() => setErro('Não foi possível carregar os confrontos do ciclo'))
  }, [open, cicloSelecionado?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const outrosCiclos = ciclos.filter((c) => c.id !== cicloSelecionado?.id)

  // Nome sugerido para o ciclo novo: mes do primeiro confronto marcado
  const sugestaoNovo = useMemo(() => {
    const datas = (confrontos ?? []).filter((c) => marcados.has(c.id) && c.data).map((c) => c.data!).sort()
    return nomeDoCiclo(datas[0] ?? new Date())
  }, [confrontos, marcados])

  // Qualquer mudanca invalida a previa
  function alterar(fn: () => void) {
    fn()
    setPrevia(null)
    setExcluirVazio(false)
    setErro(null)
  }

  function alternarConfronto(id: number) {
    alterar(() =>
      setMarcados((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    )
  }

  function escolherDestino(valor: string) {
    alterar(() => {
      setDestino(valor)
      if (valor === NOVO && !novoNome) setNovoNome(sugestaoNovo)
    })
  }

  const movendo = marcados.size > 0
  const ehAtual = cicloSelecionado?.fimEm === null
  const temAlteracoes = !!cicloSelecionado && (nome.trim() !== cicloSelecionado.nome || movendo)

  async function marcarComoAtual() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/ciclos/${cicloSelecionado!.id}/atual`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setErro(typeof body.error === 'string' ? body.error : 'Não foi possível marcar o ciclo como atual')
        return
      }
      toast.success('Ciclo atual definido')
      onOpenChange(false)
      onConcluido(cicloSelecionado!.id)
    } catch {
      setErro('Erro ao comunicar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  function montarCorpo(confirmar: boolean) {
    return {
      cicloId: cicloSelecionado!.id,
      nome: nome.trim(),
      mover: movendo
        ? destino === NOVO
          ? { diaIds: Array.from(marcados), novoCicloNome: novoNome.trim() }
          : { diaIds: Array.from(marcados), destinoCicloId: Number(destino) }
        : null,
      excluirVazio: confirmar && excluirVazio,
      confirmar,
    }
  }

  function validar(): string | null {
    if (nome.trim().length < 2) return 'Informe o nome do ciclo'
    if (movendo && !destino) return 'Escolha para qual ciclo mover os confrontos'
    if (movendo && destino === NOVO && novoNome.trim().length < 2) return 'Informe o nome do novo ciclo'
    return null
  }

  async function enviar(confirmar: boolean) {
    const msg = validar()
    if (msg) { setErro(msg); return }
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch('/api/ciclos/ajustar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarCorpo(confirmar)),
      })
      const body = await res.json()
      if (!res.ok) {
        setErro(typeof body.error === 'string' ? body.error : 'Dados inválidos')
        setPrevia(null)
        return
      }
      if (!confirmar) {
        setPrevia(body as ResultadoAjuste)
        return
      }
      toast.success('Ciclo ajustado')
      onOpenChange(false)
      onConcluido((body as ResultadoAjuste).cicloId)
    } catch {
      setErro('Erro ao comunicar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  // Nomes podem se repetir (ex.: dois "outubro de 2026"): o resumo sempre mostra o periodo junto
  const descrever = (v: number | 'novo' | null) => {
    if (v === null) return '—'
    if (v === NOVO) return `${novoNome.trim()} (novo)`
    const c = ciclos.find((x) => x.id === v)
    return c ? rotuloCiclo(c) : '—'
  }
  const destinoValor = destino === NOVO ? NOVO : destino ? Number(destino) : null

  if (!cicloSelecionado) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!carregando) onOpenChange(v) }}>
      <DialogContent
        className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto"
        style={{ background: '#111111', border: '1px solid #242424' }}
      >
        <DialogHeader>
          <DialogTitle className="font-bebas tracking-widest text-2xl">Ajustar ciclo</DialogTitle>
        </DialogHeader>

        {!previa ? (
          <div className="space-y-5">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="ciclo-nome" className={labelClass}>Nome</Label>
              <Input
                id="ciclo-nome"
                value={nome}
                onChange={(e) => alterar(() => setNome(e.target.value))}
                style={inputStyle}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="font-barlow-condensed text-xs text-muted-foreground">
                  Período {formatarPeriodo(cicloSelecionado)} · calculado pelos confrontos
                </p>
                {ehAtual ? (
                  <span
                    className="flex-shrink-0 font-barlow-condensed text-[11px] tracking-widest uppercase px-2 py-0.5 rounded"
                    style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)' }}
                  >
                    Atual
                  </span>
                ) : (
                  !confirmandoAtual && (
                    <button
                      type="button"
                      onClick={() => { setConfirmandoAtual(true); setErro(null) }}
                      disabled={carregando}
                      className="flex-shrink-0 font-barlow-condensed text-xs tracking-wide min-h-9 px-3 rounded-lg border"
                      style={{ color: '#f5c400', borderColor: 'rgba(245,196,0,0.35)' }}
                    >
                      Marcar como atual
                    </button>
                  )
                )}
              </div>

              {confirmandoAtual && !ehAtual && (
                <div
                  className="space-y-2 p-3 rounded-xl font-barlow-condensed text-sm"
                  style={{ background: 'rgba(245,196,0,0.06)', border: '1px solid rgba(245,196,0,0.3)', color: '#f0ede0' }}
                >
                  <p>
                    Tornar <strong>{rotuloCiclo(cicloSelecionado)}</strong> o ciclo atual?
                    {cicloAtual ? (
                      <> O ciclo <strong>{rotuloCiclo(cicloAtual)}</strong> será encerrado no último confronto dele.</>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">Os próximos confrontos iniciados entram no ciclo atual.</p>
                  <div className="flex gap-2">
                    <Button onClick={marcarComoAtual} disabled={carregando} className="flex-1 h-10 font-barlow-condensed tracking-wide"
                      style={{ background: '#f5c400', color: '#000' }}>
                      {carregando ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmandoAtual(false)} disabled={carregando} className="h-10 font-barlow-condensed">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Confrontos do ciclo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Confrontos do ciclo</span>
                {confrontos && confrontos.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      alterar(() =>
                        setMarcados(marcados.size === confrontos.length ? new Set() : new Set(confrontos.map((c) => c.id)))
                      )
                    }
                    className="font-barlow-condensed text-xs tracking-wide min-h-8 px-1"
                    style={{ color: '#f5c400' }}
                  >
                    {marcados.size === confrontos.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                )}
              </div>
              {confrontos === null && !erro && (
                <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin" style={{ color: '#555' }} /></div>
              )}
              {confrontos?.length === 0 && (
                <p className="font-barlow-condensed text-sm text-muted-foreground py-2">Nenhum confronto neste ciclo</p>
              )}
              <div className="space-y-1.5">
                {confrontos?.map((c) => {
                  const ativo = marcados.has(c.id)
                  const st = STATUS[c.status]
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 min-h-11 px-3 rounded-xl border cursor-pointer select-none font-barlow-condensed text-sm"
                      style={{
                        background: ativo ? 'rgba(245,196,0,0.08)' : '#0a0a0a',
                        borderColor: ativo ? 'rgba(245,196,0,0.35)' : '#242424',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => alternarConfronto(c.id)}
                        className="w-4 h-4 flex-shrink-0"
                        style={{ accentColor: '#f5c400' }}
                      />
                      <span style={{ color: '#f0ede0' }}>{formatarData(c.data)}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.partidas} {c.partidas === 1 ? 'partida' : 'partidas'}
                      </span>
                      <span className="ml-auto text-[11px] tracking-wide" style={{ color: st.cor }}>{st.rotulo}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Mover para */}
            {movendo && (
              <div className="space-y-1.5">
                <Label htmlFor="ciclo-destino" className={labelClass}>
                  Mover {marcados.size} {marcados.size === 1 ? 'confronto' : 'confrontos'} para
                </Label>
                <select
                  id="ciclo-destino"
                  value={destino}
                  onChange={(e) => escolherDestino(e.target.value)}
                  className={selectClass}
                  style={inputStyle}
                >
                  <option value="">Escolha o ciclo…</option>
                  {outrosCiclos.map((c) => (
                    <option key={c.id} value={c.id}>{rotuloCiclo(c)}</option>
                  ))}
                  <option value={NOVO}>+ Novo ciclo</option>
                </select>
                {destino === NOVO && (
                  <Input
                    aria-label="Nome do novo ciclo"
                    value={novoNome}
                    onChange={(e) => alterar(() => setNovoNome(e.target.value))}
                    placeholder="Nome do novo ciclo"
                    style={inputStyle}
                  />
                )}
              </div>
            )}

          </div>
        ) : (
          /* Confirmacao com o resultado exato que sera gravado */
          <div className="space-y-4">
            <ul className="space-y-1.5 font-barlow-condensed text-sm" style={{ color: '#f0ede0' }}>
              {nome.trim() !== cicloSelecionado.nome && (
                <li>• Renomear: {rotuloCiclo(cicloSelecionado)} → <strong>{nome.trim()}</strong></li>
              )}
              {previa.movidos > 0 && (
                <li>
                  • Mover {previa.movidos} {previa.movidos === 1 ? 'confronto' : 'confrontos'}: {rotuloCiclo(cicloSelecionado)} →{' '}
                  <strong>{descrever(destinoValor)}</strong>
                </li>
              )}
            </ul>

            <div className="space-y-1.5">
              <p className={labelClass}>Como os ciclos ficam</p>
              {previa.ciclos.map((c) => {
                const s = COR_SITUACAO[c.situacao]
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 font-barlow-condensed text-sm"
                    style={{ borderColor: `${s.cor}33`, background: '#0a0a0a' }}
                  >
                    <span className="flex-1 min-w-0 truncate" style={{ color: '#f0ede0' }}>{c.nome}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatarPeriodo(c)} · {c.confrontos} {c.confrontos === 1 ? 'confronto' : 'confrontos'}
                    </span>
                    <span className="text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ color: s.cor, border: `1px solid ${s.cor}55` }}>
                      {s.rotulo}
                    </span>
                  </div>
                )
              })}
            </div>

            {previa.cicloVazio && !ehAtual && (
              <label
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer select-none font-barlow-condensed text-sm"
                style={{ background: '#1a0606', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
              >
                <input
                  type="checkbox"
                  checked={excluirVazio}
                  onChange={(e) => setExcluirVazio(e.target.checked)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ accentColor: '#f87171' }}
                />
                <span>
                  Excluir o ciclo <strong>{nome.trim()}</strong>, que ficou sem confrontos.
                  {excluirVazio && ' Essa ação não tem volta.'}
                </span>
              </label>
            )}
          </div>
        )}

        {erro && (
          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#1a0606', border: '1px solid rgba(248,113,113,0.25)' }}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <p className="font-barlow-condensed text-sm" style={{ color: '#f87171' }}>{erro}</p>
          </div>
        )}

        {/* Acoes */}
        <div className="flex gap-2 pt-1">
          {previa ? (
            <>
              <Button onClick={() => enviar(true)} disabled={carregando} className="flex-1 h-11 font-barlow-condensed tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}>
                {carregando ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
              </Button>
              <Button variant="outline" onClick={() => setPrevia(null)} disabled={carregando} className="h-11 font-barlow-condensed">
                Voltar
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => enviar(false)} disabled={carregando || !temAlteracoes} className="flex-1 h-11 font-barlow-condensed tracking-wide"
                style={{ background: '#f5c400', color: '#000' }}>
                {carregando ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={carregando} className="h-11 font-barlow-condensed">
                Cancelar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
