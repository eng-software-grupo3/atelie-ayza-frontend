# Pendências — US3: Setup do frontend

Este documento acompanha as tarefas da US3 que ainda precisam ser implementadas. A configuração inicial do projeto já foi feita com React, Vite, TypeScript, Oxlint, Prettier, scripts npm e documentação básica.

## Rotas e páginas placeholder

- [ ] Instalar e configurar React Router.
- [ ] Criar páginas placeholder com o título de cada tela:
  - [ ] `/` — Início.
  - [ ] `/pedido/novo` — Realizar pedido.
  - [ ] `/meus-pedidos` — Meus pedidos.
  - [ ] `/login` — Login da área de gestão.
  - [ ] `/gestao` — Dashboard.
  - [ ] `/gestao/pedidos` — Pedidos.
  - [ ] `/gestao/estoque` — Estoque.
  - [ ] `/gestao/agenda` — Agenda.
- [ ] Criar rota coringa (`*`) com página de não encontrado e link para o início.

## Autenticação mockada e proteção de rotas

- [ ] Criar estado de autenticação centralizado, por exemplo com `AuthContext`.
- [ ] Disponibilizar operações `login`, `logout` e estado `isAuthenticated`.
- [ ] Criar `ProtectedRoute` e proteger todas as rotas `/gestao/*`.
- [ ] Redirecionar usuários não autenticados para `/login`.
- [ ] Após login mockado, retornar à rota de gestão originalmente solicitada.
- [ ] Adicionar ação de sair que encerra a sessão mockada e retorna para `/login`.

## Layouts — etapa posterior

Os layouts foram deixados para uma etapa posterior, conforme combinado. Ao retomá-los:

- [ ] Consultar o protótipo no Figma e extrair tokens de cor, tipografia e espaçamento.
- [ ] Criar o layout da área do Cliente.
- [ ] Criar o layout da área de Gestão.
- [ ] Indicar visualmente a rota ativa na navegação.
- [ ] Verificar o comportamento responsivo em telas menores.

## Cliente HTTP e integração com a API

- [ ] Criar uma instância única de cliente HTTP em `src/services/` usando `VITE_API_URL`.
- [ ] Definir como o token de autenticação será obtido e enviado no cabeçalho quando existir.
- [ ] Tratar respostas `401` para encerrar a autenticação e redirecionar para `/login`.
- [ ] Normalizar erros da API em mensagens amigáveis para a interface.
- [ ] Confirmar o contrato de autenticação e os endpoints no repositório backend antes da integração real.
- [ ] Configurar CORS no backend em uma tarefa separada, quando a integração entre aplicações for iniciada.

## Componentes compartilhados

- [ ] Criar `Button` com variantes primária, secundária e de perigo, estados desabilitado e carregando.
- [ ] Criar `Input` com label, placeholder, mensagem de erro e suporte a `text`, `number`, `date` e `password`.
- [ ] Criar `ConfirmModal` com confirmação, cancelamento, fechamento por Esc e clique fora.
- [ ] Criar componente de alerta/feedback para sucesso e erro, com opção de fechar.
- [ ] Exportar os componentes por um ponto único, por exemplo `src/components/index.ts`.
- [ ] Criar uma página de exemplo que demonstre os componentes compartilhados.

## Verificação e conclusão

- [ ] Comparar os layouts com o protótipo quando a etapa de layouts começar.
- [ ] Confirmar que `npm run lint` e `npm run build` continuam passando após cada etapa.
- [ ] Revisar a implementação em Pull Request e comunicar à equipe como adicionar novas telas.
