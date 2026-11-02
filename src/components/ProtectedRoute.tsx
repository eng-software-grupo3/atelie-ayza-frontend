import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { homeDoUsuario } from '../services/auth.ts';

type Props = {
  /** `gestao` só aceita admin; `cliente` só aceita quem não é admin. */
  area: 'cliente' | 'gestao';
};

export function ProtectedRoute({ area }: Props) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) {
    return (
      <div className="app-frame">
        <main className="app-main" aria-busy="true">
          <p className="texto-suave">Carregando…</p>
        </main>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ de: `${local.pathname}${local.search}` }} />;
  }

  if (area === 'gestao' && !usuario.isAdmin) {
    return <Navigate to={homeDoUsuario(usuario)} replace />;
  }

  if (area === 'cliente' && usuario.isAdmin) {
    return <Navigate to={homeDoUsuario(usuario)} replace />;
  }

  return <Outlet />;
}
