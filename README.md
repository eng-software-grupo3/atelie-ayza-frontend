# Ateliê Ayza — frontend

Aplicação frontend do projeto Ateliê Ayza, construída com React, TypeScript, Vite e
React Router.

> **Estado atual:** esqueleto navegável com login integrado. Layout, cores, navegação
> e autenticação com Google estão prontos; o conteúdo das telas foi propositalmente
> removido e será implementado nas próximas etapas. O backlog fica em
> [`PENDENCIAS_US3.md`](./PENDENCIAS_US3.md) (estrutura e telas) e
> [`PENDENCIAS_US4.md`](./PENDENCIAS_US4.md) (login e sessão).

## Requisitos

- Node.js 20.19+ (ou 22.12+)
- npm

## Ambiente completo (frontend + API + banco)

Este repositório é só a interface. O login e os dados dependem da API e do
PostgreSQL do repositório `atelie-ayza-backend`. Sem os dois no ar, a tela abre,
mas o botão **Entrar com Google** não conclui a entrada.

| Serviço         | URL                     | Onde                     |
| --------------- | ----------------------- | ------------------------ |
| Frontend (Vite) | `http://localhost:5173` | este repositório         |
| API (NestJS)    | `http://localhost:3000` | `../atelie-ayza-backend` |
| PostgreSQL      | `localhost:5432`        | banco `atelie_ayza`      |

Passo a passo:

1. Suba o banco e a API seguindo o README do backend (seções 2 a 5):
   [`../atelie-ayza-backend/README.md`](../atelie-ayza-backend/README.md).
2. Confirme que a API responde em <http://localhost:3000/api/docs>.
3. Volte para este repositório e rode `npm run dev`.

Cada repositório tem o seu próprio `.env`. O do frontend só contém variáveis
`VITE_*`; o segredo do Google fica **apenas** no backend, porque tudo que começa
com `VITE_` vai para o bundle e fica visível no navegador.

## Instalação e execução

```bash
npm install
```

Crie um arquivo `.env` na raiz com as variáveis locais. Você pode começar copiando o exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell, use `Copy-Item .env.example .env`. Em seguida, inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O Vite informa no terminal o endereço local para abrir no navegador.

### Testar no celular

O servidor já sobe exposto na rede local (`server.host` em `vite.config.ts`), com a
porta fixa de `VITE_DEV_PORT`. Para abrir no celular:

1. Conecte o celular na **mesma rede Wi-Fi** do PC.
2. Descubra o IP do PC:
   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }
   ```
3. Rode `npm run dev` e abra no celular `http://<IP-DO-PC>:5173` (por exemplo,
   `http://192.168.0.100:5173`). O terminal também mostra a linha `Network:` com essa URL.
4. Na primeira execução, o Windows pode pedir para liberar o Node.js no firewall:
   marque **Redes privadas**. Se o prompt não aparecer, crie a regra uma vez em um
   PowerShell como administrador:
   ```powershell
   New-NetFirewallRule -DisplayName "Vite Dev 5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Private
   ```

Ao salvar qualquer arquivo no PC, o celular atualiza sozinho (HMR do Vite). Para
deixar com cara de app, use **Adicionar à tela inicial** no navegador do celular: o
`public/manifest.webmanifest` define o nome **Ayza**, o ícone e o modo standalone.

> Em HTTP na rede local o navegador cria um atalho, não uma PWA instalável com
> funcionamento offline (isso exige HTTPS). Para instalação real seria preciso um
> túnel com HTTPS ou um certificado local confiável no celular.

Se a página não abrir no celular, verifique, nesta ordem: celular na mesma rede,
firewall liberado, IP correto (ele pode mudar via DHCP) e se a porta `5173` não está
em uso por outro processo.

## Variáveis de ambiente

| Variável        | Descrição                                 | Padrão local            |
| --------------- | ----------------------------------------- | ----------------------- |
| `VITE_DEV_PORT` | Porta do servidor de desenvolvimento Vite | `5173`                  |
| `VITE_API_URL`  | URL base da API do repositório backend    | `http://localhost:3000` |

