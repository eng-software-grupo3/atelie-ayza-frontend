import type { MouseEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo.tsx';
import { TabSwitch } from '../components/TabSwitch.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

export function ClienteLayout() {
  const { sair } = useAuth();
  const { pathname } = useLocation();

  function confirmarSaidaDoPedido(evento: MouseEvent<HTMLDivElement>) {
    if (!pathname.startsWith('/pedido/novo')) return;
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;

    const link = alvo.closest<HTMLAnchorElement>('a[href]');
    const botaoSair = alvo.closest<HTMLButtonElement>('.app-header__sair');
    const saiDoFluxo = link
      ? !new URL(link.href, window.location.href).pathname.startsWith('/pedido/novo')
      : Boolean(botaoSair);
    if (!saiDoFluxo) return;

    if (!window.confirm('Se sair da montagem, os dados deste pedido serão perdidos. Deseja continuar?')) {
      evento.preventDefault();
      evento.stopPropagation();
    }
  }

  return (
    <div className="app-frame" onClickCapture={confirmarSaidaDoPedido}>
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
