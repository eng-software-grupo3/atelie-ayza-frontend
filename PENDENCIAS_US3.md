# Pendências — US3: Setup do frontend

Acompanhamento das tarefas da US3 e do que falta para o frontend sair do esqueleto
navegável e ganhar conteúdo.

- **Última atualização:** 29/10/2026
- **Estado:** rotas, layouts, tokens e navegação prontos; telas de conteúdo vazias por decisão de escopo.
- **Guia de estrutura e telas:** [`README.md`](./README.md)

## Decisões já tomadas

- Base de cores única em todas as telas: fundo `#FFEEE5`, botões `#B47C6B` com texto `#FFEEE5`.
- Mobile-first, com coluna limitada a `402px` e centralizada.
- CSS global em `src/styles/global.css` (tokens + classes), sem CSS modules e sem Tailwind.
- Navegação sempre com `NavLink` e estado ativo derivado da rota.
- Toggle `Montar | Meus pedidos` e nav da gestão são links reais.
- O botão de avanço de cada etapa usa o rótulo da próxima seção.
- As telas de conteúdo foram esvaziadas nesta etapa: o foco é validar layout, cores e navegação.
- A marca é composta por SVG inline, então as cores do desenho e da assinatura são alteráveis por `currentColor` (props `corDesenho` / `corAssinatura` no `Logo`).
- Nenhum dado de pedido é salvo por enquanto: não há rascunho, validação nem persistência.

## Concluído

- [x] Configuração do projeto: React, Vite, TypeScript, Oxlint, Prettier e scripts npm.
- [x] React Router instalado e configurado, com rota coringa `*`.
- [x] Rotas da cliente, do pedido novo, da gestão e do login criadas.
- [x] Layout da cliente com logo e toggle `Montar | Meus pedidos`.
- [x] Layout da gestão com logo centralizada e nav `Dashboard · Pedidos · Estoque · Agenda`.
- [x] Layout do pedido novo com barra de etapas, conteúdo e rodapé fixo.
- [x] Tokens de cor e tipografia (Inter + Hubballi) extraídos do protótipo do Figma.
- [x] Assets das setas adicionados em `src/assets/`.
- [x] Marca vetorizada e convertida em componentes SVG inline (`LogoDesenho` e `LogoAssinatura`), com cores alteráveis por `currentColor`.
- [x] Meus pedidos com o botão **+ Fazer Novo Pedido** levando para `/pedido/novo/modelo`.
- [x] Estoque com sub-abas `Tecidos · Adereços · Modelos`.
- [x] Página 404 com link para o início.
- [x] `npm run lint` e `npm run build` passando.

## Telas — o que falta em cada uma

### Cliente

- [ ] `/` (Início): decidir se a tela permanece e conectar os CTAs ao fluxo real.
- [ ] `/meus-pedidos`: listar pedidos da cliente, com estados de carregando, vazio e erro.
- [ ] `/meus-pedidos`: abrir detalhe/status de um pedido.
- [ ] `/login`: substituir o mock por autenticação real e redirecionar após o login.

### Pedido novo — conteúdo das etapas

Cada arquivo em `src/pages/pedido/` hoje retorna `null`. O conteúdo deve ser
implementado dentro do layout existente, sem recriar a barra de etapas nem o rodapé.

- [ ] `Modelo.tsx`: seleção do modelo do top e da calcinha, com preço.
- [ ] `Tecido.tsx`: seleção da malha/tecido, com preço.
- [ ] `Tamanho.tsx`: tamanhos de top e calcinha, foto de referência e observações de caimento.
- [ ] `Aderecos.tsx`: adereços disponíveis, quantidade e pontos marcados na peça.
- [ ] `Resumo.tsx`: revisão dos itens escolhidos, totais e links para alterar cada etapa.
- [ ] `Entrega.tsx`: nome, telefone, endereço, CEP e forma de envio/retirada.
- [ ] Exibir subtotal, frete e total em todas as etapas, com o padrão visual do protótipo.

### Fluxo do pedido

