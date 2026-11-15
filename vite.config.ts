import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

type SessaoSalva = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const VALIDADE_SESSAO_MS = 2 * 60 * 1000;
const LIMITE_CORPO_BYTES = 16 * 1024;

/** IPv4 da rede local, ignorando loopback e endereços link-local. */
function enderecosDaRede(): string[] {
  const enderecos: string[] = [];

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const info of interfaces ?? []) {
      if (info.family !== 'IPv4' || info.internal || info.address.startsWith('169.254.')) continue;
      enderecos.push(info.address);
    }
  }

  // No Windows, 192.168.137.x costuma ser o adaptador de compartilhamento de
  // conexão, que o celular não alcança; deixa esses endereços por último.
  const prioridade = (endereco: string) => (endereco.startsWith('192.168.137.') ? 1 : 0);

  return enderecos.sort((a, b) => prioridade(a) - prioridade(b));
}

/** Só aceita chamadas de loopback ou de faixas privadas (celular na mesma rede). */
function ehRedePrivada(endereco: string | undefined): boolean {
  if (!endereco) return false;

  const ip = endereco.replace(/^::ffff:/, '');
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

function responderJson(res: ServerResponse, codigo: number, dados: unknown): void {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
}

function lerCorpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    let corpo = '';

    req.on('data', (parte: Buffer) => {
      corpo += parte.toString('utf8');
      if (corpo.length > LIMITE_CORPO_BYTES) {
        rejeitar(new Error('Corpo grande demais.'));
        req.destroy();
      }
    });
    req.on('end', () => resolver(corpo));
    req.on('error', rejeitar);
  });
}

/**
 * Ferramentas de desenvolvimento para conferir o layout no celular.
 *
 * - `GET /__dev/network` devolve os IPs da rede local.
 * - `POST /__dev/sessao` guarda a sessão do PC por 2 minutos e devolve um
 *   código curto, usado no QR da página `/mobile`.
 * - `GET /__dev/sessao/:codigo` entrega a sessão uma única vez.
 *
 * O plugin só roda com `vite` (apply: 'serve'); não existe no build de produção.
 */
function pluginMobileDev(porta: number): Plugin {
  const sessoes = new Map<string, { dados: SessaoSalva; expiraEm: number }>();

  const limparExpiradas = () => {
    const agora = Date.now();
    for (const [codigo, item] of sessoes) {
      if (item.expiraEm <= agora) sessoes.delete(codigo);
    }
  };

  return {
    name: 'ayza-mobile-dev',
    apply: 'serve',

    configureServer(server) {
      const enderecos = enderecosDaRede();
      const urls = enderecos.map((ip) => `http://${ip}:${porta}`);

      server.httpServer?.once('listening', () => {
        if (urls.length === 0) return;

        server.config.logger.info('\n  Celular na mesma rede Wi-Fi:');
        for (const url of urls) {
          server.config.logger.info(`  ${url}/        (abrir no celular)`);
          server.config.logger.info(`  ${url}/mobile  (QR e sessão)`);
        }
        server.config.logger.info('');
      });

      server.middlewares.use('/__dev/network', (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (!ehRedePrivada(req.socket.remoteAddress)) {
          return responderJson(res, 403, { erro: 'Rede não autorizada.' });
        }

        responderJson(res, 200, { porta, enderecos, urls });
      });

      server.middlewares.use('/__dev/sessao', (req, res, next) => {
        if (!ehRedePrivada(req.socket.remoteAddress)) {
          return responderJson(res, 403, { erro: 'Rede não autorizada.' });
        }

        limparExpiradas();
        const caminho = req.url || '/';

        if (req.method === 'POST' && caminho === '/') {
          void lerCorpo(req)
            .then((bruto) => {
              const dados = JSON.parse(bruto) as Partial<SessaoSalva>;
              if (typeof dados.accessToken !== 'string' || typeof dados.refreshToken !== 'string') {
                responderJson(res, 400, { erro: 'Sessão inválida.' });
                return;
              }

              const codigo = randomBytes(4).toString('hex');
              const expiraEm = Date.now() + VALIDADE_SESSAO_MS;
              sessoes.set(codigo, {
                dados: {
                  accessToken: dados.accessToken,
                  refreshToken: dados.refreshToken,
                  expiresAt: typeof dados.expiresAt === 'number' ? dados.expiresAt : 0,
                },
                expiraEm,
              });

              server.config.logger.info(`[mobile] sessão preparada (código ${codigo}).`);
              responderJson(res, 201, { codigo, expiraEm });
            })
            .catch(() => responderJson(res, 400, { erro: 'Não foi possível ler a sessão.' }));

          return;
        }

        if (req.method === 'GET' && caminho !== '/') {
          const codigo = decodeURIComponent(caminho.replace(/^\/+/, ''));
          const item = sessoes.get(codigo);

          if (!item) return responderJson(res, 404, { erro: 'Código inválido ou expirado.' });

          sessoes.delete(codigo);
          return responderJson(res, 200, item.dados);
        }

        return next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const porta = Number(env.VITE_DEV_PORT) || 5173;

  return {
    plugins: [react(), pluginMobileDev(porta)],
    server: {
      // Expõe o dev server na rede local para abrir no celular pelo IP do PC.
      host: '0.0.0.0',
      // Mantém a porta fixa: se 5173 estiver ocupada, falha em vez de mudar a URL.
      strictPort: true,
      port: porta,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/auth/google': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/auth/me': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/auth/refresh': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/auth/logout': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
