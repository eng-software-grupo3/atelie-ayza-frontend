import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StepBar } from '../components/StepBar.tsx';
import { StepFooter } from '../components/StepFooter.tsx';
import { etapaPorSlug, etapas, indiceDaEtapa } from '../data/etapas.ts';
import { rascunhoInicial, type RascunhoPedido } from '../data/pedido.ts';

export function PedidoNovoLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [rascunho, setRascunho] = useState<RascunhoPedido>(rascunhoInicial);

  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const etapa = etapaPorSlug(slug);

  if (!etapa) {
    return <Navigate to={`/pedido/novo/${etapas[0].slug}`} replace />;
  }

  const indice = indiceDaEtapa(etapa.slug);
  const anterior = indice > 0 ? etapas[indice - 1] : null;
  const podeAvancar =
    etapa.slug === 'modelo'
      ? Boolean(rascunho.modeloCima && rascunho.modeloBaixo)
      : etapa.slug === 'tecido'
        ? Boolean(rascunho.modeloCima && rascunho.modeloBaixo && rascunho.tecido)
        : true;

  function avancar() {
    const proxima = etapas[indice + 1];

    void navigate(proxima ? `/pedido/novo/${proxima.slug}` : '/meus-pedidos');
  }

  return (
    <>
      <StepBar />
      <main className="app-main app-main--etapa">
        <Outlet context={{ rascunho, setRascunho }} />
      </main>
      <StepFooter
        etapa={etapa}
        anterior={anterior}
        onAvancar={avancar}
        desabilitado={!podeAvancar}
      />
    </>
  );
}
