import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { calcularDespacho, urlDaFoto } from '../data/exibicaoPedido.ts';
import { coresDosAderecos, formatarMoeda, type PontoAdereco } from '../data/pedido.ts';
import { formatarDataEntrega, formatarDataPedido, pedidoFoiAceito } from '../data/statusPedido.ts';
import { ErroApi } from '../services/api.ts';
import type { AderecoCatalogo, ModeloCatalogo, TecidoCatalogo } from '../services/catalogo.ts';
import { buscarPedido, type ConjuntoPedido, type PedidoDetalhe } from '../services/pedidos.ts';
import { FotoCorpo } from './FotoCorpo.tsx';
import { PedidoPreview } from './PedidoPreview.tsx';

type Props = {
  id: string;
  numPedido: number;
  modelos?: ModeloCatalogo[];
  tecidos?: TecidoCatalogo[];
  aderecos?: AderecoCatalogo[];
  onFechar: () => void;
};

type Catalogo = Required<Pick<Props, 'modelos' | 'tecidos' | 'aderecos'>>;

/** Mesma regra de cor usada no resumo da criação do pedido. */
function corDoAdereco(id: string, aderecos: AderecoCatalogo[]): string {
  const indice = aderecos.findIndex((adereco) => adereco.id === id);
  return indice < 0 ? coresDosAderecos[0] : coresDosAderecos[indice % coresDosAderecos.length];
}

function pontosDoConjunto(conjunto: ConjuntoPedido, aderecos: AderecoCatalogo[]): PontoAdereco[] {
  return (['cima', 'baixo'] as const).flatMap((lado) =>
    conjunto[lado].aderecos.map((aplicado, indice) => ({
      id: `${lado}-${aplicado.id_adereco}-${indice}`,
      adereco: aderecos.find((item) => item.id === aplicado.id_adereco) ?? {
        id: aplicado.id_adereco,
        nome: aplicado.nome,
        foto: null,
        preco: 0,
      },
      cor: corDoAdereco(aplicado.id_adereco, aderecos),
      peca: lado === 'cima' ? 'CIMA' : 'BAIXO',
      x: aplicado.coordenada_x,
      y: aplicado.coordenada_y,
    })),
  );
}

function agruparAderecos(conjunto: ConjuntoPedido, aderecos: AderecoCatalogo[]) {
  const grupos = new Map<string, { nome: string; quantidade: number; cor: string }>();
  for (const aplicado of [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos]) {
    const grupo = grupos.get(aplicado.id_adereco);
    if (grupo) grupo.quantidade += 1;
    else {
      grupos.set(aplicado.id_adereco, {
        nome: aplicado.nome,
        quantidade: 1,
        cor: corDoAdereco(aplicado.id_adereco, aderecos),
      });
    }
  }
  return [...grupos.values()];
}

