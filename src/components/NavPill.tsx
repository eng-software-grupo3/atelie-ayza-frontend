import { NavLink } from 'react-router-dom';

const itens = [
  { to: '/gestao', label: 'Dashboard', fim: true },
  { to: '/gestao/pedidos', label: 'Pedidos', fim: false },
  { to: '/gestao/estoque', label: 'Estoque', fim: false },
  { to: '/gestao/agenda', label: 'Agenda', fim: false },
];

export function NavPill() {
  return (
    <nav className="nav-pill" aria-label="Navegação da área de gestão">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.fim}
          className={({ isActive }) =>
            isActive ? 'nav-pill__item nav-pill__item--ativo' : 'nav-pill__item'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
