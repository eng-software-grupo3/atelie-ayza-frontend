import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import {
  consumirRetorno,
  homeDoUsuario,
  limparSessao,
  rotaPermitidaPara,
  type AuthSession,
} from '../../services/auth.ts';

const MENSAGENS_ERRO: Record<string, string> = {
  access_denied: 'A entrada com o Google foi cancelada.',
  auth_failed: 'Não foi possível confirmar sua conta Google. Tente novamente.',
  server_error: 'O servidor não conseguiu concluir a entrada. Tente novamente em instantes.',
};

export function AuthCallback() {
  const navigate = useNavigate();
  const { concluirLogin } = useAuth();
  const processado = useRef(false);

  useEffect(() => {
    if (processado.current) return;
    processado.current = true;

    const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    // Tira os tokens da barra de endereços e do histórico antes de qualquer
    // chamada de rede.
    window.history.replaceState(null, '', '/auth/callback');

    const erro = parametros.get('error');
    if (erro) {
      void navigate('/login', {
        replace: true,
        state: { erro: MENSAGENS_ERRO[erro] ?? 'Não foi possível entrar com o Google.' },
      });
      return;
    }

    const accessToken = parametros.get('access_token');
    const refreshToken = parametros.get('refresh_token');
    if (!accessToken || !refreshToken) {
      void navigate('/login', {
        replace: true,
        state: { erro: 'A entrada não retornou uma sessão válida. Tente novamente.' },
      });
      return;
    }

    const sessao: AuthSession = {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Number(parametros.get('expires_in')) || 900,
    };

    void concluirLogin(sessao)
      .then((usuario) => {
        const retorno = consumirRetorno();
        const destino =
          retorno && rotaPermitidaPara(retorno, usuario.isAdmin) ? retorno : homeDoUsuario(usuario);
        void navigate(destino, { replace: true });
      })
      .catch(() => {
        limparSessao();
        void navigate('/login', {
          replace: true,
          state: { erro: 'Não foi possível carregar sua conta. Tente novamente.' },
        });
      });
  }, [concluirLogin, navigate]);

  return (
    <div className="app-frame app-frame--login">
      <main className="login">
        <h1 className="apenas-leitor">Concluindo entrada</h1>
        <p className="login__aviso" role="status">
          Concluindo sua entrada…
        </p>
      </main>
    </div>
  );
}
