# SGM Core — Documento de Requisitos

**Sistema de Gestão para Pasta Fichas e Pasta Montagem**
Versão 1.0 — Abril/2026 (documento original do Segue-me)

> Ver também: `regras-imutaveis.md` (regras R1-R9 extraídas e corrigidas), `ux-e-fluxos.md` (decisões de UX) e `design-system.md` (componentes shadcn).

---

## 1. Visão Geral

O SGM Core (nome provisório) é uma plataforma web voltada para uso interno da equipe dirigente do Segue-me na diocese de Crato. O objetivo é digitalizar e centralizar dois processos hoje feitos em papel/planilhas: o cadastro de fichas dos jovens/casais e a montagem das equipes do encontro. O sistema segue rigorosamente as regras já estabelecidas pelo Segue-me, sem alterar nenhuma delas.

Nasce pensado para uma única paróquia, mas deve ser construído de forma escalável para atender todas as paróquias da diocese (estimativa: 13 paróquias).

## 2. Módulos do Sistema

Dois módulos principais — Fichas e Montagem — mais recursos transversais de acesso, exportação e histórico.

### 2.1 Módulo Fichas

**Ficha do Jovem** — campos:

- **Identificação:** nome completo, data de nascimento, naturalidade, telefone, e-mail (opcional), foto (3×4)
- **Endereço:** logradouro, número, complemento, bairro, cidade, estado, CEP
- **Filiação:** nome do pai, nome da mãe
- **Escolaridade:** grau de escolaridade, curso (se aplicável), instituição (se aplicável), situação (cursando, formado etc.)
- **Religião:** religião, igreja que frequenta, participação em outros movimentos (sim/não + qual), sacramentos recebidos (Batismo, Eucaristia, Crisma)
- **Convite:** nome de quem convidou, telefone do convidante, endereço do convidante
- **Observações:** texto livre opcional

Além dos dados cadastrais:

- Número do encontro que o jovem vivenciou (ex.: V Encontro)
- Cor do círculo — atribuída manualmente pela equipe dirigente antes do encontro, armazenada em todos os encontros (paleta fixa — ver `design-system.md`)
- Na montagem, jovens do encontro imediatamente anterior têm destaque visual (indicativo colorido + nome da cor antes do nome). Encontros anteriores a esse não exibem indicativo
- Histórico de equipes em que serviu, com nº do encontro correspondente
- Avaliação por equipe servida: pode coordenar essa equipe? (sim/não), observações, pode palestrar? (sim/não)
- Situação da ficha: Ativa ou Inativa (inativa não aparece em sugestões de montagem) — motivo da desativação registrado em texto livre

**Ficha do Casal** — mais simples: sem escolaridade, religião/sacramentos ou convite.

- **Identificação:** nome do casal, foto (opcional), telefone dele/dela, e-mail dele/dela (opcional)
- **Endereço:** igual à ficha do jovem
- **Histórico:** equipes servidas + nº do encontro, avaliação por equipe (opcional), observações gerais (opcional)

Nota: casais da Eq. da Visitação costumam repetir a equipe — normal e permitido especificamente pra essa equipe.

### 2.2 Módulo Montagem

Substitui o processo atual em planilha Excel + material impresso.

**Criação da Montagem** — solicita/preenche automaticamente: nº do encontro (auto-incrementado), data, paróquia, padroeiro, indicativo de sementeira (quantas fichas, de qual paróquia), número de jovens vivenciando.

**Distribuição nas Equipes** — 16 equipes (15 + Comando Geral). Pra cada equipe: vagas por função com quantidade/gênero, busca filtrável por encontro/nome, exibição de nome/endereço/telefone ao selecionar, sugestão de coordenadores por histórico, aviso de repetição de equipe.

**Controle de Convites** — marcar aceite/recusa, registrar motivo de recusa (refletido na ficha), remover e substituir, histórico de substituições visível só enquanto a montagem não é finalizada.

