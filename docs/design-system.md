# SGM Core — Design System

> Camada derivada do `ux-e-fluxos.md`. Aqui ficam os tokens visuais e o mapa de "qual componente shadcn resolve qual necessidade" — não decisões de fluxo (isso fica no ux-e-fluxos.md) nem regras de negócio (isso fica no regras-imutaveis.md).

---

## 1. Base

- **Biblioteca:** shadcn/ui (Radix + Tailwind), estilo "New York" (mais compacto, bom pra telas com bastante dado como a montagem).
- **Fonte:** Inter.
- **Radius:** 0.5rem (8px) como padrão — mantém consistência com o kit shadcn que você encontrou na Community.
- **Paleta base:** zinc/neutral (fundo branco, texto zinc-950, bordas zinc-200, texto secundário zinc-500) — paleta neutra de propósito, porque as cores "com significado" do sistema (cor do círculo, status) já competem bastante por atenção visual; a UI em si fica neutra pra não disputar destaque com essas cores funcionais.

### Cores funcionais (uso restrito, não decorativo)

**Paleta dos círculos (fixa, 6 cores):**

| Cor | Hex |
|---|---|
| Vermelho | `#f40606` |
| Azul | `#036cf6` |
| Verde | `#2ea633` |
| Amarelo | `#ffde05` |
| Rosa | `#ff1fa9` |
| Laranja | `#ff5502` |

Sendo uma paleta fixa, o campo "Cor do círculo" no cadastro vira um **Select** (não campo de cor livre).

⚠️ **Conflito a resolver:** três dessas cores (verde, vermelho, amarelo) coincidem com as cores que eu tinha reservado pra status (Ativa/Inativa/Aviso). Numa mesma linha da tabela (badge do círculo + badge de status lado a lado), um badge verde poderia ser lido como "círculo verde" ou "Ativa" — ambíguo. Pra resolver sem trocar a paleta do círculo (que é fixa e definida pelo Segue-me), a diferenciação fica pela **forma**, não só a cor:
- Badge de **círculo**: pílula sólida preenchida com a cor exata da tabela acima, sempre acompanhada do nome da cor por extenso (ex.: "🔴 Vermelho") — nunca aparece sozinha, sempre com texto.
- Badge de **status**: usa tom mais suave (ex.: fundo claro da cor + texto colorido, não preenchimento sólido) e ícone (✓ Ativa, ✕ Inativa) em vez de depender só da cor.

| Cor | Uso |
|---|---|
| Cores do círculo (paleta fixa acima) | Badge de identificação do jovem — **só** nesse contexto, sempre com o nome da cor por extenso |
| Verde (tom suave) | Status "Ativa" / "Aceito" |
| Vermelho (tom suave) | Status "Inativa" / "Recusado" / ação destrutiva (Desativar, Remover) |
| Amarelo/âmbar (tom suave) | Avisos não-bloqueantes (já serviu na equipe, aguardando resposta) |
| Zinc escuro (neutro) | Ações primárias (Salvar, Convidar) — sem usar uma cor "de marca", já que o sistema é interno/operacional, não institucional |

---

## 2. Mapa de componentes por necessidade

| Necessidade do sistema | Componente shadcn | Onde aparece |
|---|---|---|
| Navegação geral | Sidebar | Toda a aplicação |
| Abas da Ficha do Jovem/Casal | Tabs | Ficha do Jovem, Ficha do Casal |
| Campos de formulário | Input, Select, Textarea, Checkbox | Fichas, Criação da Montagem |
| Grid das 16 equipes | Card + Progress + Badge | Quadro das 16 Equipes |
| Detalhe de uma equipe | Drawer | Ao clicar no card de uma equipe |
| Pré-visualização rápida de pessoa | Popover | Busca de pessoa na Distribuição |
| Confirmações obrigatórias (R1, R2, R3) | Alert Dialog | Distribuição de vaga, Controle de Convites |
| Criação de nova montagem/ficha | Dialog | Nova Montagem, Nova Ficha |
| Busca de pessoa para vaga | Command (combobox com busca) | Distribuição de vaga |
| Lista de substituição (banco geral de backups) | DataTable/List + Command | Aba "Substituições" dentro da Montagem |
| Listagens tabulares | DataTable | Lista de Fichas, Histórico da Ficha, Histórico de Montagens, Controle de Convites |
| Status e indicadores | Badge | Cor do círculo, Ativa/Inativa, Aceito/Recusado, "Já em: [equipe]" |
| Foto da pessoa | Avatar | Ficha, Lista de Fichas, Distribuição, Popover |
| Auto-save, ações e remanejamento | Toast | Ficha (auto-save), Montagem (remanejamento com Desfazer) |
| % de preenchimento | Progress | Card de cada equipe, Dashboard da Montagem |
| Upload/download de PDF | Input file + lista | Aba Quadrantes (sem componente shadcn nativo pra isso) |
| Importação em massa de fichas | Dialog + DataTable de conferência + Progress | Importador CSV/Excel (fluxo de cadastro em lote) |

---

## 3. Padrões de uso

- **Alert Dialog é reservado pras regras R1-R3** (recusa, limite de 3x, coordenação) — não usar pra confirmações genéricas de UI. Ações reversíveis (como o remanejamento de equipe) usam Toast com Desfazer, não Alert Dialog.
- **Badge de cor do círculo** é sempre a mesma badge, reaproveitada em Lista de Fichas, Distribuição e Popover — consistência visual é o que faz a cor funcionar como atalho de reconhecimento.
- **DataTable** é o padrão único pra qualquer listagem — Histórico de Fichas, Histórico de Montagens e Controle de Convites usam a mesma configuração de componente (colunas variam, comportamento não).
- **Sidebar fixa**, sem navegação por breadcrumb — o sistema tem poucos níveis de profundidade (Fichas / Montagem / Exportação, cada um raso), não precisa de trilha de navegação.

---

## Pendências

_(nenhuma no momento)_
