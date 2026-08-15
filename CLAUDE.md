# SGM Core

Sistema de gestão do Segue-me (Fichas + Montagem), diocese de Crato.

Stack: Next.js · NestJS · PostgreSQL · Docker

## Como rodar

```
docker-compose up
```

(ajustar conforme o setup real assim que o esqueleto do projeto existir)

## Documentação

- `docs/requisitos.md` — o que o sistema faz (requisitos funcionais e não funcionais)
- `docs/regras-imutaveis.md` — regras de negócio do Segue-me (R1 a R9). **Ler sempre** antes de mexer em qualquer lógica do módulo Montagem — nenhuma dessas regras pode ser violada, mesmo sem pedido explícito.
- `docs/ux-e-fluxos.md` — fluxos de usuário e decisões de UX. Ler antes de criar ou alterar qualquer tela.
- `docs/design-system.md` — tokens visuais e mapa de componentes shadcn. Ler antes de estilizar algo novo.
- `docs/arquitetura.md` — decisões técnicas (backend, frontend, multi-tenancy, testes, CI/CD). **Ler sempre** antes de criar estrutura de pastas, escolher biblioteca nova ou decidir padrão de código.

## Estrutura do projeto

```
/server   — API NestJS
/client   — Next.js
/docs     — documentação de produto (acima)
```

`server/CLAUDE.md` e `client/CLAUDE.md` guardam as convenções específicas de cada lado (estrutura de módulos/pastas, como criar endpoint, como usar os componentes do design system etc.) — leia o que for relevante pra pasta em que estiver trabalhando.

## Estado atual

_(atualizar conforme o projeto avança — ex.: "módulo Fichas: CRUD pronto, falta upload de foto")_

## Isolamento por paróquia

O sistema atende múltiplas paróquias (13, ver `docs/requisitos.md`). Toda tabela relevante deve ter isolamento por paróquia (ex.: coluna `paroquia_id` + filtro obrigatório nas queries) — dado de uma paróquia nunca pode vazar pra outra.
