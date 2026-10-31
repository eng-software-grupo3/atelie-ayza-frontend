import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StepBar } from '../components/StepBar.tsx';
import { StepFooter } from '../components/StepFooter.tsx';
import { etapaPorSlug, etapas, indiceDaEtapa } from '../data/etapas.ts';

export function PedidoNovoLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const etapa = etapaPorSlug(slug);

  if (!etapa) {
    return <Navigate to={`/pedido/novo/${etapas[0].slug}`} replace />;
  }

  const indice = indiceDaEtapa(etapa.slug);
  const anterior = indice > 0 ? etapas[indice - 1] : null;

  function avancar() {
    const proxima = etapas[indice + 1];

    void navigate(proxima ? `/pedido/novo/${proxima.slug}` : '/meus-pedidos');
  }

  return (
    <>
      <StepBar />
      <main className="app-main app-main--etapa">
        <Outlet />
      </main>
      <StepFooter etapa={etapa} anterior={anterior} onAvancar={avancar} />
    </>
  );
}
