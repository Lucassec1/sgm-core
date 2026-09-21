# SGM Core — Guia para quem não é técnico

Este guia é para a equipe dirigente e para quem assumir o sistema depois. Não precisa saber programar.
Se algo aqui pedir "mexer no código", **pare e chame a pessoa técnica** da lista abaixo.

> **Este documento ainda tem campos para preencher** (marcados com `[PREENCHER]`). Enquanto eles estiverem
> em branco, o guia não cumpre o papel principal: dizer _quem chamar_ e _quem manda em cada conta_.

## 1. O que é o sistema

Um site onde a equipe dirigente do Segue-me cadastra as **fichas** dos jovens e casais e faz a **montagem**
do encontro (quem serve em qual das 16 equipes). Cada paróquia tem o seu próprio acesso e só enxerga os
seus dados. O **Conselho** consegue acompanhar as montagens de todas as paróquias, mas não vê as fichas.

O sistema guarda dados pessoais, inclusive de menores de idade (nome, telefone, endereço, religião,
sacramentos, foto). Trate como informação sensível: não compartilhe senhas, não mande fichas por
aplicativo de mensagem, não deixe o computador logado em lugar público.

## 2. Quem chamar

| Papel                             | Nome          | Telefone / contato |
| --------------------------------- | ------------- | ------------------ |
| Pessoa técnica principal          | `[PREENCHER]` | `[PREENCHER]`      |
| Pessoa técnica reserva            | `[PREENCHER]` | `[PREENCHER]`      |
| Responsável pela equipe dirigente | `[PREENCHER]` | `[PREENCHER]`      |
| Contato do Conselho               | `[PREENCHER]` | `[PREENCHER]`      |

Se nenhuma das pessoas técnicas responder em um dia útil, o código do sistema está no GitHub e qualquer
desenvolvedor com acesso ao repositório consegue assumir — mostre a ele o arquivo `docs/deploy.md`.

## 3. Onde as coisas ficam

O sistema usa serviços na internet, cada um com um papel. Todos precisam ter **um dono humano** com
acesso à conta (e-mail de recuperação que não seja de uma única pessoa que pode sair).

| O quê                                | Serviço      | Para que serve                                       | Dono da conta |
| ------------------------------------ | ------------ | ---------------------------------------------------- | ------------- |
| Os dados (fichas, montagens, contas) | **Neon**     | O "arquivo" principal, com backup do próprio serviço | `[PREENCHER]` |
| Fotos e PDFs dos quadrantes          | **AWS (S3)** | Guarda as imagens e arquivos enviados                | `[PREENCHER]` |
| O motor do sistema                   | **Render**   | Onde o servidor roda                                 | `[PREENCHER]` |
| O site que as pessoas abrem          | **Vercel**   | Onde a tela do site fica hospedada                   | `[PREENCHER]` |
| O código-fonte                       | **GitHub**   | Onde o código e a documentação ficam guardados       | `[PREENCHER]` |
| Aviso de erros (se estiver ligado)   | **Sentry**   | Avisa quando algo dá erro por baixo dos panos        | `[PREENCHER]` |

Endereço do site: `[PREENCHER]`

**Risco a resolver antes de qualquer saída da equipe:** hoje o acesso técnico está com uma pessoa só.
Cada linha da tabela acima precisa ter pelo menos **duas** pessoas com acesso.

## 4. "O site não abre" — passo a passo

Faça na ordem. Pare assim que resolver.

1. **Espere um minuto e recarregue.** O servidor gratuito "dorme" quando ninguém usa por um tempo, e a
   primeira visita do dia pode levar quase um minuto para acordar. Isso é normal e não é defeito.
2. **Tente em outro navegador ou no celular**, e confira se a internet está funcionando.
3. **Volta para a tela de login sozinho, depois de entrar?** Avise a pessoa técnica e diga exatamente isso;
   é um problema de configuração que ela sabe onde procurar.
