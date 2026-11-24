import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { StatusPedido } from '../../components/StatusPedido.tsx';
import { formatarMoeda } from '../../data/pedido.ts';
import { formatarDataEntrega, formatarDataPedido } from '../../data/statusPedido.ts';
import { urlDaImagemCatalogo } from '../../services/catalogo.ts';
import {
  buscarPedidoGestao,
  listarPedidosGestao,
  type PaginaPedidosGestao,
  type PedidoGestaoDetalhe,
  type PedidoGestaoResumo,
} from '../../services/pedidos.ts';

const FILTROS_STATUS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'em_analise', rotulo: 'Análise' },
  { valor: 'esperando_1_pag', rotulo: 'Esperando 1º pag.' },
  { valor: 'em_producao', rotulo: 'Produção' },
  { valor: 'enviado', rotulo: 'Enviado' },
  { valor: 'esperando_2_pag', rotulo: 'Esperando 2º pag.' },
  { valor: 'concluido', rotulo: 'Concluído' },
] as const;

const LIMITE_POR_PAGINA = 10;

function calcularDespacho(entrega: string, prazoDias: number | undefined): string {
  if (prazoDias === undefined) return '—';
  const valor = /^\d{4}-\d{2}-\d{2}$/.test(entrega) ? `${entrega}T12:00:00` : entrega;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  data.setDate(data.getDate() - prazoDias);
  return formatarDataEntrega(data.toISOString());
}

function urlDaFoto(foto: string | null | undefined): string | null {
  const valor = foto?.trim();
  if (!valor) return null;
  if (/^(https?:\/\/|data:image\/)/i.test(valor)) return valor;
  return valor.startsWith('/') ? urlDaImagemCatalogo(valor) : null;
}

function PedidoCardGestao({ pedido }: { pedido: PedidoGestaoResumo }) {
  const [detalhe, setDetalhe] = useState<PedidoGestaoDetalhe | null>(null);
  const [erroPrevia, setErroPrevia] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

  useEffect(() => {
    let ativo = true;
    void buscarPedidoGestao(pedido.id)
      .then((resultado) => {
        if (ativo) setDetalhe(resultado);
      })
      .catch(() => {
        if (ativo) setErroPrevia(true);
      });
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
  const foto = urlDaFoto(conjunto?.foto_cliente);

  return (
    <article className="gestao-pedido-card">
      <header className="gestao-pedido-card__principal">
        <h2>
          Pedido #{pedido.num_pedido} <span>• {pedido.cliente.nome}</span>
        </h2>
        <StatusPedido status={pedido.status} />
      </header>

      <div className="gestao-pedido-card__resumo">
        <div className="gestao-pedido-card__previa">
          {conjunto ? (
            <PedidoPreview
              modeloCima={conjunto.cima.modelo}
              modeloBaixo={conjunto.baixo.modelo}
              tecido={{ foto: conjunto.tecido.foto }}
              compacto
            />
          ) : erroPrevia ? (
            <span className="gestao-pedido-card__previa-estado">Prévia indisponível</span>
          ) : (
            <span className="gestao-pedido-card__previa-estado" role="status">
              Carregando…
            </span>
          )}
        </div>
        <dl className="gestao-pedido-card__dados">
          <div>
            <dt>Despacho em:</dt>
            <dd>{calcularDespacho(pedido.data_entrega_prevista, detalhe?.frete.prazo_dias)}</dd>
          </div>
          <div>
            <dt>Entrega em:</dt>
            <dd>{formatarDataEntrega(pedido.data_entrega_prevista)}</dd>
          </div>
          <div className="gestao-pedido-card__valor">
            <dt className="sr-only">Valor</dt>
            <dd>{formatarMoeda(pedido.preco_final ?? pedido.preco_estimado)}</dd>
          </div>
        </dl>
      </div>

      {foto && (
        <button
          type="button"
          className="gestao-pedido-card__foto"
          onClick={() => setFotoAmpliada(true)}
          aria-label="Ampliar foto do corpo"
        >
          <img src={foto} alt="" loading="lazy" />
          <span>
            <strong>Foto do Corpo (Medidas)</strong>
            <small>Clique na foto para ampliar</small>
          </span>
        </button>
      )}

      <footer className="gestao-pedido-card__rodape">
        <span>Criado em: {formatarDataPedido(pedido.data_pedido)}</span>
        <Link to={`/gestao/pedidos/${encodeURIComponent(pedido.id)}`}>
          Gerenciar Pedido <span aria-hidden="true">&gt;</span>
        </Link>
      </footer>

      {fotoAmpliada && foto && (
        <div
          className="gestao-pedido-card__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto do corpo ampliada"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setFotoAmpliada(false);
          }}
        >
          <img src={foto} alt="Foto do corpo enviada no pedido" />
          <button type="button" onClick={() => setFotoAmpliada(false)} aria-label="Fechar foto">
            ×
          </button>
        </div>
      )}
    </article>
  );
}

