import { useEffect, useState } from 'react';
import { formatarMoeda } from '../data/pedido.ts';
import {
  ehStatusComProblema,
  formatarDataEntrega,
  formatarDataPedido,
} from '../data/statusPedido.ts';
import {
  urlDaImagemCatalogo,
  type ModeloCatalogo,
  type TecidoCatalogo,
} from '../services/catalogo.ts';
import { buscarPedido, type PedidoDetalhe, type PedidoResumo } from '../services/pedidos.ts';
import { PedidoPreview } from './PedidoPreview.tsx';
import { StatusPedido } from './StatusPedido.tsx';

type Props = {
  pedido: PedidoResumo;
  modelos: ModeloCatalogo[];
  tecidos: TecidoCatalogo[];
  onVerDetalhes: () => void;
};

/** Data de despacho = entrega prevista menos o prazo do frete. */
function calcularDespacho(entrega: string, prazoDias: number | undefined): string | null {
  if (!entrega || !prazoDias) return null;
  const base = /^\d{4}-\d{2}-\d{2}$/.test(entrega) ? `${entrega}T12:00:00` : entrega;
  const data = new Date(base);
  if (Number.isNaN(data.getTime())) return null;
  data.setDate(data.getDate() - prazoDias);
  return data.toISOString();
}

function urlDaFoto(foto: string | null | undefined): string | null {
  const valor = foto?.trim();
  if (!valor) return null;
  if (/^(https?:\/\/|data:image\/)/i.test(valor)) return valor;
  if (valor.startsWith('/')) return urlDaImagemCatalogo(valor);
  return null;
}

export function PedidoCard({ pedido, modelos, tecidos, onVerDetalhes }: Props) {
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
        <h2 className="pedido-card__numero">Pedido #{pedido.num_pedido}</h2>
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

      {foto && (
        <button
          type="button"
          className="pedido-card__foto"
          onClick={() => setFotoAmpliada(true)}
          aria-label="Ampliar foto do corpo"
        >
          <img src={foto} alt="" loading="lazy" />
          <span className="pedido-card__foto-texto">
            <strong>Foto do Corpo (Medidas)</strong>
            <small>Clique na foto para ampliar</small>
          </span>
        </button>
      )}

      {ehStatusComProblema(pedido.status) && motivo && (
        <p className="alerta alerta--erro pedido-card__motivo">
          <strong>Motivo:</strong> {motivo}
        </p>
      )}

      <footer className="pedido-card__rodape">
        <span>Criado em: {formatarDataPedido(pedido.data_pedido)}</span>
        <button type="button" className="pedido-card__acao" onClick={onVerDetalhes}>
          Ver detalhes <span aria-hidden="true">&gt;</span>
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
