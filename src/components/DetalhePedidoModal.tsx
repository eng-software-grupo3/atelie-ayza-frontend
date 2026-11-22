import { useEffect, useRef, useState } from 'react';
import { formatarMoeda } from '../data/pedido.ts';
import {
  formatarDataEntrega,
  formatarDataHoraPedido,
  formatarDataPedido,
  pedidoFoiAceito,
} from '../data/statusPedido.ts';
import { ErroApi } from '../services/api.ts';
import {
  buscarPedido,
  type PecaPedido as PecaDoPedido,
  type PedidoDetalhe,
} from '../services/pedidos.ts';
import { StatusPedido } from './StatusPedido.tsx';

type Props = {
  id: string;
  numPedido: number;
  onFechar: () => void;
};

function Peca({ titulo, peca }: { titulo: string; peca: PecaDoPedido }) {
  return (
    <div className="detalhe-pedido__peca">
      <h5 className="detalhe-pedido__peca-titulo">
        {titulo}: {peca.modelo || '—'}
      </h5>
      <p className="texto-suave">Tamanho {peca.tamanho || '—'}</p>
      {peca.aderecos.length > 0 ? (
        <ul className="detalhe-pedido__aderecos">
          {peca.aderecos.map((adereco) => (
            <li key={adereco.id_adereco}>{adereco.nome}</li>
          ))}
        </ul>
      ) : (
        <p className="texto-suave">Sem adereços</p>
      )}
    </div>
  );
}