export function Pedidos() {
  const filtrosRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<string>('todos');
  const [pagina, setPagina] = useState(1);
  const [resposta, setResposta] = useState<{
    chave: string;
    pagina: PaginaPedidosGestao;
  } | null>(null);
  const [erro, setErro] = useState<{ chave: string; mensagem: string } | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const chaveConsulta = `${status}:${pagina}:${tentativa}`;
  const respostaAtual = resposta?.chave === chaveConsulta ? resposta.pagina : null;
  const erroAtual = erro?.chave === chaveConsulta ? erro.mensagem : null;
  const carregando = !respostaAtual && !erroAtual;

  useEffect(() => {
    const filtros = filtrosRef.current;
    if (!filtros) return;

    const rolarComRoda = (evento: WheelEvent) => {
      if (Math.abs(evento.deltaY) <= Math.abs(evento.deltaX)) return;

      const limite = filtros.scrollWidth - filtros.clientWidth;
      const deslocamento = evento.deltaY * 2;
      const proximoScroll = Math.min(limite, Math.max(0, filtros.scrollLeft + deslocamento));
      if (proximoScroll === filtros.scrollLeft) return;

      evento.preventDefault();
      filtros.scrollLeft = proximoScroll;
    };

    filtros.addEventListener('wheel', rolarComRoda, { passive: false });
    return () => filtros.removeEventListener('wheel', rolarComRoda);
  }, []);

  useEffect(() => {
    let ativo = true;

    void listarPedidosGestao(status, pagina, LIMITE_POR_PAGINA)
      .then((paginaResultado) => {
        if (ativo) setResposta({ chave: chaveConsulta, pagina: paginaResultado });
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro({
            chave: chaveConsulta,
            mensagem: e instanceof Error ? e.message : 'Não foi possível carregar os pedidos.',
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [chaveConsulta, pagina, status]);

  function selecionarStatus(novoStatus: string) {
    setStatus(novoStatus);
    setPagina(1);
  }

  return (
    <main className="app-main gestao-pedidos">
      <nav
        ref={filtrosRef}
        className="gestao-pedidos__filtros"
        aria-label="Filtrar pedidos por status"
      >
        {FILTROS_STATUS.map((filtro) => (
          <button
            type="button"
            className="gestao-pedidos__filtro"
            key={filtro.valor}
            aria-pressed={status === filtro.valor}
            onClick={() => selecionarStatus(filtro.valor)}
          >
            {filtro.rotulo}
          </button>
        ))}
      </nav>

      <section aria-label="Lista de pedidos" aria-busy={carregando}>
        {erroAtual ? (
          <div className="alerta alerta--erro gestao-pedidos__estado" role="alert">
            <p>{erroAtual}</p>
            <button
              type="button"
              className="botao botao--secundario botao--pequeno"
              onClick={() => {
                setTentativa((atual) => atual + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : carregando ? (
          <p className="gestao-pedidos__estado" role="status">
            Carregando pedidos…
          </p>
        ) : respostaAtual?.dados.length ? (
          <>
            <ul className="gestao-pedidos__lista">
              {respostaAtual.dados.map((pedido) => (
                <li key={pedido.id}>
                  <PedidoCardGestao pedido={pedido} />
                </li>
              ))}
            </ul>

            {respostaAtual.total_paginas > 1 && (
              <nav className="gestao-pedidos__paginacao" aria-label="Paginação dos pedidos">
                <button
                  type="button"
                  className="botao botao--secundario"
                  disabled={pagina <= 1 || carregando}
                  onClick={() => setPagina((atual) => atual - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {respostaAtual.pagina} de {respostaAtual.total_paginas}
                </span>
                <button
                  type="button"
                  className="botao botao--secundario"
                  disabled={pagina >= respostaAtual.total_paginas || carregando}
                  onClick={() => setPagina((atual) => atual + 1)}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="gestao-pedidos__estado gestao-pedidos__vazio">
            <h2>Nenhum pedido encontrado</h2>
            <p>Não há pedidos com o status selecionado.</p>
          </div>
        )}
      </section>
    </main>
  );
}