function CardConjunto({
  conjunto,
  numero,
  catalogo,
  onAmpliarFoto,
}: {
  conjunto: ConjuntoPedido;
  numero: number;
  catalogo: Catalogo;
  onAmpliarFoto: (url: string) => void;
}) {
  const modeloCima = catalogo.modelos.find((m) => m.id === conjunto.cima.id_modelo) ?? null;
  const modeloBaixo = catalogo.modelos.find((m) => m.id === conjunto.baixo.id_modelo) ?? null;
  const tecido = catalogo.tecidos.find((t) => t.id === conjunto.id_tecido) ?? null;
  const foto = urlDaFoto(conjunto.foto_cliente);
  const grupos = agruparAderecos(conjunto, catalogo.aderecos);
  const totalPontos = grupos.reduce((soma, grupo) => soma + grupo.quantidade, 0);
  const observacao = conjunto.observacao?.trim();

  return (
    <li className="detalhe-conjunto">
      <div className="detalhe-conjunto__topo">
        <h4>
          Conjunto #{numero}: {conjunto.cima.modelo || 'Top'} +{' '}
          {conjunto.baixo.modelo || 'Calcinha'}
        </h4>
      </div>

      <div className="detalhe-conjunto__previa">
        {modeloCima || modeloBaixo ? (
          <PedidoPreview
            modeloCima={modeloCima}
            modeloBaixo={modeloBaixo}
            tecido={tecido}
            pontos={pontosDoConjunto(conjunto, catalogo.aderecos)}
          />
        ) : (
          <span className="texto-suave">Prévia indisponível</span>
        )}
      </div>

      <FotoCorpo
        foto={foto}
        onAmpliar={onAmpliarFoto}
        rotulo={`Ampliar foto do corpo do conjunto ${numero}`}
      />

      <div className="detalhe-conjunto__especificacoes">
        <p>
          <strong>Malha:</strong> {conjunto.tecido || '—'}
        </p>
        <p>
          <strong>Tamanhos:</strong> Top {conjunto.cima.tamanho || '—'} | Calcinha{' '}
          {conjunto.baixo.tamanho || '—'}
        </p>

        <div className="detalhe-conjunto__aderecos">
          <p>
            Locais de Aplicação dos Adereços ({totalPontos} {totalPontos === 1 ? 'ponto' : 'pontos'}
            ):
          </p>
          {grupos.length > 0 ? (
            <ul>
              {grupos.map((grupo) => (
                <li key={grupo.nome} style={{ '--cor-adereco': grupo.cor } as CSSProperties}>
                  {grupo.nome}
                  {grupo.quantidade > 1 && ` (×${grupo.quantidade})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-suave">Sem adereços</p>
          )}
        </div>

        {observacao && (
          <p>
            <strong>Obs Medidas:</strong> “{observacao}”
          </p>
        )}
      </div>
    </li>
  );
}

export function DetalhePedidoModal({
  id,
  numPedido,
  modelos = [],
  tecidos = [],
  aderecos = [],
  onFechar,
}: Props) {
  const { usuario } = useAuth();
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const fotoAberta = useRef(false);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fotoAberta.current = fotoAmpliada !== null;
  }, [fotoAmpliada]);

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
      if (evento.key !== 'Escape') return;
      // Com a foto ampliada, o Esc fecha só a foto.
      if (fotoAberta.current) setFotoAmpliada(null);
      else onFechar();
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

  const catalogo: Catalogo = { modelos, tecidos, aderecos };
  const despacho = pedido
    ? calcularDespacho(pedido.data_entrega_prevista, pedido.prazo_frete_dias)
    : null;
  const endereco = pedido?.endereco;

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
          <h2 id="detalhe-pedido-titulo" className="modal-pedido__titulo">
            Pedido #{pedido?.num_pedido ?? (numPedido || '—')}
            {pedido && <small> • Realizado em {formatarDataPedido(pedido.data_pedido)}</small>}
          </h2>
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

          {pedido && endereco && (
            <>
              {pedido.motivo_recusa_cancelamento?.trim() && (
                <p className="alerta alerta--erro detalhe-pedido__motivo">
                  <strong>Motivo:</strong> {pedido.motivo_recusa_cancelamento}
                </p>
              )}

              <section className="detalhe-cliente" aria-label="Dados de entrega">
                {usuario?.name && <h3>{usuario.name}</h3>}
                <p className="texto-suave">
                  {[endereco.rua, endereco.numero, endereco.complemento].filter(Boolean).join(', ')}
                  {endereco.bairro && ` - ${endereco.bairro}`}
                  {endereco.cidade && ` - ${endereco.cidade}`}
                  {endereco.estado && `/${endereco.estado}`}
                  {endereco.cep && ` · CEP ${endereco.cep}`}
                </p>
                {despacho && <p>Data De Despacho (Envio): {formatarDataEntrega(despacho)}</p>}
                <p>
                  Entrega Desejada: {formatarDataEntrega(pedido.data_entrega_prevista)} (
                  {rotuloModalidade(pedido.modalidade_frete)})
                </p>
              </section>

              <section className="modal-pedido__secao" aria-labelledby="detalhe-conjuntos">
                <h3 id="detalhe-conjuntos" className="modal-pedido__secao-titulo">
                  Conjuntos do Pedido:
                </h3>
                {pedido.conjuntos.length === 0 ? (
                  <p className="texto-suave">Nenhum conjunto cadastrado neste pedido.</p>
                ) : (
                  <ol className="detalhe-pedido__conjuntos">
                    {pedido.conjuntos.map((conjunto, indice) => (
                      <CardConjunto
                        key={conjunto.id}
                        conjunto={conjunto}
                        numero={indice + 1}
                        catalogo={catalogo}
                        onAmpliarFoto={setFotoAmpliada}
                      />
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>

        {pedido && (
          <footer className="modal-pedido__rodape">
            {pedidoFoiAceito(pedido.status) && (
              <p className="texto-suave">
                1ª parcela {formatarMoeda(pedido.valor_parcela_1)} · 2ª parcela{' '}
                {formatarMoeda(pedido.valor_parcela_2)}
              </p>
            )}
            <div className="modal-pedido__total">
              <span>Valor Total:</span>
              <strong>{formatarMoeda(pedido.preco_final)}</strong>
            </div>
          </footer>
        )}

        {fotoAmpliada && (
          <div
            className="modal-pedido__overlay pedido-card__lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Foto do corpo ampliada"
            onMouseDown={() => setFotoAmpliada(null)}
          >
            <img src={fotoAmpliada} alt="Foto do corpo enviada no pedido" />
            <button
              type="button"
              className="pedido-card__lightbox-fechar"
              aria-label="Fechar foto"
              onClick={() => setFotoAmpliada(null)}
            >
              ×
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function rotuloModalidade(modalidade: string): string {
  if (modalidade === 'sedex') return 'Sedex Expresso';
  if (modalidade === 'padrao') return 'Padrão';
  return modalidade || '—';
}
