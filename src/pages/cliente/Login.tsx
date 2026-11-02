import { Link, Navigate, useLocation } from 'react-router-dom';
import assinatura from '../../assets/home/assinatura-1.svg';
import marca from '../../assets/home/marca.png';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { homeDoUsuario, salvarRetorno, urlLoginGoogle } from '../../services/auth.ts';

type EstadoLogin = {
  erro?: string;
  de?: string;
};

/**
 * Tela de login para cliente e gestão.
 *
 * O botão inicia o OAuth do backend por navegação completa. Depois do Google,
 * a API devolve os tokens em `/auth/callback`; o papel (`isAdmin`) decide se a
 * pessoa segue para `/gestao` ou para `/meus-pedidos`.
 */
export function Login() {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  const estado = (local.state ?? {}) as EstadoLogin;

  if (!carregando && usuario) {
    return <Navigate to={homeDoUsuario(usuario)} replace />;
  }

  return (
    <div className="app-frame app-frame--login">
      <main className="login">
        <h1 className="apenas-leitor">Entrar na sua conta</h1>

        <Link className="login__marca" to="/" aria-label="Ateliê Ayza — início">
          <img className="login__desenho" src={marca} alt="" />
          <img className="login__assinatura" src={assinatura} alt="" />
          <span className="login__ateliê">ATELIÊ</span>
        </Link>

        <div className="login__acao">
          <a
            className="login__botao"
            href={urlLoginGoogle()}
            onClick={() => {
              if (estado.de) salvarRetorno(estado.de);
            }}
          >
            Entrar com Google
          </a>

          {estado.erro ? (
            <p className="login__aviso" role="alert">
              {estado.erro}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
