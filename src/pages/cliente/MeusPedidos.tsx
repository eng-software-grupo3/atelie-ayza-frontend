import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DetalhePedidoModal } from '../../components/DetalhePedidoModal.tsx';
import { PedidoCard } from '../../components/PedidoCard.tsx';
import {
  carregarAderecos,
  carregarModelos,
  carregarTecidos,
  type AderecoCatalogo,
  type ModeloCatalogo,
  type TecidoCatalogo,
} from '../../services/catalogo.ts';
import { listarPedidos, type PedidoResumo } from '../../services/pedidos.ts';

export function MeusPedidos() {
  const [pedidos, setPedidos] = useState<PedidoResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [idAberto, setIdAberto] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [modelos, setModelos] = useState<ModeloCatalogo[]>([]);
  const [tecidos, setTecidos] = useState<TecidoCatalogo[]>([]);
  const [aderecos, setAderecos] = useState<AderecoCatalogo[]>([]);

  // Catálogo só serve para desenhar a prévia; se falhar, os cartões seguem sem imagem.
  useEffect(() => {
    let ativo = true;
    void Promise.all([carregarModelos(), carregarTecidos()])
      .then(([listaModelos, listaTecidos]) => {
        if (!ativo) return;
        setModelos(listaModelos);
        setTecidos(listaTecidos);
      })
      .catch(() => undefined);
    // Adereços só colorem os pontos no detalhe; carregam à parte.
    void carregarAderecos()
      .then((lista) => {
        if (ativo) setAderecos(lista);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      try {
        const lista = await listarPedidos();
        if (ativo) setPedidos(lista);
      } catch (e) {
        if (ativo) {
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar seus pedidos.');
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  function tentarNovamente() {
    setPedidos(null);
    setErro(null);
    setTentativa((valor) => valor + 1);
  }

  const fecharModal = useCallback(() => setIdAberto(null), []);
  const pedidoAberto = idAberto ? pedidos?.find((pedido) => pedido.id === idAberto) : undefined;

  return (
    <main className="app-main meus-pedidos">
      <div className="meus-pedidos__cabecalho">
        <h1 className="meus-pedidos__titulo">Meus Pedidos Realizados</h1>
        <Link className="meus-pedidos__novo" to="/pedido/novo/modelo">
          + Fazer Novo Pedido
        </Link>
      </div>

      {erro ? (
        <div className="alerta alerta--erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            className="botao botao--secundario botao--pequeno meus-pedidos__tentar"
            onClick={tentarNovamente}
          >
            Tentar novamente
          </button>
        </div>
      ) : pedidos === null ? (
        <p className="meus-pedidos__estado" role="status">
          Carregando pedidos…
        </p>
      ) : pedidos.length === 0 ? (
        <div className="cartao meus-pedidos__estado">
          <p>Você ainda não fez nenhum pedido.</p>
          <p className="texto-suave">Quando fizer, o acompanhamento aparece aqui.</p>
        </div>
      ) : (
        <ul className="meus-pedidos__lista">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <PedidoCard
                pedido={pedido}
                modelos={modelos}
                tecidos={tecidos}
                onVerDetalhes={() => setIdAberto(pedido.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {idAberto && (
        <DetalhePedidoModal
          key={idAberto}
          id={idAberto}
          numPedido={pedidoAberto?.num_pedido ?? 0}
          modelos={modelos}
          tecidos={tecidos}
          aderecos={aderecos}
          onFechar={fecharModal}
        />
      )}
    </main>
  );
}
