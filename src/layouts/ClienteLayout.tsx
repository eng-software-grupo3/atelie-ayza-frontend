import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.tsx';
import { TabSwitch } from '../components/TabSwitch.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

export function ClienteLayout() {
  const { sair } = useAuth();

  return (
    <div className="app-frame">
      <header className="app-header app-header--cliente">
        <Logo to="/" />
        <div className="app-header__acoes">
          <TabSwitch />
          <button type="button" className="app-header__sair" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