**Acompanhamento** — indicador percentual de preenchimento, auto-save, botão de salvar/editar manual.

**Prioridade de Convite** — 1º jovens do encontro imediatamente anterior, 2º jovens de encontros anteriores. Filtro por nº de encontro disponível.

### 2.3 Exportação e Histórico

- Exportar montagem em .xlsx (só dados da montagem, sem fichas)
- Visualizar montagens de encontros anteriores (somente leitura)
- Aba Quadrantes: upload/download de PDFs da Equipe da Gráfica (só anexo, sem campos cadastráveis)

## 3. Estrutura das Equipes

Encontro com 233 pessoas (incluindo diretor espiritual — ver correção em `regras-imutaveis.md`) distribuídas em 16 equipes. Jovens = rapazes e moças; Casais = ECC (adultos).

| Equipe | Pessoas |
|---|---|
| Comando Geral | 4 |
| Eq. Espiritualizadora | 4 |
| Eq. da Animação | 16 |
| Eq. do Canto | 12 |
| Eq. dos Círculos | 26 |
| Eq. da Cozinha | 16 |
| Eq. do Estacionamento | 12 |
| Eq. da Faxina | 14 |
| Eq. da Gráfica | 12 |
| Eq. do Lanche | 12 |
| Eq. da Liturgia e Vigília | 18 |
| Eq. do Minimercado | 8 |
| Eq. do Prover | 4 |
| Eq. da Sala | 16 |
| Eq. da Vigília Paroquial | 16 |
| Eq. da Visitação | variável (~1 casal : 3 jovens vivenciando — ver `regras-imutaveis.md`) |

A composição detalhada de cargos (coordenadores, apoio, equipe) por equipe está no documento original enviado pelo Segue-me — reproduzida integralmente na primeira mensagem desta conversa.

A Eq. dos Círculos é sempre convidada primeiro; as demais só depois que todos os membros dos Círculos aceitarem (ver R4 em `regras-imutaveis.md` — o bloqueio é só sobre o envio do convite, não sobre rascunhar a distribuição).

## 4. Regras Obrigatórias

Ver `regras-imutaveis.md` para a versão completa e corrigida (R1 a R9).

## 5. Acesso e Perfis de Usuário

- **Equipe Dirigente (Administrador):** acesso completo (fichas, montagem, exportação, quadrantes), login individual por paróquia, pode criar/editar/desativar fichas e montagens. Uma equipe dirigente por paróquia (13 no total).
- **Conselho (Super Usuário — futuro):** 12 contas (8 jovens + 4 casais), acesso somente leitura à montagem em tempo real e histórico de qualquer paróquia, pode deixar observações identificadas com o nome do usuário, sem acesso às fichas.

Fluxo esperado: equipe dirigente finaliza a montagem → avisa o conselho no grupo → conselho acessa e deixa observações → sinaliza conclusão no grupo.

## 6. Escalabilidade

- Uma paróquia inicialmente, arquitetado para as 13 da diocese
- Dados de fichas/montagem isolados por paróquia (exceto Conselho, visão geral)
- Login de administrador próprio por paróquia
- Lógica de negócio idêntica entre paróquias
- Cadastro de novas paróquias/contas é responsabilidade do conselho (jovem ou casal diocesano), processo simples

## 7. Comportamentos Gerais Esperados

- Auto-save em qualquer alteração na montagem
- Busca e filtro por nome e nº de encontro em qualquer listagem
- Atribuição direta de um jovem à montagem a partir da própria ficha
- Histórico de substituições (quem saiu, motivo, quem entrou)
- Indicador de progresso em tempo real
- Visualização somente leitura de montagens antigas
- Exportação Excel (layout a definir)
- Quadrantes: upload/download de PDF, sem campos cadastráveis
- Log de atividade: usuário, ação, data/hora, em toda alteração da montagem
