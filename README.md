# Ateliê Ayza — frontend

Aplicação frontend do projeto Ateliê Ayza, construída com React, TypeScript, Vite e
React Router.

> **Estado atual:** o projeto está no esqueleto navegável. Layout, cores e navegação
> entre as telas estão prontos; o conteúdo das telas foi propositalmente removido e
> será implementado nas próximas etapas. O backlog detalhado fica em
> [`PENDENCIAS_US3.md`](./PENDENCIAS_US3.md).

## Requisitos

- Node.js 20.19+ (ou 22.12+)
- npm

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

## Variáveis de ambiente

| Variável        | Descrição                                 | Padrão local            |
| --------------- | ----------------------------------------- | ----------------------- |
| `VITE_DEV_PORT` | Porta do servidor de desenvolvimento Vite | `5173`                  |
| `VITE_API_URL`  | URL base da API do repositório backend    | `http://localhost:3000` |

O frontend inicia em `http://localhost:5173` por padrão. Essa porta é independente da porta da API: `VITE_API_URL` permanece em `http://localhost:3000`. Variáveis `VITE_*` são incluídas no bundle do navegador; não coloque segredos nelas. O backend separado atualmente expõe Swagger em `http://localhost:3000/api/docs`.

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
├── index.html              # HTML base, fontes (Inter + Hubballi) e meta theme-color
├── vite.config.ts          # plugin React e porta via VITE_DEV_PORT
├── tsconfig*.json          # configuração TypeScript (app e node)
├── .oxlintrc.json          # regras do Oxlint
├── .prettierrc.json        # regras do Prettier
├── .env.example            # variáveis de ambiente de exemplo
├── README.md               # este guia
├── PENDENCIAS_US3.md       # backlog da US3
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

#### `src/assets/`

Imagens e ícones usados pela interface, importados diretamente nos componentes ou
via `mask` no CSS.

| Arquivo             | Uso                                                      |
| ------------------- | -------------------------------------------------------- |
| `seta-esquerda.svg` | Seta do link "Voltar" (invertida via `transform` no CSS) |
| `seta-direita.svg`  | Seta do botão de avanço (mask em `.seta`)                |

A marca não fica aqui: o desenho e a assinatura são componentes SVG inline em
`src/components/` (`LogoDesenho.tsx` e `LogoAssinatura.tsx`), para permitir
recolorir por `currentColor`.

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

#### `src/data/`

| Arquivo     | O que contém                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `etapas.ts` | Fonte única das etapas do pedido: `slug`, `titulo` e `rotuloAcao`. Também expõe `indiceDaEtapa` e `etapaPorSlug` |

Ao adicionar, remover ou renomear uma etapa, altere primeiro `etapas.ts`: a barra
de etapas, o rodapé e o roteamento do layout do pedido derivam dessa lista.

#### `src/layouts/`

| Layout                 | Estrutura                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ClienteLayout.tsx`    | Cabeçalho com logo à esquerda e `TabSwitch` à direita; renderiza a tela atual no `Outlet`                                      |
| `GestaoLayout.tsx`     | Cabeçalho centralizado com logo compacta e `NavPill`; renderiza a tela atual no `Outlet`                                       |
| `PedidoNovoLayout.tsx` | `StepBar` + `Outlet` + `StepFooter`. Lê a etapa pela URL, redireciona slugs inválidos para `modelo` e calcula anterior/próxima |

#### `src/pages/`

Telas separadas por área. Cada arquivo exporta um componente de página usado em
`App.tsx`.

| Pasta      | Arquivos                                                                               | Situação                                                                       |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `cliente/` | `Inicio.tsx`, `MeusPedidos.tsx`, `Login.tsx`, `NotFound.tsx`                           | Início e Login ainda têm conteúdo; Meus pedidos tem só o botão de novo pedido  |
| `pedido/`  | `Modelo.tsx`, `Tecido.tsx`, `Tamanho.tsx`, `Aderecos.tsx`, `Resumo.tsx`, `Entrega.tsx` | Todos vazios (`return null`), existem para manter as rotas e a navegação       |
| `gestao/`  | `Dashboard.tsx`, `Pedidos.tsx`, `Estoque.tsx`, `Agenda.tsx`                            | Dashboard, Pedidos e Agenda vazios; Estoque tem sub-abas e 3 subpáginas vazias |

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

| Arquivo         | Responsabilidade                                                   |
| --------------- | ------------------------------------------------------------------ |
| `App.tsx`       | Declara todas as rotas e aninha as páginas nos layouts             |
| `main.tsx`      | Monta o React no `#root` e envolve a aplicação com `BrowserRouter` |
| `vite-env.d.ts` | Referência de tipos do Vite                                        |

