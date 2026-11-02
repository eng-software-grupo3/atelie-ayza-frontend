import { lerSessao, limparSessao, salvarSessao, urlApi, type AuthSession } from './auth.ts';

export const EVENTO_SESSAO_EXPIRADA = 'atelie:sessao-expirada';

export class ErroApi extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

let renovacaoEmAndamento: Promise<string | null> | null = null;

/**
 * Renova o access token usando o refresh token salvo. Uma única renovação
 * acontece por vez, mesmo que várias requisições recebam 401 juntas.
 */
async function renovarSessao(): Promise<string | null> {
  if (renovacaoEmAndamento) return renovacaoEmAndamento;

  const sessao = lerSessao();
  if (!sessao) return null;

  renovacaoEmAndamento = (async () => {
    try {
      const resposta = await fetch(urlApi('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: sessao.refreshToken }),
      });
      if (!resposta.ok) return null;

      const nova = (await resposta.json()) as AuthSession;
      if (!nova.accessToken || !nova.refreshToken) return null;

      salvarSessao(nova);
      return nova.accessToken;
    } catch {
      return null;
    } finally {
      renovacaoEmAndamento = null;
    }
  })();

  return renovacaoEmAndamento;
}

function expirarSessao(): void {
  limparSessao();
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}

export async function apiFetch(
  caminho: string,
  opcoes: RequestInit = {},
  tentarRenovar = true,
): Promise<Response> {
  const sessao = lerSessao();
  const cabecalhos = new Headers(opcoes.headers);
  if (opcoes.body && !cabecalhos.has('Content-Type')) {
    cabecalhos.set('Content-Type', 'application/json');
  }
  if (sessao) cabecalhos.set('Authorization', `Bearer ${sessao.accessToken}`);

  const resposta = await fetch(urlApi(caminho), { ...opcoes, headers: cabecalhos });

  if (resposta.status !== 401 || !tentarRenovar) return resposta;

  const token = await renovarSessao();
  if (token) return apiFetch(caminho, opcoes, false);

  expirarSessao();
  return resposta;
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { message?: string | string[] };
    if (Array.isArray(corpo.message)) return corpo.message.join(', ');
    if (typeof corpo.message === 'string') return corpo.message;
  } catch {
    // A resposta não veio em JSON; usa a mensagem genérica abaixo.
  }
  return `A API respondeu com status ${resposta.status}.`;
}

export async function apiJson<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await apiFetch(caminho, opcoes);
  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDeErro(resposta));
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
