# Guia local — US de login com Google

Este guia reúne a configuração e os passos para executar e validar o login com Google. O sistema é dividido em dois repositórios: `atelie-ayza-backend` (API NestJS) e `atelie-ayza-frontend` (React/Vite). O frontend sozinho não autentica: a API e o PostgreSQL também precisam estar disponíveis. O fluxo abaixo é para desenvolvimento local: cada pessoa roda sua própria API e banco na máquina; não depende do IP ou nome do computador de outra pessoa.

## Endereços e fluxo

| Serviço | Endereço local | Responsabilidade |
| --- | --- | --- |
| Frontend (Vite) | `http://localhost:5173` | Tela de login e callback da aplicação |
| API (NestJS) | `http://localhost:3000` | Início do OAuth, callback Google e sessão |
| PostgreSQL | `localhost:5432` | Usuários e sessões |
| Swagger | `http://localhost:3000/api/docs` | Verificar se a API está ativa |

O botão do frontend faz uma navegação completa para `/auth/google` na própria origem do frontend. No desenvolvimento, o proxy do Vite encaminha essa rota e as chamadas `/api` para a API local em `http://localhost:3000`. A API redireciona ao Google. O Google retorna para **a API** em `/auth/google/callback`; depois a API redireciona para `http://localhost:5173/auth/callback` com o resultado. O frontend guarda os tokens e consulta `GET /auth/me` para obter o perfil e encaminhar a pessoa à área correta.

## Pré-requisitos

- Node.js 20.19+ (ou 22.12+) e npm.
- PostgreSQL 15 ou compatível, local ou via Docker.
- Credenciais OAuth 2.0 do tipo **Web application** no Google Cloud.
- O usuário definido como administrador precisa ser uma conta Google real e acessível.

## Configuração do Google OAuth

No Google Cloud Console, em **APIs e serviços → Credenciais**, crie ou abra um cliente OAuth 2.0 do tipo **Aplicativo da Web**. Adicione este URI em **URIs de redirecionamento autorizados**:

```text
http://localhost:3000/auth/google/callback
```

Copie o Client ID e o Client secret do mesmo cliente OAuth. Se a tela de consentimento estiver em modo de teste, adicione as contas de todos os parceiros que testarão o login como usuários de teste. Cada pessoa precisa configurar credenciais OAuth válidas no `.env` local do backend; distribua o Client secret por um canal seguro e nunca o versione. O redirect URI cadastrado no Google é o da **API**, não o do frontend, e é igual para todos (`localhost:3000`).

## Variáveis de ambiente

### Backend

Na raiz de `atelie-ayza-backend`, crie `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Revise estas configurações em `.env` (não compartilhe nem versione esse arquivo):

```dotenv
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=atelie_ayza
DB_PASSWORD=atelie_ayza
DB_DATABASE=atelie_ayza
DB_SYNCHRONIZE=true

# Deve ser uma conta Google real que você controla para testar o papel admin.
ADMIN_EMAIL=seu.email@gmail.com

GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Gere valores aleatórios locais; não use os exemplos em produção.
JWT_SECRET=coloque-um-segredo-aleatorio-com-pelo-menos-32-caracteres
TOKEN_ENCRYPTION_KEY=coloque-outro-segredo-aleatorio-com-pelo-menos-32-caracteres

FRONTEND_URL=http://localhost:5173
PRAZO_CONFECCAO_DIAS=3
```

O backend usa `ADMIN_EMAIL` para atribuir o papel de administradora durante o login. Use um endereço que seja uma conta Google de verdade; um domínio de exemplo não permite autenticação.

### Frontend

Na raiz de `atelie-ayza-frontend`, crie `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Para execução local, confirme (vazio significa usar a origem do frontend e o proxy do Vite):

```dotenv
VITE_DEV_PORT=5173
VITE_API_URL=
```

O Client secret do Google **nunca** deve ser colocado no frontend ou em uma variável `VITE_*`; variáveis `VITE_*` são enviadas ao navegador.

## Executar em desenvolvimento

Abra três terminais, um por serviço. Os comandos abaixo presumem que cada repositório está em `C:\Users\Netuno`.

### 1. PostgreSQL com Docker

No terminal do backend:

```powershell
cd path\atelie-ayza-backend
npm run db:start
```

