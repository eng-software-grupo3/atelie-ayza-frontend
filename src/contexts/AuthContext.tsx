import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiJson, EVENTO_SESSAO_EXPIRADA } from '../services/api.ts';
import {
  lerSessao,
  limparSessao,
  salvarSessao,
  type AuthSession,
  type AuthUser,
} from '../services/auth.ts';

type AuthContextValue = {
  usuario: AuthUser | null;
  carregando: boolean;
  sair: () => Promise<void>;
  /** Usado pela página de callback: guarda os tokens e busca o usuário. */
  concluirLogin: (sessao: AuthSession) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<AuthUser | null>(null);
  const [carregando, setCarregando] = useState(() => {
    // O callback tem os próprios tokens e cuida da sessão; restaurar a antiga
    // aqui poderia apagá-los em caso de refresh vencido.
    if (window.location.pathname.replace(/\/+$/, '') === '/auth/callback') return false;
    return lerSessao() !== null;
  });
  const restauracao = useRef<Promise<AuthUser | null> | null>(null);

  useEffect(() => {
    if (!carregando) return;

    let cancelado = false;
    restauracao.current ??= (async () => {
      try {
        return await apiJson<AuthUser>('/auth/me');
      } catch {
        limparSessao();
        return null;
      }
    })();

    void restauracao.current.then((restaurado) => {
      if (cancelado) return;
      setUsuario(restaurado);
      setCarregando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [carregando]);

  useEffect(() => {
    function aoExpirar() {
      setUsuario(null);
      setCarregando(false);
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const sair = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Sem rede a sessão local também é encerrada.
    }
    limparSessao();
    setUsuario(null);
    void navigate('/login', { replace: true });
  }, [navigate]);

  const concluirLogin = useCallback(async (sessao: AuthSession) => {
    salvarSessao(sessao);
    const eu = await apiJson<AuthUser>('/auth/me');
    setUsuario(eu);
    setCarregando(false);
    return eu;
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({ usuario, carregando, sair, concluirLogin }),
    [usuario, carregando, sair, concluirLogin],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  }
  return contexto;
}
