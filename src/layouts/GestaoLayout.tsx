import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.tsx';
import { NavPill } from '../components/NavPill.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

export function GestaoLayout() {
  const { sair } = useAuth();

  return (
    <div className="app-frame">
      <header className="app-header app-header--gestao">
        <Logo to="/gestao" compacto />
        <div className="app-header__acoes app-header__acoes--gestao">
          <NavPill />
          <button type="button" className="app-header__sair" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
