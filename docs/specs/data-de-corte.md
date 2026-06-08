# Spec — Redesign Data de Corte dos Ciclos

**Status:** Aguardando implementação  
**Branch sugerida:** `feature/data-de-corte`

---

## Contexto

Hoje `Ciclo.inicioEm` e `Ciclo.fimEm` são datas completas inseridas manualmente pelo usuário. Não há lógica automática de cálculo de período. `ConfiguracaoJogos.corteInicio/corteFim` são datas globais usadas para auto-criar ciclos ao iniciar um dia de jogo.

O modelo atual tem um erro de lógica: o usuário precisaria calcular mentalmente as datas de início e fim de cada ciclo, e as datas globais de config não refletem a realidade de "cada ciclo tem seu próprio corte".

---

## Nova Lógica

Um ciclo é definido por um **dia do mês** (1–31) chamado `diaDeCorte`, mais o **mês e ano de referência** informados no momento da criação.

A partir disso, o sistema calcula automaticamente:

- `inicioEm` = dia X do mês de referência
- `fimEm` = (dia X do mês seguinte) − 1 dia

### Regra de clamping

Se `diaDeCorte` > número de dias do mês alvo, usa-se o último dia do mês.  
A mesma regra se aplica ao calcular o início do próximo ciclo (para derivar `fimEm`).

### Exemplos

| diaDeCorte | Mês ref. | inicioEm   | Próximo ciclo | fimEm      |
|-----------|----------|------------|---------------|------------|
| 15        | mar/2026 | 15/03/2026 | 15/04/2026    | 14/04/2026 |
| 1         | mar/2026 | 01/03/2026 | 01/04/2026    | 31/03/2026 |
| 31        | mar/2026 | 31/03/2026 | 30/04/2026 *  | 29/04/2026 |
| 31        | jan/2026 | 31/01/2026 | 28/02/2026 *  | 27/02/2026 |
| 29        | fev/2025 | 28/02/2025 * | 29/03/2025 | 28/03/2025 |

\* clamped ao último dia do mês

### Algoritmo (TypeScript)

```typescript
function calcularPeriodoCiclo(
  diaDeCorte: number,
  mes: number,  // 1-12
  ano: number
): { inicioEm: Date; fimEm: Date } {
  // Último dia do mês de referência
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const diaInicio = Math.min(diaDeCorte, ultimoDiaMes)
  const inicioEm = new Date(ano, mes - 1, diaInicio, 12, 0, 0)

  // Mês seguinte
  const proxAno = mes === 12 ? ano + 1 : ano
  const proxMes = mes === 12 ? 1 : mes + 1

  // Último dia do mês seguinte
  const ultimoDiaProxMes = new Date(proxAno, proxMes, 0).getDate()
  const diaProxInicio = Math.min(diaDeCorte, ultimoDiaProxMes)

  // fimEm = próximo início - 1 dia (JS: day=0 retorna último dia do mês anterior)
  const fimEm = new Date(proxAno, proxMes - 1, diaProxInicio - 1, 12, 0, 0)
  // Se diaProxInicio = 1 → new Date(proxAno, proxMes-1, 0) = último dia do mês atual ✓

  return { inicioEm, fimEm }
}
```

---

## Mudanças no Banco de Dados

### `ciclos` — adicionar coluna

```sql
ALTER TABLE `ciclos`
  ADD COLUMN `dia_de_corte` INT NULL AFTER `nome`;

-- Popular ciclos existentes com base no dia de inicio_em
UPDATE `ciclos` SET `dia_de_corte` = DAY(`inicio_em`);
```

### `configuracao_jogos` — trocar colunas

```sql
ALTER TABLE `configuracao_jogos`
  DROP COLUMN `corte_inicio`,
  DROP COLUMN `corte_fim`,
  ADD COLUMN `dia_de_corte` INT NULL;
```

### Prisma Schema

```prisma
model Ciclo {
  // ...
  diaDeCorte Int?     @map("dia_de_corte")   -- novo
  inicioEm   DateTime @map("inicio_em")       -- mantido (calculado)
  fimEm      DateTime? @map("fim_em")         -- mantido (calculado)
  // ...
}

model ConfiguracaoJogos {
  id         Int      @id @default(1)
  diaDeCorte Int?     @map("dia_de_corte")   -- novo (substitui corteInicio/corteFim)
  updatedAt  DateTime @updatedAt @map("updated_at")
}
```

---

## Mudanças na Validação

**`frontend/src/lib/validations/ciclo.ts`**

Substituir campos `inicioEm`/`fimEm` por:

```typescript
export const CicloSchema = z.object({
  diaDeCorte: z
    .number({ error: 'Dia de corte e obrigatorio' })
    .int()
    .min(1, 'Minimo e 1')
    .max(31, 'Maximo e 31'),
  mesReferencia: z
    .string({ error: 'Mes de referencia e obrigatorio' })
    .regex(/^\d{4}-\d{2}$/, 'Formato invalido (AAAA-MM)'),
})

export const CicloUpdateSchema = CicloSchema.partial()
```