4. **Aparece uma mensagem de erro?** Tire uma foto da tela (com a hora) e mande para a pessoa técnica.
5. **Continua fora depois de 10 minutos?** Chame a pessoa técnica. Diga: o que estava fazendo, que horas
   começou, e se todos ou só você estão com o problema.

**Não perca dados por causa do susto:** enquanto o sistema está fora, os dados continuam guardados no Neon.
Fora do ar não significa perdido.

## 5. Tirar uma cópia dos dados (sem depender de ninguém técnico)

No painel inicial (dashboard) existe o cartão **Exportação**, com botões para baixar em planilha (CSV):

- as fichas de jovens,
- as fichas de casais,
- a montagem de um encontro.

**Recomendação:** baixe uma cópia **depois de cada encontro finalizado** e antes de qualquer mudança
grande, e guarde em um lugar seguro que não seja só o seu computador (com acesso restrito, por causa dos
dados pessoais). A exportação em Excel completo (.xlsx) ainda não existe.

## 6. Senhas e acessos

- Cada **paróquia** tem **uma** senha, compartilhada pela equipe dirigente (como uma conta de Drive).
  Isso significa que o sistema não sabe _qual pessoa_ fez cada alteração; por isso, ao registrar algo na
  montagem, o nome da pessoa é digitado à mão.
- **Virou a equipe dirigente?** Peça ao **Conselho** para trocar a senha da paróquia. Quem saiu não deve
  continuar com acesso. O Conselho faz isso dentro do próprio sistema, sem chamar ninguém técnico.
- A senha da paróquia também pode ser trocada pela própria equipe, na tela do sistema (opção de trocar senha).
- **Esqueceu a senha da conta do Conselho?** Esse caso provavelmente exige a pessoa técnica (a conta inicial do
  Conselho é criada por ela, por fora do site). Chame-a em vez de tentar adivinhar a senha várias vezes.
- Nunca mande a senha por mensagem sem apagar depois, e nunca a coloque em grupo grande.

## 7. O que NÃO fazer sozinho

- **Não** apagar, mexer ou "limpar" nada nos painéis do Neon, AWS, Render ou Vercel. Um clique errado pode
  apagar os dados de todas as paróquias e não tem desfazer garantido.
- **Não** compartilhar as senhas desses painéis fora da lista de pessoas responsáveis.
- **Não** tentar "consertar" o sistema instalando ou atualizando coisas no computador.
- **Não** apagar fichas de pessoas para "limpar a lista": use a opção de **desativar** a ficha, que guarda o
  histórico e registra o motivo.
- **Não** pedir para alguém de fora "dar uma olhada" no sistema sem passar pela pessoa técnica: ele
  teria acesso a dados de pessoas, inclusive menores.

## 8. Custos e renovações

Alguns desses serviços têm plano gratuito com limites, e alguns podem pedir cartão ou renovação.

| Serviço | Plano hoje    | Quem paga / renova | Vence em      |
| ------- | ------------- | ------------------ | ------------- |
| Neon    | `[PREENCHER]` | `[PREENCHER]`      | `[PREENCHER]` |
| AWS     | `[PREENCHER]` | `[PREENCHER]`      | `[PREENCHER]` |
| Render  | `[PREENCHER]` | `[PREENCHER]`      | `[PREENCHER]` |
| Vercel  | `[PREENCHER]` | `[PREENCHER]`      | `[PREENCHER]` |

Se um serviço mandar aviso de cobrança, limite ou suspensão por e-mail, **encaminhe imediatamente** para a
pessoa técnica. E-mails desses serviços não devem cair só na caixa de uma pessoa que pode sair.

## 9. Para a pessoa técnica que for assumir

Comece por: `readme.md` (como rodar), `docs/deploy.md` (como a produção está montada e o checklist),
`docs/producao.md` (o que ainda falta) e `CLAUDE.md` (índice de tudo). As regras do Segue-me que o sistema
nunca pode violar estão em `docs/regras-imutaveis.md`.
