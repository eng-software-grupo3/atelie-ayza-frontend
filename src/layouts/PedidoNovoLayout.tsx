import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StepBar } from '../components/StepBar.tsx';
import { StepFooter } from '../components/StepFooter.tsx';
import { etapaPorSlug, etapas, indiceDaEtapa } from '../data/etapas.ts';
import {
  catalogosIniciais,
  criarCorpoPedido,
  dadosEntregaIniciais,
  rascunhoInicial,
  type CatalogosPedido,
  type ConjuntoRascunho,
  type DadosEntregaPedido,
  type PedidoRascunho,
} from '../data/pedido.ts';

export function PedidoNovoLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [conjuntos, setConjuntosState] = useState<ConjuntoRascunho[]>([rascunhoInicial()]);
  const [indiceConjuntoAtivo, setIndiceConjuntoAtivo] = useState(0);
  const [catalogos, setCatalogos] = useState<CatalogosPedido>(catalogosIniciais);
  const [dadosEntrega, setDadosEntrega] = useState<DadosEntregaPedido>(dadosEntregaIniciais);
  const [avisoFluxo, setAvisoFluxo] = useState('');
  const pedido = useMemo(() => criarCorpoPedido(conjuntos), [conjuntos]);
  const rascunho = conjuntos[indiceConjuntoAtivo] ?? rascunhoInicial();

  const setConjuntos = useCallback<Dispatch<SetStateAction<ConjuntoRascunho[]>>>(
    (atualizar) => setConjuntosState(atualizar),
    [],
  );
  const setRascunho = useCallback<Dispatch<SetStateAction<ConjuntoRascunho>>>(
    (atualizar) => {
      setConjuntos((atuais) =>
        atuais.map((conjunto, indice) =>
          indice === indiceConjuntoAtivo
            ? typeof atualizar === 'function'
              ? atualizar(conjunto)
              : atualizar
            : conjunto,
        ),
      );
    },
    [indiceConjuntoAtivo],
  );
  const avisar = useCallback((mensagem: string) => setAvisoFluxo(mensagem), []);

  useEffect(() => {
    if (!avisoFluxo) return;
    const timeout = window.setTimeout(() => setAvisoFluxo(''), 8000);
    return () => window.clearTimeout(timeout);
  }, [avisoFluxo]);

  useEffect(() => {
    const avisarAntesDeSair = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisarAntesDeSair);
    return () => window.removeEventListener('beforeunload', avisarAntesDeSair);
  }, []);

  const slug = pathname.split('/').filter(Boolean).pop() ?? '';
  const etapa = etapaPorSlug(slug);

  if (!etapa) {
    return <Navigate to={`/pedido/novo/${etapas[0].slug}`} replace />;
  }

  const indice = indiceDaEtapa(etapa.slug);
  const anterior = indice > 0 ? etapas[indice - 1] : null;
  const conjuntoCompleto = (conjunto: ConjuntoRascunho) =>
    Boolean(conjunto.cima.id_modelo && conjunto.baixo.id_modelo && conjunto.id_tecido);
  const podeAvancar =
    etapa.slug === 'modelo'
      ? Boolean(rascunho.cima.id_modelo && rascunho.baixo.id_modelo)
      : etapa.slug === 'tecido'
        ? conjuntoCompleto(rascunho)
        : etapa.slug === 'resumo'
          ? conjuntos.every(conjuntoCompleto)
          : true;

  function avancar() {
    const proxima = etapas[indice + 1];
    void navigate(proxima ? `/pedido/novo/${proxima.slug}` : '/meus-pedidos');
  }

  function adicionarConjunto(): boolean {
    if (conjuntos.length >= 6) {
      avisar('O pedido pode ter no máximo 6 conjuntos.');
      return false;
    }

    const novoIndice = conjuntos.length;
    setConjuntos((atuais) => [...atuais, rascunhoInicial()]);
    setIndiceConjuntoAtivo(novoIndice);
    return true;
  }

  return (
    <>
      <StepBar />
      {avisoFluxo && (
        <p className="pedido-fluxo__aviso" role="alert">
          {avisoFluxo}
        </p>
      )}
      <main className="app-main app-main--etapa">
        <Outlet
          context={{
            pedido,
            rascunho,
            setRascunho,
            conjuntos,
            setConjuntos,
            indiceConjuntoAtivo,
            setIndiceConjuntoAtivo,
            catalogos,
            setCatalogos,
            dadosEntrega,
            setDadosEntrega,
            avisar,
            adicionarConjunto,
          }}
        />
      </main>
      {etapa.slug !== 'entrega' && (
        <StepFooter
          etapa={etapa}
          anterior={anterior}
          onAvancar={avancar}
          desabilitado={!podeAvancar}
        />
      )}
    </>
  );
}
