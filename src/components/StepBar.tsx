import { NavLink } from 'react-router-dom';
import { etapas } from '../data/etapas.ts';

export function StepBar() {
  return (
    <nav className="step-bar" aria-label="Etapas do pedido">
      {etapas.map((etapa, indice) => (
        <NavLink
          key={etapa.slug}
          to={`/pedido/novo/${etapa.slug}`}
          className={({ isActive }) =>
            isActive ? 'step-bar__item step-bar__item--ativo' : 'step-bar__item'
          }
        >
          {`${indice + 1}. ${etapa.titulo}`}
        </NavLink>
      ))}
    </nav>
  );
}
