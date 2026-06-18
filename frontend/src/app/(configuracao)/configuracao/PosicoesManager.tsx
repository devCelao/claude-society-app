'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Plus, Pencil, Power, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Posicao } from '@/types'

interface Props {
  posicoesIniciais: Posicao[]
}

type Rascunho = { nome: string; sigla: string; cor: string }

const COR_PADRAO = '#f5c400'

function ordenar(lista: Posicao[]) {
  return [...lista].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}

export function PosicoesManager({ posicoesIniciais }: Props) {
  const [lista, setLista] = useState<Posicao[]>(ordenar(posicoesIniciais))
  const [novo, setNovo] = useState<Rascunho>({ nome: '', sigla: '', cor: COR_PADRAO })
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [edit, setEdit] = useState<Rascunho>({ nome: '', sigla: '', cor: COR_PADRAO })
  const [salvando, setSalvando] = useState(false)

  async function handleCriar() {
    if (!novo.nome.trim() || !novo.sigla.trim()) {
      toast.error('Informe nome e sigla')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/configuracao/posicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novo.nome.trim(), sigla: novo.sigla.trim().toUpperCase(), cor: novo.cor }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao criar posicao')
        return
      }
      const criada: Posicao = await res.json()
      setLista((prev) => ordenar([...prev, criada]))
      setNovo({ nome: '', sigla: '', cor: COR_PADRAO })
      toast.success('Posicao criada')
    } finally {
      setSalvando(false)
    }
  }

  function iniciarEdicao(p: Posicao) {
    setEditandoId(p.id)
    setEdit({ nome: p.nome, sigla: p.sigla, cor: p.cor })
  }

  async function handleSalvarEdicao(id: number) {
    if (!edit.nome.trim() || !edit.sigla.trim()) {
      toast.error('Informe nome e sigla')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch(`/api/configuracao/posicoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: edit.nome.trim(), sigla: edit.sigla.trim().toUpperCase(), cor: edit.cor }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? 'Erro ao salvar posicao')
        return
      }
      const atualizada: Posicao = await res.json()
      setLista((prev) => ordenar(prev.map((p) => (p.id === id ? atualizada : p))))
      setEditandoId(null)
      toast.success('Posicao atualizada')
    } finally {
      setSalvando(false)
    }
  }

  async function handleToggleAtivo(p: Posicao) {
    setSalvando(true)
    try {
      let res: Response
      if (p.ativo) {
        res = await fetch(`/api/configuracao/posicoes/${p.id}`, { method: 'DELETE' })
      } else {
        res = await fetch(`/api/configuracao/posicoes/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: true }),
        })
      }
      if (!res.ok) {
        toast.error('Erro ao alterar status')
        return
      }
      setLista((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x)))
      toast.success(p.ativo ? 'Posicao desativada' : 'Posicao reativada')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: '#242424', background: '#111111' }}
    >
      <div className="flex items-center gap-2.5">
        <MapPin size={16} style={{ color: '#f5c400' }} />
        <div>
          <div className="font-barlow-condensed text-sm font-semibold tracking-wide text-foreground">
            Posições
          </div>
          <div className="font-barlow-condensed text-xs text-muted-foreground">
            Cadastro das posições disponíveis para os jogadores
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {lista.length === 0 && (
          <p className="font-barlow-condensed text-sm text-muted-foreground py-2">
            Nenhuma posição cadastrada.
          </p>
        )}
        {lista.map((p) => {
          const emEdicao = editandoId === p.id
          return (
            <div
              key={p.id}
              className={`rounded-lg px-2.5 py-2 ${emEdicao ? 'flex flex-col gap-2' : 'flex items-center gap-2'}`}
              style={{
                background: '#161616',
                border: '1px solid #242424',
                opacity: p.ativo ? 1 : 0.55,
              }}
            >
              {emEdicao ? (
                <>
                  {/* Linha 1: cor + nome (mais largo) */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={edit.cor}
                      onChange={(e) => setEdit((s) => ({ ...s, cor: e.target.value }))}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      title="Cor"
                    />
                    <Input
                      value={edit.nome}
                      onChange={(e) => setEdit((s) => ({ ...s, nome: e.target.value }))}
                      placeholder="Nome da posição"
                      className="h-9 flex-1"
                    />
                  </div>
                  {/* Linha 2: sigla + salvar + cancelar */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={edit.sigla}
                      onChange={(e) => setEdit((s) => ({ ...s, sigla: e.target.value }))}
                      placeholder="SIG"
                      maxLength={3}
                      className="h-9 w-20 uppercase flex-shrink-0"
                    />
                    <Button
                      onClick={() => handleSalvarEdicao(p.id)}
                      disabled={salvando}
                      className="h-9 flex-1 gap-1.5 font-barlow-condensed tracking-wide"
                      style={{ background: '#f5c400', color: '#000' }}
                    >
                      <Check size={15} />
                      Salvar
                    </Button>
                    <button
                      onClick={() => setEditandoId(null)}
                      disabled={salvando}
                      title="Cancelar"
                      className="h-9 px-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] flex items-center flex-shrink-0"
                      style={{ color: '#777' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="font-barlow-condensed text-[10px] font-bold tracking-wider px-1.5 py-1 rounded flex-shrink-0"
                    style={{ background: `${p.cor}14`, color: p.cor, border: `1px solid ${p.cor}33` }}
                  >
                    {p.sigla}
                  </span>
                  <span className="flex-1 font-barlow text-sm text-foreground truncate">
                    {p.nome}
                    {!p.ativo && (
                      <span className="ml-2 font-barlow-condensed text-[10px] tracking-wider text-muted-foreground">
                        (inativa)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => iniciarEdicao(p)}
                    title="Editar"
                    className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
                    style={{ color: '#666' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(p)}
                    disabled={salvando}
                    title={p.ativo ? 'Desativar' : 'Reativar'}
                    className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
                    style={{ color: p.ativo ? '#f87171' : '#6ee7b7' }}
                  >
                    <Power size={14} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Adicionar nova */}
      <div className="pt-3 border-t space-y-2" style={{ borderColor: '#242424' }}>
        {/* Linha 1: cor + nome (mais largo) */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={novo.cor}
            onChange={(e) => setNovo((s) => ({ ...s, cor: e.target.value }))}
            className="w-9 h-9 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
            title="Cor"
          />
          <Input
            value={novo.nome}
            onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))}
            placeholder="Nome da posição"
            className="h-9 flex-1"
          />
        </div>
        {/* Linha 2: sigla + botão adicionar */}
        <div className="flex items-center gap-2">
          <Input
            value={novo.sigla}
            onChange={(e) => setNovo((s) => ({ ...s, sigla: e.target.value }))}
            placeholder="SIG"
            maxLength={3}
            className="h-9 w-20 uppercase flex-shrink-0"
          />
          <Button
            onClick={handleCriar}
            disabled={salvando}
            className="h-9 flex-1 gap-1.5 font-barlow-condensed tracking-wide"
            style={{ background: '#f5c400', color: '#000' }}
          >
            <Plus size={15} />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  )
}
