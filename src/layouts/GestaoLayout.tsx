import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.tsx';
import { NavPill } from '../components/NavPill.tsx';

export function GestaoLayout() {
  return (
    <div className="app-frame">
      <header className="app-header app-header--gestao">
        <Logo to="/gestao" compacto />
        <NavPill />
      </header>
      <Outlet />
    </div>
  );
}