Esse comando usa o `docker-compose.yml` do backend e cria o banco local de desenvolvimento. Se já houver um PostgreSQL local na porta 5432, não inicie outro nessa mesma porta.

### 2. API

Em outro terminal:

```powershell
cd path\atelie-ayza-backend
npm install
npm run start:dev
```

Confirme que a documentação abre em <http://localhost:3000/api/docs>.

### 3. Frontend

No terceiro terminal:

```powershell
cd path\atelie-ayza-frontend
npm install
npm run dev
```

Abra <http://localhost:5173/login> e teste **Entrar com Google**.

## Atalho disponível nesta máquina Windows

Neste ambiente existe um PostgreSQL portátil (sem Docker) e um script local que liga PostgreSQL, API e frontend em conjunto. Depois de configurar os arquivos `.env`, use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File path\atelie-ayza-local\atelie.ps1 -Acao start
```

Para consultar o estado:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File path\atelie-ayza-local\atelie.ps1 -Acao status
```

Para reiniciar apenas a API após mudar o `.env` do backend:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File path\atelie-ayza-local\atelie.ps1 -Acao restart-api
```

Esse atalho usa os diretórios locais `path\atelie-ayza-pg`, `path\atelie-ayza-backend` e `path\atelie-ayza-frontend`; em outra máquina, use os comandos separados ou adapte os caminhos. Se alterar o `.env` do frontend, pare e inicie o Vite novamente para que ele carregue as variáveis novas.

## Roteiro de validação da US

1. Verifique que PostgreSQL, API e frontend estão ativos; o script local deve mostrar as portas 5432, 3000 e 5173 como `OK`.
2. Abra <http://localhost:3000/api/docs> e confirme resposta HTTP 200.
3. Abra <http://localhost:5173/login> e clique em **Entrar com Google**.
4. Escolha uma conta Google de teste autorizada. A autenticação deve retornar para `/auth/callback` no frontend.
5. Confirme que a conta cujo endereço corresponde a `ADMIN_EMAIL` vai para `/gestao`; outras contas devem ir para `/meus-pedidos`.
6. Teste atualizar a página com sessão ativa e sair da conta.

Antes de enviar alterações, rode as verificações de cada repositório:

```powershell
# Backend
cd path\\atelie-ayza-backend
npm run build
npm run lint
npm test

# Frontend (em outro momento/terminal)
cd path\atelie-ayza-frontend
npm run build
npm run lint
```

## Diagnóstico rápido

| Sintoma | Causa provável / verificação |
| --- | --- |
| `ERR_CONNECTION_REFUSED` ao clicar no botão | Confira se a API local está ouvindo na porta 3000 e abra `http://localhost:3000/api/docs`. O login usa o proxy do Vite na origem do frontend. |
| API não inicia ou `/api/docs` falha | Confira se o PostgreSQL está ativo em `localhost:5432`, se o `.env` do backend existe e se as credenciais do banco estão corretas. |
| API responde `Missing GOOGLE_CLIENT_SECRET` | Preencha `GOOGLE_CLIENT_SECRET` no `.env` do backend e reinicie a API. Nunca coloque o segredo no frontend. |
| Google informa `redirect_uri_mismatch` | O URI registrado no Google deve ser exatamente `http://localhost:3000/auth/google/callback` e igual a `GOOGLE_CALLBACK_URL`. |
| Google informa que o app não pode ser acessado | Confira a tela de consentimento OAuth e inclua a conta como usuário de teste, se o app estiver nesse modo. |
| Login retorna para o frontend com erro | Confira os logs da API, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, acesso à conta e URI de callback. |
| Login retorna, mas não entra na aplicação | Confirme que `FRONTEND_URL` é `http://localhost:5173`, que frontend e API usam a mesma origem local e que `GET /auth/me` funciona com o token. |
| Frontend mudou de porta | O frontend e `FRONTEND_URL` precisam coincidir. O `vite.config.ts` usa porta fixa 5173 (`strictPort`); resolva o processo que ocupa a porta em vez de assumir uma porta alternativa. |

> **Segurança:** `.env` do backend contém credenciais e segredos. Não os inclua em commits, capturas de tela, logs enviados publicamente ou mensagens. Para produção, use HTTPS, segredos próprios e `DB_SYNCHRONIZE` conforme a estratégia de migrações do ambiente.
