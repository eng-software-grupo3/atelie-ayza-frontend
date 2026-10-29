# Ateliê Ayza — frontend

Aplicação frontend do projeto Ateliê Ayza, construída com React, TypeScript e Vite.

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

## Estrutura inicial

```text
src/
├── styles/       # estilos globais
├── App.tsx       # ponto de entrada da aplicação
└── main.tsx      # montagem do React
```

As pastas de páginas, rotas, layouts, componentes e serviços serão adicionadas conforme essas partes entrarem no escopo de implementação.