`nomeDoCiclo()` permanece inalterada — continua recebendo `inicioEm` (Date) e retornando "março de 2026".

---

## Mudanças nos Route Handlers

### POST `/api/ciclos`

```typescript
const { diaDeCorte, mesReferencia } = result.data
const [ano, mes] = mesReferencia.split('-').map(Number)
const { inicioEm, fimEm } = calcularPeriodoCiclo(diaDeCorte, mes, ano)

await prisma.ciclo.create({
  data: {
    nome: nomeDoCiclo(inicioEm),
    diaDeCorte,
    inicioEm,
    fimEm,
  },
})
```

### PATCH `/api/ciclos/[id]`

Mesma lógica — se `diaDeCorte` ou `mesReferencia` presentes, recalcula `inicioEm`/`fimEm`.  
Deve recalcular `nome` se `inicioEm` mudar.

### PATCH `/api/configuracao`

Aceita `{ diaDeCorte: number | null }`. Remove referências a `corteInicio`/`corteFim`.

### POST `/api/dias-de-jogo/[id]/iniciar`

Lógica atualizada:

```
1. Ler config.diaDeCorte
2. Se configurado:
   a. Buscar ciclo ativo: WHERE inicioEm <= hoje AND (fimEm >= hoje OR fimEm IS NULL)
   b. Se não encontrado: calcular período usando diaDeCorte + mês/ano atual → criar ciclo
   c. Se havia ciclo aberto sem fimEm e novo ciclo foi criado → fechar o anterior (fimEm = inicioEm_novo - 1)
3. Se não configurado: comportamento atual (pede confirmação, cria ciclo com hoje)
```

---

## Mudanças na UI

### `CicloForm.tsx`

Substituir dois `DatePickerField` por:

| Campo | Tipo | Validação |
|-------|------|-----------|
| Dia de corte | `<input type="number" min="1" max="31">` | 1–31, obrigatório |
| Mês/Ano | `<input type="month">` (AAAA-MM) | obrigatório |

Adicionar preview calculado (somente leitura):
```
Ciclo: 15/03/2026 → 14/04/2026
Nome: março de 2026
```

Preview deve atualizar em tempo real via `watch(['diaDeCorte', 'mesReferencia'])` + `calcularPeriodoCiclo`.

### `ConfiguracaoForm.tsx`

Substituir dois date pickers por:

| Campo | Tipo |
|-------|------|
| Dia de corte padrão | `<input type="number" min="1" max="31">` (opcional) |

Label: "Deixe vazio para não usar ciclos automáticos"

---

## Arquivos a Modificar

| # | Arquivo | Tipo de mudança |
|---|---------|----------------|
| 1 | `frontend/prisma/schema.prisma` | Adicionar `diaDeCorte` em Ciclo e ConfiguracaoJogos; remover `corteInicio/corteFim` |
| 2 | Migration SQL | DDL via docker exec (root) |
| 3 | `frontend/src/lib/utils.ts` | Adicionar `calcularPeriodoCiclo()` |
| 4 | `frontend/src/lib/validations/ciclo.ts` | Trocar schema |
| 5 | `frontend/src/components/ciclos/CicloForm.tsx` | Redesign do formulário |
| 6 | `frontend/src/app/api/ciclos/route.ts` | POST usa nova lógica |
| 7 | `frontend/src/app/api/ciclos/[id]/route.ts` | PATCH usa nova lógica |
| 8 | `frontend/src/app/(configuracao)/configuracao/ConfiguracaoForm.tsx` | Trocar date pickers por input numérico |
| 9 | `frontend/src/app/api/configuracao/route.ts` | Aceitar `diaDeCorte` |
| 10 | `frontend/src/app/api/dias-de-jogo/[id]/iniciar/route.ts` | Atualizar lógica de auto-ciclo |

---

## Estratégia de Migração

1. Aplicar migration SQL via docker exec (root) — adiciona colunas novas, popula `ciclos.dia_de_corte` com `DAY(inicio_em)`, remove colunas antigas de `configuracao_jogos`
2. Gerar client Prisma (`npx prisma generate`)
3. Implementar `calcularPeriodoCiclo` em utils
4. Atualizar validações, route handlers e formulários
5. Testar criação de ciclo, edição e flow de "iniciar dia de jogo" com config

**Restrição:** `prisma migrate dev` não funciona (usuário `serviceapp` sem DDL). Migration deve ser aplicada manualmente e o arquivo `.sql` criado em `frontend/prisma/migrations/`.

---

## Fora do Escopo

- Renomear ciclos manualmente (continua gerado automaticamente de `inicioEm`)
- Múltiplos ciclos ativos simultaneamente
- Ciclos sem data de fim (mantido como possibilidade enquanto `fimEm` for nullable)
