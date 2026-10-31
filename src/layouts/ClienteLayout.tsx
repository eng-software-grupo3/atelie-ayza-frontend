import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.tsx';
import { TabSwitch } from '../components/TabSwitch.tsx';

export function ClienteLayout() {
  return (
    <div className="app-frame">
      <header className="app-header app-header--cliente">
        <Logo to="/" />
        <TabSwitch />
      </header>
      <Outlet />
    </div>
  );
}
