import { NavLink, Outlet } from 'react-router-dom';

const categorias = [
  { to: '/gestao/estoque/tecidos', label: 'Tecidos' },
  { to: '/gestao/estoque/aderecos', label: 'Adereços' },
  { to: '/gestao/estoque/modelos', label: 'Modelos' },
];

export function Estoque() {
  return (
    <main className="app-main">
      <nav className="nav-pill nav-pill--sub" aria-label="Categorias de estoque">
        {categorias.map((categoria) => (
          <NavLink
            key={categoria.to}
            to={categoria.to}
            className={({ isActive }) =>
              isActive ? 'nav-pill__item nav-pill__item--ativo' : 'nav-pill__item'
            }
          >
            {categoria.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </main>
  );
}

/**
 * Subcategorias do estoque.
 *
 * O conteúdo destas telas será implementado em uma etapa futura.
 */
export function EstoqueTecidos() {
  return null;
}

export function EstoqueAderecos() {
  return null;
}

export function EstoqueModelos() {
  return null;
}