O frontend inicia em `http://localhost:5173` por padrão e também fica acessível pelo IP do PC na rede local (veja [Testar no celular](#testar-no-celular)). Essa porta é independente da porta da API: `VITE_API_URL` permanece em `http://localhost:3000`. Variáveis `VITE_*` são incluídas no bundle do navegador; não coloque segredos nelas. O backend separado atualmente expõe Swagger em `http://localhost:3000/api/docs`.

## Scripts

| Comando           | Descrição                                             |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Inicia o servidor de desenvolvimento                  |
| `npm run build`   | Valida os tipos TypeScript e gera o build de produção |
| `npm run preview` | Serve localmente o build de produção                  |
| `npm run lint`    | Executa Oxlint nos fontes                             |
| `npm run format`  | Formata os arquivos com Prettier                      |

## Estrutura do projeto

```text
atelie-ayza-frontend/
├── index.html              # HTML base, fontes (Inter + Hubballi), manifest e metas de app
├── vite.config.ts          # plugin React, porta via VITE_DEV_PORT e host na rede local
├── tsconfig*.json          # configuração TypeScript (app e node)
├── .oxlintrc.json          # regras do Oxlint
├── .prettierrc.json        # regras do Prettier
├── .env.example            # variáveis de ambiente de exemplo
├── README.md               # este guia
├── PENDENCIAS_US3.md       # backlog da US3
├── public/                 # manifest, ícones e favicon servidos na raiz
└── src/
    ├── assets/             # logos e ícones
    ├── components/         # componentes compartilhados
    ├── data/               # dados estáticos e configuração das etapas
    ├── layouts/            # layouts das áreas (cliente, gestão, pedido novo)
    ├── pages/              # telas separadas por área
    │   ├── cliente/
    │   ├── pedido/
    │   └── gestao/
    ├── styles/             # tokens e estilos globais
    ├── App.tsx             # árvore de rotas
    ├── main.tsx            # bootstrap do React + BrowserRouter
    └── vite-env.d.ts       # tipos do Vite
```

### O que há em cada pasta

#### `public/`

Arquivos servidos na raiz do site, sem passar pelo bundler. São eles que dão o
ícone e o comportamento de app ao abrir pelo celular.

| Arquivo                           | Uso                                                         |
| --------------------------------- | ----------------------------------------------------------- |
| `manifest.webmanifest`            | Nome **Ayza**, cores, `display: standalone` e ícones do app |
| `icone-192.png` / `icone-512.png` | Ícones usados pelo manifest e pelo navegador                |
| `icone-maskable-512.png`          | Versão com margem de segurança para o recorte do Android    |
| `apple-touch-icon.png`            | Ícone do atalho no iOS                                      |
| `favicon.svg`                     | Favicon da aba do navegador                                 |

Os SVGs (`icone.svg`, `icone-maskable.svg`, `favicon.svg`) são a fonte dos PNGs; ao
mudar a marca, regere os PNGs a partir deles (por exemplo com `npx sharp-cli`).

#### `src/assets/`

Imagens e ícones usados pela interface, importados diretamente nos componentes ou
via `mask` no CSS.

| Arquivo             | Uso                                                      |
| ------------------- | -------------------------------------------------------- |
| `seta-esquerda.svg` | Seta do link "Voltar" (invertida via `transform` no CSS) |
| `seta-direita.svg`  | Seta do botão de avanço (mask em `.seta`)                |

A subpasta `home/` guarda os assets da home: `marca.png` (flor da marca),
`assinatura-1.svg` e `assinatura-2.svg` (letreiros "Ayza Silva"), `ayza.png`
(retrato da fundadora), `catalogo.png` (foto do biquíni usada no catálogo) e os
ícones do rodapé `icone-whatsapp.svg`, `icone-instagram.svg` e
`icone-localizacao.svg`.

A marca também existe como componente SVG inline em `src/components/`
(`LogoDesenho.tsx` e `LogoAssinatura.tsx`), para permitir recolorir por
`currentColor`.

#### `src/components/`

Componentes reutilizados por mais de uma tela. Ainda não há exportação por um
ponto único (`index.ts`).

| Componente           | O que faz                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Logo.tsx`           | Marca (desenho + assinatura + "ATELIÊ"). Props: `to` (link; string vazia desativa o link), `compacto`, `corDesenho` e `corAssinatura` |
| `LogoDesenho.tsx`    | Desenho da marca em SVG inline. Aceita `className` e `cor`; sem `cor`, herda `currentColor` (padrão `#C8A195`)                        |
| `LogoAssinatura.tsx` | Assinatura "Ayza Silva" em SVG inline. Aceita `className` e `cor`; sem `cor`, herda `currentColor` (padrão `#9D9D9D`)                 |
| `NavPill.tsx`        | Navegação da gestão com `Dashboard`, `Pedidos`, `Estoque` e `Agenda`, destacando a rota ativa                                         |
| `TabSwitch.tsx`      | Alternador da cliente `Montar \| Meus pedidos`, com estado ativo                                                                      |
| `StepBar.tsx`        | Barra das 6 etapas do pedido, com todas as etapas clicáveis e a atual em destaque                                                     |
| `StepFooter.tsx`     | Rodapé fixo do pedido: link "Voltar" (quando existe etapa anterior) e botão de avanço com o rótulo da próxima seção                   |
| `ProtectedRoute.tsx` | Guarda de rota por área: `gestao` exige `isAdmin`; `cliente` exige quem não é admin. Sem sessão, redireciona para `/login`            |

#### `src/data/`

| Arquivo     | O que contém                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `etapas.ts` | Fonte única das etapas do pedido: `slug`, `titulo` e `rotuloAcao`. Também expõe `indiceDaEtapa` e `etapaPorSlug` |

Ao adicionar, remover ou renomear uma etapa, altere primeiro `etapas.ts`: a barra
de etapas, o rodapé e o roteamento do layout do pedido derivam dessa lista.

#### `src/layouts/`

| Layout                 | Estrutura                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ClienteLayout.tsx`    | Cabeçalho com logo à esquerda, `TabSwitch` e botão **Sair**; usado por `Meus pedidos` e pelo fluxo do pedido                   |
| `GestaoLayout.tsx`     | Cabeçalho com logo compacta, `NavPill` e botão **Sair**; renderiza a tela atual no `Outlet`                                    |
| `PedidoNovoLayout.tsx` | `StepBar` + `Outlet` + `StepFooter`. Lê a etapa pela URL, redireciona slugs inválidos para `modelo` e calcula anterior/próxima |

#### `src/pages/`

Telas separadas por área. Cada arquivo exporta um componente de página usado em
`App.tsx`.

| Pasta      | Arquivos                                                                               | Situação                                                                       |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `auth/`    | `AuthCallback.tsx`                                                                     | Lê os tokens do hash, limpa a URL e encaminha para a área do papel             |
| `cliente/` | `Home.tsx`, `MeusPedidos.tsx`, `Login.tsx`, `NotFound.tsx`                             | Home pública; Login inicia o OAuth; Meus pedidos tem só o botão de novo pedido |
| `pedido/`  | `Modelo.tsx`, `Tecido.tsx`, `Tamanho.tsx`, `Aderecos.tsx`, `Resumo.tsx`, `Entrega.tsx` | Todos vazios (`return null`), existem para manter as rotas e a navegação       |
| `gestao/`  | `Dashboard.tsx`, `Pedidos.tsx`, `Estoque.tsx`, `Agenda.tsx`                            | Dashboard, Pedidos e Agenda vazios; Estoque tem sub-abas e 3 subpáginas vazias |

#### `src/contexts/` e `src/services/`

| Arquivo                    | O que faz                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `contexts/AuthContext.tsx` | Estado da sessão (`usuario`, `carregando`), restauração via `/auth/me`, `entrar`, `sair` e `concluirLogin`                |
| `services/api.ts`          | `fetch` com `Authorization`, renovação automática em `401` via `/auth/refresh` e evento `atelie:sessao-expirada`          |
| `services/auth.ts`         | Tipos do contrato, `VITE_API_URL`, persistência dos tokens em `localStorage`, rota de retorno e regra de acesso por papel |

#### `src/styles/`

| Arquivo      | O que contém                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `global.css` | Tokens de cor, tipografia, reset e classes de layout, navegação, etapas, botões e conteúdo. É o único CSS do projeto (sem CSS modules) |

Grupos de classes disponíveis:

- **Estrutura:** `.app-frame`, `.app-header`, `.app-main`, `.acoes`
- **Marca:** `.logo`, `.logo__icone`, `.logo__assinatura`, `.logo__ateliê` — as cores padrão vêm dos tokens `--cor-logo-desenho` e `--cor-logo-assinatura`
- **Navegação:** `.nav-pill`, `.tab-switch`, `.step-bar`
- **Etapas:** `.step-footer`, `.seta`
- **Botões:** `.botao`, `.botao--secundario`, `.botao--perigo`, `.botao--bloco`, `.botao--pequeno`
- **Conteúdo (prontas para as próximas etapas):** `.cartao`, `.lista`, `.secao`, `.opcao`, `.chip`, `.campo`, `.totais`, `.grade-status`, `.status`, `.alerta`, `.hero`, `.login`

#### Raiz de `src/`

| Arquivo         | Responsabilidade                                                                    |
| --------------- | ----------------------------------------------------------------------------------- |
| `App.tsx`       | Declara todas as rotas e aninha as páginas nos layouts                              |
| `main.tsx`      | Monta o React no `#root` e envolve a aplicação com `BrowserRouter` e `AuthProvider` |
| `vite-env.d.ts` | Referência de tipos do Vite                                                         |

## Mapa de telas

### Área da cliente

| Rota                    | Componente    | Já existe                                                                         | Falta implementar                                    |
| ----------------------- | ------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/`                     | `Home`        | Home pública com apresentação da Ayza, sobre o ateliê, catálogo em grade e rodapé | Botão **Login** vira **Minha área** quando há sessão |
| `/meus-pedidos`         | `MeusPedidos` | Cabeçalho e botão **+ Fazer Novo Pedido**                                         | Lista de pedidos, estados vazio/carregando/erro      |
| `/pedido/novo/modelo`   | `Modelo`      | Cabeçalho, barra de etapas e rodapé                                               | Escolha do modelo do top e da calcinha               |
| `/pedido/novo/tecido`   | `Tecido`      | Cabeçalho, barra de etapas e rodapé                                               | Escolha da malha/tecido                              |
| `/pedido/novo/tamanho`  | `Tamanho`     | Cabeçalho, barra de etapas e rodapé                                               | Tamanhos, foto de referência e observações           |
| `/pedido/novo/aderecos` | `Aderecos`    | Cabeçalho, barra de etapas e rodapé                                               | Seleção e marcação dos adereços na peça              |
| `/pedido/novo/resumo`   | `Resumo`      | Cabeçalho, barra de etapas e rodapé                                               | Revisão dos itens e totais                           |
| `/pedido/novo/entrega`  | `Entrega`     | Cabeçalho, barra de etapas e rodapé                                               | Contato, endereço, CEP e forma de envio              |

### Área da gestão

| Rota                       | Componente                    | Já existe                          | Falta implementar                                |
| -------------------------- | ----------------------------- | ---------------------------------- | ------------------------------------------------ |
| `/gestao`                  | `Dashboard`                   | Cabeçalho centralizado e navegação | Status geral, fim de estoque e despachos futuros |
| `/gestao/pedidos`          | `Pedidos`                     | Cabeçalho centralizado e navegação | Pedidos recebidos e pedidos em andamento         |
| `/gestao/estoque/tecidos`  | `Estoque` + `EstoqueTecidos`  | Cabeçalho, navegação e sub-abas    | Lista de tecidos, quantidades e ação de repor    |
| `/gestao/estoque/aderecos` | `Estoque` + `EstoqueAderecos` | Cabeçalho, navegação e sub-abas    | Lista de adereços, quantidades e ação de repor   |
| `/gestao/estoque/modelos`  | `Estoque` + `EstoqueModelos`  | Cabeçalho, navegação e sub-abas    | Lista de modelos e peças em produção             |
| `/gestao/agenda`           | `Agenda`                      | Cabeçalho centralizado e navegação | Compromissos, despachos e entregas por data      |

### Autenticação e rotas gerais

| Rota             | Componente     | Já existe                                                            | Falta implementar |
| ---------------- | -------------- | -------------------------------------------------------------------- | ----------------- |
| `/login`         | `Login`        | Marca do ateliê e botão "Entrar com Google" ligado à API             | —                 |
| `/auth/callback` | `AuthCallback` | Recebe os tokens, limpa o hash da URL e redireciona conforme o papel | —                 |
| `*`              | `NotFound`     | Página 404 pública com link para o início                            | —                 |

#### Como funciona o login

1. Em `/login`, "Entrar com Google" faz navegação completa para `{VITE_API_URL}/auth/google`.
2. A API conduz o OAuth e redireciona para `{FRONTEND_URL}/auth/callback#access_token=...&refresh_token=...`.
3. `AuthCallback` remove o hash da URL, guarda os tokens e chama `GET /auth/me`.
4. Com `isAdmin=true` a pessoa vai para `/gestao`; com `isAdmin=false`, para `/meus-pedidos`.
5. `ProtectedRoute` impede o acesso cruzado: a gestão exige admin e a área da cliente exige quem não é admin.
6. O access token dura 15 minutos e é renovado automaticamente via `/auth/refresh`; se a renovação falhar, a sessão é encerrada e a pessoa volta ao login.
7. O botão **Sair** chama `/auth/logout`, revoga a sessão no backend e limpa o `localStorage`.

Os tokens ficam em `localStorage` (decisão de escopo) e o hash é limpo antes de qualquer chamada de rede. O redirect URI cadastrado no Google precisa ser o do backend (`GOOGLE_CALLBACK_URL`), nunca o do frontend.

## Como funciona o fluxo de personalização hoje

1. `/pedido/novo` redireciona para `/pedido/novo/modelo`.
2. `PedidoNovoLayout` identifica a etapa pela URL e monta `StepBar` + conteúdo + `StepFooter`.
3. Todas as etapas estão liberadas e podem ser acessadas pela barra ou pela URL.
4. O rodapé mostra "Voltar" a partir da segunda etapa e o botão de avanço com o rótulo da próxima seção (`Próximo: Tecido`, `Próximo: Tamanho`, `Próximo: Adereços`, `Ver Resumo`, `Seguir para Entrega`, `Confirmar Pedido`).
5. Em `Entrega`, "Confirmar Pedido" leva para `/meus-pedidos`. Ainda não há validação, rascunho nem persistência.

Quando o conteúdo voltar, o ponto natural de entrada é cada arquivo em
`src/pages/pedido/`, mantendo `src/data/etapas.ts` como fonte das etapas.

## Padrões de interface

- **Mobile-first e responsivo:** a coluna tem `402px` no celular e cresce em telas maiores (`520px` a partir de `480px`, `680px` a partir de `768px` e `820px` a partir de `1100px`), sempre centralizada. As grades usam `auto-fit`, então o número de colunas acompanha a largura.
- **Alvos de toque:** em dispositivos com `pointer: coarse`, botões, chips e opções têm no mínimo `44px` de altura.
- **Espaçamentos fluidos:** `--espaco-lateral` e `--espaco-vertical` usam `clamp()` para acompanhar a largura da tela.
- **Cores base (Estoque):** fundo `#FFEEE5`, botões `#B47C6B` com texto `#FFEEE5`.
- **Tipografia:** Inter para texto, Hubballi para títulos e assinaturas e, no catálogo da home, Meow Script (oferta), Host Grotesk (detalhes) e Hubot Sans (preço).
- **Estados ativos:** sempre via `NavLink`, sem estado manual duplicado.
- **Nomenclatura de classes:** padrão BEM simplificado (`bloco__elemento--modificador`).

## Como adicionar uma nova tela

1. Crie o componente em `src/pages/<área>/NomeDaTela.tsx`.
2. Registre a rota em `src/App.tsx`, dentro do layout da área.
3. Se for uma etapa do pedido, acrescente o item em `src/data/etapas.ts` e a rota filha em `/pedido/novo`.
4. Reutilize as classes de `src/styles/global.css` em vez de criar CSS por tela.
5. Rode `npm run lint` e `npm run build` antes de abrir o Pull Request.

## Verificação

O projeto é validado com:

```bash
npm run lint
npm run build
```

Os dois comandos devem terminar sem erros ou avisos antes de cada entrega.
