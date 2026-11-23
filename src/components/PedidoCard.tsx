import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { formatarMoeda } from '../data/pedido.ts';
import {
  ehStatusComProblema,
  formatarDataEntrega,
  formatarDataPedido,
} from '../data/statusPedido.ts';
import { calcularDespacho, urlDaFoto } from '../data/exibicaoPedido.ts';
import type { ModeloCatalogo, TecidoCatalogo } from '../services/catalogo.ts';
import { buscarPedido, type PedidoDetalhe, type PedidoResumo } from '../services/pedidos.ts';
import { FotoCorpo } from './FotoCorpo.tsx';
import { PedidoPreview } from './PedidoPreview.tsx';
import { StatusPedido } from './StatusPedido.tsx';

type Props = {
  pedido: PedidoResumo;
  modelos: ModeloCatalogo[];
  tecidos: TecidoCatalogo[];
  onVerDetalhes: () => void;
};

export function PedidoCard({ pedido, modelos, tecidos, onVerDetalhes }: Props) {
  const { usuario } = useAuth();
  const [detalhe, setDetalhe] = useState<PedidoDetalhe | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarPedido(pedido.id)
      .then((resposta) => {
        if (ativo) setDetalhe(resposta);
      })
      // O cartão continua útil sem a prévia; o modal mostra o erro se precisar.
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [pedido.id]);

  useEffect(() => {
    if (!fotoAmpliada) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setFotoAmpliada(false);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [fotoAmpliada]);

  const conjunto = detalhe?.conjuntos[0];
  const modeloCima = conjunto
    ? (modelos.find((m) => m.id === conjunto.cima.id_modelo) ?? null)
    : null;
  const modeloBaixo = conjunto
    ? (modelos.find((m) => m.id === conjunto.baixo.id_modelo) ?? null)
    : null;
  const tecido = conjunto ? (tecidos.find((t) => t.id === conjunto.id_tecido) ?? null) : null;
  const foto = urlDaFoto(conjunto?.foto_cliente);
  const despacho = calcularDespacho(pedido.data_entrega_prevista, detalhe?.prazo_frete_dias);
  const totalConjuntos = detalhe?.conjuntos.length ?? 0;
  const motivo = pedido.motivo_recusa_cancelamento?.trim();

  return (
    <article className="pedido-card">
      <header className="pedido-card__topo">
        <h2 className="pedido-card__numero">
          <span>Pedido #{pedido.num_pedido}</span>
          {usuario?.name && <small> • {usuario.name}</small>}
        </h2>
        <StatusPedido status={pedido.status} />
      </header>

      <div className="pedido-card__resumo">
        <div className="pedido-card__previa">
          {modeloCima || modeloBaixo ? (
            <PedidoPreview modeloCima={modeloCima} modeloBaixo={modeloBaixo} tecido={tecido} />
          ) : (
            <span className="pedido-card__previa-vazia" aria-hidden="true" />
          )}
          {totalConjuntos > 1 && <span className="pedido-card__mais">+{totalConjuntos - 1}</span>}
        </div>

        <dl className="pedido-card__dados">
          {despacho && (
            <div>
              <dt>Despacho em:</dt>
              <dd>{formatarDataEntrega(despacho)}</dd>
            </div>
          )}
          <div>
            <dt>Entrega em:</dt>
            <dd>{formatarDataEntrega(pedido.data_entrega_prevista)}</dd>
          </div>
          <div className="pedido-card__valor">
            <dt className="sr-only">Valor</dt>
            <dd>{formatarMoeda(pedido.preco_final)}</dd>
          </div>
        </dl>
      </div>

      {conjunto && <FotoCorpo foto={foto} onAmpliar={() => setFotoAmpliada(true)} />}

      {ehStatusComProblema(pedido.status) && motivo && (
        <p className="alerta alerta--erro pedido-card__motivo">
          <strong>Motivo:</strong> {motivo}
        </p>
      )}

      <footer className="pedido-card__rodape">
        <span>Criado em: {formatarDataPedido(pedido.data_pedido)}</span>
        <button type="button" className="pedido-card__acao" onClick={onVerDetalhes}>
          Ver Resumo Completo <span aria-hidden="true">&gt;</span>
        </button>
      </footer>

      {fotoAmpliada && foto && (
        <div
          className="modal-pedido__overlay pedido-card__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto do corpo ampliada"
          onMouseDown={() => setFotoAmpliada(false)}
        >
          <img src={foto} alt="Foto do corpo enviada no pedido" />
          <button
            type="button"
            className="pedido-card__lightbox-fechar"
            aria-label="Fechar foto"
            onClick={() => setFotoAmpliada(false)}
          >
            ×
          </button>
        </div>
      )}
    </article>
  );
}