## Mapa de telas

### Área da cliente

| Rota                    | Componente    | Já existe                                                | Falta implementar                                       |
| ----------------------- | ------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `/`                     | `Inicio`      | Hero com texto e botões para montar pedido e ver pedidos | Decidir se a tela permanece e conectar os CTAs ao fluxo |
| `/meus-pedidos`         | `MeusPedidos` | Cabeçalho e botão **+ Fazer Novo Pedido**                | Lista de pedidos, estados vazio/carregando/erro         |
| `/pedido/novo/modelo`   | `Modelo`      | Cabeçalho, barra de etapas e rodapé                      | Escolha do modelo do top e da calcinha                  |
| `/pedido/novo/tecido`   | `Tecido`      | Cabeçalho, barra de etapas e rodapé                      | Escolha da malha/tecido                                 |
| `/pedido/novo/tamanho`  | `Tamanho`     | Cabeçalho, barra de etapas e rodapé                      | Tamanhos, foto de referência e observações              |
| `/pedido/novo/aderecos` | `Aderecos`    | Cabeçalho, barra de etapas e rodapé                      | Seleção e marcação dos adereços na peça                 |
| `/pedido/novo/resumo`   | `Resumo`      | Cabeçalho, barra de etapas e rodapé                      | Revisão dos itens e totais                              |
| `/pedido/novo/entrega`  | `Entrega`     | Cabeçalho, barra de etapas e rodapé                      | Contato, endereço, CEP e forma de envio                 |

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

| Rota     | Componente | Já existe                                            | Falta implementar                                 |
| -------- | ---------- | ---------------------------------------------------- | ------------------------------------------------- |
| `/login` | `Login`    | Tela mock com logo, aviso e botão "Entre com Google" | Autenticação real e redirecionamento após o login |
| `*`      | `NotFound` | Página 404 com link para o início                    | —                                                 |

## Como funciona o fluxo de personalização hoje

1. `/pedido/novo` redireciona para `/pedido/novo/modelo`.
2. `PedidoNovoLayout` identifica a etapa pela URL e monta `StepBar` + conteúdo + `StepFooter`.
3. Todas as etapas estão liberadas e podem ser acessadas pela barra ou pela URL.
4. O rodapé mostra "Voltar" a partir da segunda etapa e o botão de avanço com o rótulo da próxima seção (`Próximo: Tecido`, `Próximo: Tamanho`, `Próximo: Adereços`, `Ver Resumo`, `Seguir para Entrega`, `Confirmar Pedido`).
5. Em `Entrega`, "Confirmar Pedido" leva para `/meus-pedidos`. Ainda não há validação, rascunho nem persistência.

Quando o conteúdo voltar, o ponto natural de entrada é cada arquivo em
`src/pages/pedido/`, mantendo `src/data/etapas.ts` como fonte das etapas.

## Padrões de interface

- **Mobile-first:** a coluna tem largura máxima de `402px` e fica centralizada em telas maiores.
- **Cores base (Estoque):** fundo `#FFEEE5`, botões `#B47C6B` com texto `#FFEEE5`.
- **Tipografia:** Inter para texto e Hubballi para títulos e assinaturas.
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