export function DetalhePedidoModal({ id, numPedido, onFechar }: Props) {
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      try {
        const detalhe = await buscarPedido(id);
        if (ativo) setPedido(detalhe);
      } catch (e) {
        if (!ativo) return;
        if (e instanceof ErroApi && (e.status === 403 || e.status === 404)) {
          setErro('Este pedido não está disponível para você.');
        } else {
          setErro(
            e instanceof Error ? e.message : 'Não foi possível carregar o detalhe do pedido.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id]);

  useEffect(() => {
    const anterior = document.activeElement;
    botaoFechar.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar();
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [onFechar]);

  return (
    <div
      className="modal-pedido__overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <section
        className="modal-pedido"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalhe-pedido-titulo"
      >
        <header className="modal-pedido__topo">
          <div className="modal-pedido__cabecalho">
            <p className="modal-pedido__sobretitulo">Detalhes do pedido</p>
            <h2 id="detalhe-pedido-titulo">Pedido #{numPedido || '—'}</h2>
          </div>
          <button
            type="button"
            className="modal-pedido__fechar"
            ref={botaoFechar}
            onClick={onFechar}
            aria-label="Fechar detalhes do pedido"
          >
            ×
          </button>
        </header>

        <div className="modal-pedido__corpo">
          {carregando && (
            <p className="meus-pedidos__estado" role="status">
              Carregando detalhes do pedido…
            </p>
          )}

          {erro && (
            <div className="alerta alerta--erro" role="alert">
              {erro}
            </div>
          )}

          {pedido && (
            <>
              <div className="modal-pedido__estado">
                <StatusPedido status={pedido.status} />
              </div>

              {ehTemMotivo(pedido) && (
                <p className="alerta alerta--erro detalhe-pedido__motivo">
                  <strong>Motivo:</strong> {pedido.motivo_recusa_cancelamento}
                </p>
              )}

              <section className="modal-pedido__secao" aria-labelledby="detalhe-resumo">
                <h3 id="detalhe-resumo" className="modal-pedido__secao-titulo">
                  Resumo
                </h3>
                <div className="detalhe-linha">
                  <span className="detalhe-linha__rotulo">Data do pedido</span>
                  <span className="detalhe-linha__valor">
                    {formatarDataPedido(pedido.data_pedido)}
                  </span>
                </div>
                <div className="detalhe-linha">
                  <span className="detalhe-linha__rotulo">Entrega prevista</span>
                  <span className="detalhe-linha__valor">
                    {formatarDataEntrega(pedido.data_entrega_prevista)}
                  </span>
                </div>
                <div className="detalhe-linha">
                  <span className="detalhe-linha__rotulo">Frete</span>
                  <span className="detalhe-linha__valor">
                    {rotuloModalidade(pedido.modalidade_frete)} ·{' '}
                    {formatarMoeda(pedido.preco_frete)}
                  </span>
                </div>
                <div className="detalhe-linha">
                  <span className="detalhe-linha__rotulo">Prazo</span>
                  <span className="detalhe-linha__valor">
                    {pedido.prazo_frete_dias ? `${pedido.prazo_frete_dias} dia(s)` : '—'}
                  </span>
                </div>
              </section>

              {pedidoFoiAceito(pedido.status) && (
                <section className="modal-pedido__secao" aria-labelledby="detalhe-valores">
                  <h3 id="detalhe-valores" className="modal-pedido__secao-titulo">
                    Valores
                  </h3>
                  <div className="detalhe-linha detalhe-linha--total">
                    <span className="detalhe-linha__rotulo">Valor final</span>
                    <span className="detalhe-linha__valor">
                      {formatarMoeda(pedido.preco_final)}
                    </span>
                  </div>
                  <div className="detalhe-linha">
                    <span className="detalhe-linha__rotulo">1ª parcela</span>
                    <span className="detalhe-linha__valor">
                      {formatarMoeda(pedido.valor_parcela_1)}
                    </span>
                  </div>
                  <div className="detalhe-linha">
                    <span className="detalhe-linha__rotulo">2ª parcela</span>
                    <span className="detalhe-linha__valor">
                      {formatarMoeda(pedido.valor_parcela_2)}
                    </span>
                  </div>
                </section>
              )}

              <section className="modal-pedido__secao" aria-labelledby="detalhe-endereco">
                <h3 id="detalhe-endereco" className="modal-pedido__secao-titulo">
                  Endereço de entrega
                </h3>
                <p className="detalhe-pedido__endereco">
                  {[pedido.endereco.rua, pedido.endereco.numero, pedido.endereco.complemento]
                    .filter(Boolean)
                    .join(', ')}
                  <br />
                  {[pedido.endereco.bairro, pedido.endereco.cidade, pedido.endereco.estado]
                    .filter(Boolean)
                    .join(' · ')}
                  <br />
                  CEP {pedido.endereco.cep || '—'}
                </p>
              </section>

              <section className="modal-pedido__secao" aria-labelledby="detalhe-conjuntos">
                <h3 id="detalhe-conjuntos" className="modal-pedido__secao-titulo">
                  Conjuntos ({pedido.conjuntos.length})
                </h3>
                {pedido.conjuntos.length === 0 ? (
                  <p className="texto-suave">Nenhum conjunto cadastrado neste pedido.</p>
                ) : (
                  <ol className="detalhe-pedido__conjuntos">
                    {pedido.conjuntos.map((conjunto, indice) => {
                      const foto = conjunto.foto_cliente?.trim();
                      return (
                        <li className="cartao detalhe-pedido__conjunto" key={conjunto.id}>
                          <div className="detalhe-pedido__conjunto-topo">
                            <h4>Conjunto {indice + 1}</h4>
                            <strong>{formatarMoeda(conjunto.preco)}</strong>
                          </div>
                          <div className="detalhe-linha">
                            <span className="detalhe-linha__rotulo">Tecido</span>
                            <span className="detalhe-linha__valor">{conjunto.tecido || '—'}</span>
                          </div>
                          {conjunto.observacao?.trim() && (
                            <div className="detalhe-linha">
                              <span className="detalhe-linha__rotulo">Observação</span>
                              <span className="detalhe-linha__valor">{conjunto.observacao}</span>
                            </div>
                          )}
                          {foto &&
                            (/^(https?:\/\/|data:image\/|\/)/i.test(foto) ? (
                              <img
                                className="detalhe-pedido__foto"
                                src={foto}
                                alt={`Foto de referência do conjunto ${indice + 1}`}
                                loading="lazy"
                              />
                            ) : (
                              <div className="detalhe-linha">
                                <span className="detalhe-linha__rotulo">Foto de referência</span>
                                <span className="detalhe-linha__valor">{foto}</span>
                              </div>
                            ))}
                          <div className="detalhe-pedido__pecas">
                            <Peca titulo="Topo" peca={conjunto.cima} />
                            <Peca titulo="Calcinha" peca={conjunto.baixo} />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              <section className="modal-pedido__secao" aria-labelledby="detalhe-historico">
                <h3 id="detalhe-historico" className="modal-pedido__secao-titulo">
                  Histórico de status
                </h3>
                {pedido.historico.length === 0 ? (
                  <p className="texto-suave">Nenhuma mudança de status registrada.</p>
                ) : (
                  <ol className="detalhe-pedido__historico">
                    {pedido.historico.map((item, indice) => (
                      <li key={`${item.status}-${item.data_mudanca}-${indice}`}>
                        <div className="detalhe-pedido__historico-topo">
                          <StatusPedido status={item.status} />
                          <time dateTime={item.data_mudanca}>
                            {formatarDataHoraPedido(item.data_mudanca)}
                          </time>
                        </div>
                        {item.motivo?.trim() && <p className="texto-suave">{item.motivo}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ehTemMotivo(pedido: PedidoDetalhe): boolean {
  return Boolean(pedido.motivo_recusa_cancelamento?.trim());
}

function rotuloModalidade(modalidade: string): string {
  if (modalidade === 'sedex') return 'SEDEX';
  if (modalidade === 'padrao') return 'Padrão';
  return modalidade || '—';
}
