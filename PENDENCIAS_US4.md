# Pendências — US4: Login com Google e proteção de rotas

Acompanhamento da US4: autenticação real pelo Google, sessão persistida e separação
de acesso entre a gestora e a cliente.

- **Última atualização:** 02/11/2026
- **Estado:** concluída no frontend e validada manualmente de ponta a ponta.
- **Backend:** commit `f1674ea` (`feat: google oauth login`), branch `feat/us4-login`.
- **Guia de ambiente:** [`README.md`](./README.md) e
  [`../atelie-ayza-backend/README.md`](../atelie-ayza-backend/README.md).

## Objetivo

Substituir o login mockado por autenticação real com Google, encaminhar cada pessoa
para a área do seu papel e impedir o acesso cruzado entre as duas áreas.

## Critérios de aceite

- [x] A tela `/login` inicia o fluxo real de OAuth do backend.
- [x] Os tokens são recebidos, guardados e a URL é limpa.
- [x] `isAdmin=true` encaminha para `/gestao`.
- [x] `isAdmin=false` encaminha para `/meus-pedidos`.
- [x] A gestora não acessa `/meus-pedidos` nem `/pedido/novo/*`.
- [x] A cliente não acessa `/gestao/*`.
- [x] Sem sessão, as rotas protegidas redirecionam para `/login`.
- [x] Após o login, a pessoa volta à rota pedida quando o papel permite.
- [x] É possível sair, revogando a sessão no backend.
- [x] A sessão sobrevive a um recarregamento da página.

## Decisões tomadas

| Tema               | Decisão                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Início do login    | Navegação de página inteira para `{VITE_API_URL}/auth/google`            |
| Entrega dos tokens | Hash na URL do frontend: `{FRONTEND_URL}/auth/callback#access_token=...` |
| Armazenamento      | `localStorage` (decisão de escopo, ver riscos)                           |
| Limpeza do hash    | `history.replaceState` antes de qualquer chamada de rede                 |
| Fonte do papel     | `GET /auth/me`, lido do **banco** — não do token                         |
| Renovação          | `POST /auth/refresh` no primeiro `401`, com renovação única por vez      |
| Falha na renovação | Sessão local é limpa e o `ProtectedRoute` leva ao login                  |
| Saída              | `POST /auth/logout` (incrementa `tokenVersion`) e limpeza local          |

## Concluído

### Frontend

- [x] `src/services/auth.ts`: tipos do contrato, `VITE_API_URL`, persistência dos
      tokens, rota de retorno e regra de acesso por papel.
- [x] `src/services/api.ts`: `fetch` com `Authorization`, renovação automática em
      `401` e evento `atelie:sessao-expirada`.
- [x] `src/contexts/AuthContext.tsx`: estado da sessão, restauração via `/auth/me`,
      `sair` e `concluirLogin`.
- [x] `src/components/ProtectedRoute.tsx`: guarda por área (`cliente` / `gestao`).
- [x] `src/pages/auth/AuthCallback.tsx`: lê o hash, limpa a URL, consulta `/auth/me`
      e encaminha conforme o papel.
- [x] `src/App.tsx`: `/auth/callback` público e as duas áreas protegidas.
- [x] `src/pages/cliente/Login.tsx`: botão real para o OAuth e exibição de erros.
- [x] `ClienteLayout` e `GestaoLayout`: botão **Sair**.
- [x] `Home.tsx`: botão **Login** vira **Minha área** quando há sessão.
- [x] `global.css`: estilos do botão de sair e ajustes responsivos dos cabeçalhos.
- [x] `README.md`: seção "Ambiente completo" e fluxo de login documentados.

### Backend (já existente, consumido sem alterações)

- [x] `GET /auth/google` e `GET /auth/google/callback`.
- [x] `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`.
- [x] `AdminGuard` e `JwtAuthGuard` disponíveis no `AuthModule`.

## Validado manualmente

| Verificação                        | Resultado                                 |
| ---------------------------------- | ----------------------------------------- |
| Login com a conta de `ADMIN_EMAIL` | cai em `/gestao`                          |
| Login com outra conta Google       | cai em `/meus-pedidos`                    |
| Gestora abrindo `/meus-pedidos`    | redirecionada para `/gestao`              |
| Cliente abrindo `/gestao`          | redirecionada para `/meus-pedidos`        |
| Recarregar a página logado         | sessão mantida                            |
| Sair                               | volta para `/login` e a sessão é revogada |
| Rota protegida sem sessão          | redireciona para `/login`                 |
| `/auth/me` com token inválido      | `401`                                     |
| `/auth/me` com refresh token       | `401`                                     |
| CORS do frontend para a API        | liberado                                  |

## Fora de escopo nesta US

- **`AdminGuard` nas rotas administrativas.** Hoje o backend só expõe as rotas de
  autenticação, então não há o que proteger. Quando a US de gestão criar endpoints
  de pedidos, estoque e agenda, eles **precisam** usar
  `@UseGuards(JwtAuthGuard, AdminGuard)`. A proteção atual é de interface: sem o
  guard, uma cliente com token válido poderia chamar a API direto.
- **Testes automatizados.** O frontend ainda não tem runner de testes configurado.
  A validação desta US foi manual. Fica para as USs finais.
- **Tokens em `localStorage`.** Qualquer XSS consegue ler a sessão. É uma decisão
  de escopo; a alternativa seria cookie `HttpOnly`, que exige mudança no backend.
- **Login em outros dispositivos.** O Google só aceita `http://` em `localhost`.
  Testar no celular exige túnel HTTPS e um redirect URI adicional.

## Riscos conhecidos

| Risco                      | Impacto               | Mitigação atual                    |
| -------------------------- | --------------------- | ---------------------------------- |
| XSS lendo o `localStorage` | roubo de sessão       | nenhuma além do React escapar HTML |
| Guard só no frontend       | acesso indevido à API | aplicar `AdminGuard` na próxima US |
| `ADMIN_EMAIL` inexistente  | gestora não loga      | documentado no README do backend   |
| Access token de 15 min     | sessão curta          | renovação automática via refresh   |

## Como testar localmente

1. Suba banco, API e frontend conforme o [README](./README.md).
2. Abra `http://localhost:5173/login`.
3. Entre com o e-mail definido em `ADMIN_EMAIL` e confirme que cai em `/gestao`.
4. Entre com outra conta Google e confirme que cai em `/meus-pedidos`.
5. Tente abrir a área do outro papel pela barra de endereço.
6. Clique em **Sair** e confirme o retorno ao login.
