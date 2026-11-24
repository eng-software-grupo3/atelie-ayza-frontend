import { lerSessao, limparSessao, salvarSessao, urlApi, type AuthSession } from './auth.ts';

export const EVENTO_SESSAO_EXPIRADA = 'atelie:sessao-expirada';

export type ItemEstoqueErroApi = {
  tipo: 'tecido' | 'adereco';
  id: string;
  nome: string;
};

export class ErroApi extends Error {
  readonly status: number;
  readonly codigo?: string;
  readonly ids?: string[];
  readonly itens?: ItemEstoqueErroApi[];

  constructor(
    status: number,
    mensagem: string,
    codigo?: string,
    ids?: string[],
    itens?: ItemEstoqueErroApi[],
  ) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.ids = ids;
    this.itens = itens;
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
  if (opcoes.body && !(opcoes.body instanceof FormData) && !cabecalhos.has('Content-Type')) {
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

async function detalheErro(
  resposta: Response,
): Promise<{
  mensagem: string;
  codigo?: string;
  ids?: string[];
  itens?: ItemEstoqueErroApi[];
}> {
  try {
    const corpo = (await resposta.json()) as {
      code?: string;
      ids?: unknown;
      message?: string | string[];
      itens?: unknown;
    };
    const mensagem = Array.isArray(corpo.message)
      ? corpo.message.join(', ')
      : typeof corpo.message === 'string'
        ? corpo.message
        : `A API respondeu com status ${resposta.status}.`;
    return {
      mensagem,
      codigo: corpo.code,
      ids: Array.isArray(corpo.ids)
        ? corpo.ids.filter((id): id is string => typeof id === 'string')
        : undefined,
      itens: Array.isArray(corpo.itens)
        ? corpo.itens.flatMap((item): ItemEstoqueErroApi[] => {
            if (typeof item !== 'object' || item === null) return [];
            const detalhe = item as Record<string, unknown>;
            if (
              (detalhe.tipo !== 'tecido' && detalhe.tipo !== 'adereco') ||
              typeof detalhe.id !== 'string' ||
              typeof detalhe.nome !== 'string'
            ) {
              return [];
            }
            return [{ tipo: detalhe.tipo, id: detalhe.id, nome: detalhe.nome }];
          })
        : undefined,
    };
  } catch {
    return { mensagem: `A API respondeu com status ${resposta.status}.` };
  }
}

export async function apiJson<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await apiFetch(caminho, opcoes);
  if (!resposta.ok) {
    const erro = await detalheErro(resposta);
    throw new ErroApi(resposta.status, erro.mensagem, erro.codigo, erro.ids, erro.itens);
  }
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