- [ ] Guardar o rascunho em um contexto compartilhado, com persistência em `localStorage`.
- [ ] Validar o preenchimento de cada etapa antes de liberar o avanço.
- [ ] Bloquear acesso direto a etapas futuras e redirecionar para a última etapa liberada.
- [ ] Salvar o pedido ao confirmar a entrega e exibir em Meus pedidos e na gestão.
- [ ] Conectar modelos, tecidos, tamanhos e adereços ao estoque real da API.
- [ ] Anexar foto de referência e observações de medidas ao pedido.
- [ ] Definir o comportamento de "Confirmar Pedido" com pagamento ou envio para produção.

### Gestão

- [ ] `/gestao` (Dashboard): status geral por etapa, fim de estoque e despachos futuros.
- [ ] `/gestao/pedidos`: pedidos recebidos pelo site e pedidos em andamento.
- [ ] `/gestao/estoque/tecidos`: lista de tecidos, metros disponíveis e ação de repor.
- [ ] `/gestao/estoque/aderecos`: lista de adereços, unidades disponíveis e ação de repor.
- [ ] `/gestao/estoque/modelos`: modelos cadastrados e peças em produção.
- [ ] `/gestao/agenda`: compromissos, despachos e entregas agrupados por data.
- [ ] Definir se a gestão terá ações de edição/criação ou apenas leitura nesta fase.

## Autenticação mockada e proteção de rotas

- [ ] Criar estado de autenticação centralizado, por exemplo com `AuthContext`.
- [ ] Disponibilizar operações `login`, `logout` e estado `isAuthenticated`.
- [ ] Criar `ProtectedRoute` e proteger todas as rotas `/gestao/*`.
- [ ] Redirecionar usuários não autenticados para `/login`.
- [ ] Após login mockado, retornar à rota de gestão originalmente solicitada.
- [ ] Adicionar ação de sair que encerra a sessão mockada e retorna para `/login`.

## Cliente HTTP e integração com a API

- [ ] Criar uma instância única de cliente HTTP em `src/services/` usando `VITE_API_URL`.
- [ ] Definir como o token de autenticação será obtido e enviado no cabeçalho quando existir.
- [ ] Tratar respostas `401` para encerrar a autenticação e redirecionar para `/login`.
- [ ] Normalizar erros da API em mensagens amigáveis para a interface.
- [ ] Confirmar o contrato de autenticação e os endpoints no repositório backend antes da integração real.
- [ ] Configurar CORS no backend em uma tarefa separada, quando a integração entre aplicações for iniciada.
- [ ] Recriar a pasta `src/services/`, removida junto com a persistência temporária em `localStorage`.

## Componentes compartilhados

- [ ] Criar `Button` com variantes primária, secundária e de perigo, estados desabilitado e carregando.
- [ ] Criar `Input` com label, placeholder, mensagem de erro e suporte a `text`, `number`, `date` e `password`.
- [ ] Criar `ConfirmModal` com confirmação, cancelamento, fechamento por Esc e clique fora.
- [ ] Criar componente de alerta/feedback para sucesso e erro, com opção de fechar.
- [ ] Criar componente de estado vazio/carregando reutilizável.
- [ ] Exportar os componentes por um ponto único, por exemplo `src/components/index.ts`.
- [ ] Criar uma página de exemplo que demonstre os componentes compartilhados.

Observação: os estilos base de botão, cartão, campo, alerta, opção, chip, lista e
totais já existem em `src/styles/global.css`, mas ainda não foram extraídos para
componentes reutilizáveis.

## Qualidade e documentação

- [x] Comparar os layouts com o protótipo do Figma.
- [x] Confirmar que `npm run lint` e `npm run build` continuam passando após cada etapa.
- [x] Documentar estrutura de pastas, telas e rotas no `README.md`.
- [ ] Revisar a implementação em Pull Request e comunicar à equipe como adicionar novas telas.
- [ ] Definir se a coluna de `402px` permanece em telas grandes ou se haverá layout expandido.
- [ ] Avaliar a remoção das classes de conteúdo ainda não usadas em `global.css` caso o escopo mude.
