/**
 * Contrato de autenticação do backend (`../atelie-ayza-backend/src/auth`).
 *
 * O login acontece por navegação completa em `${VITE_API_URL}/auth/google`.
 * Depois do Google, a API redireciona para `/auth/callback` com os tokens no
 * hash da URL. O papel do usuário (`isAdmin`) só é conhecido em `/auth/me`.
 */

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  pictureUrl: string | null;
  isAdmin: boolean;
};

/** Sessão devolvida pelo callback (`#...`) e por `POST /auth/refresh`. */
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type SessaoSalva = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const CHAVE_SESSAO = 'atelie.sessao';
const CHAVE_RETORNO = 'atelie.retorno';
const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000';

export function urlApi(caminho: string): string {
  const base = API_URL.replace(/\/+$/, '');
  const rota = caminho.startsWith('/') ? caminho : `/${caminho}`;
  return `${base}${rota}`;
}

export function urlLoginGoogle(): string {
  return urlApi('/auth/google');
}

export function homeDoUsuario(usuario: AuthUser): string {
  return usuario.isAdmin ? '/gestao' : '/meus-pedidos';
}

export function rotaPermitidaPara(caminho: string, isAdmin: boolean): boolean {
  if (caminho === '/gestao' || caminho.startsWith('/gestao/')) return isAdmin;
  if (caminho === '/meus-pedidos' || caminho.startsWith('/pedido/')) return !isAdmin;
  return false;
}

export function lerSessao(): SessaoSalva | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;

    const dados = JSON.parse(bruto) as Partial<SessaoSalva>;
    if (typeof dados.accessToken !== 'string' || typeof dados.refreshToken !== 'string') {
      return null;
    }

    return {
      accessToken: dados.accessToken,
      refreshToken: dados.refreshToken,
      expiresAt: typeof dados.expiresAt === 'number' ? dados.expiresAt : 0,
    };
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: AuthSession): SessaoSalva {
  const salva: SessaoSalva = {
    accessToken: sessao.accessToken,
    refreshToken: sessao.refreshToken,
    expiresAt: Date.now() + Math.max(sessao.expiresIn, 0) * 1000,
  };
  window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(salva));
  return salva;
}

export function limparSessao(): void {
  window.localStorage.removeItem(CHAVE_SESSAO);
}

/** Guarda a rota pedida antes do OAuth para retornar a ela depois do login. */
export function salvarRetorno(caminho: string): void {
  window.sessionStorage.setItem(CHAVE_RETORNO, caminho);
}

export function consumirRetorno(): string | null {
  const caminho = window.sessionStorage.getItem(CHAVE_RETORNO);
  window.sessionStorage.removeItem(CHAVE_RETORNO);
  return caminho;
}
