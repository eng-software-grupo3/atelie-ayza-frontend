import { NavLink, useLocation } from 'react-router-dom';

export function TabSwitch() {
  const { pathname } = useLocation();
  // Todas as etapas do pedido (modelo, tecido, tamanho, adereços, resumo e entrega)
  // fazem parte de "Montar", então a aba permanece ativa em qualquer uma delas.
  const montandoPedido = pathname.startsWith('/pedido/novo');

  return (
    <nav className="tab-switch" aria-label="Alternar entre montar pedido e meus pedidos">
      <NavLink
        to="/pedido/novo/modelo"
        className={() =>
          montandoPedido ? 'tab-switch__item tab-switch__item--ativo' : 'tab-switch__item'
        }
        aria-current={montandoPedido ? 'page' : undefined}
      >
        Montar
      </NavLink>
      <NavLink
        to="/meus-pedidos"
        className={({ isActive }) =>
          isActive ? 'tab-switch__item tab-switch__item--ativo' : 'tab-switch__item'
        }
      >
        Meus pedidos
      </NavLink>
    </nav>
  );
}
