import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as TecladoReact,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { StatusPedido } from '../../components/StatusPedido.tsx';
import { formatarMoeda } from '../../data/pedido.ts';
import { formatarDataEntrega } from '../../data/statusPedido.ts';
import { ErroApi, type ItemEstoqueErroApi } from '../../services/api.ts';
import { urlDaImagemCatalogo } from '../../services/catalogo.ts';
import {
  aceitarPedidoGestao,
  buscarPedidoGestao,
  recusarPedidoGestao,
  type PedidoGestaoDetalhe as PedidoGestao,
} from '../../services/pedidos.ts';

type AcaoPedido = 'recusar' | null;
type ErroAcao = {
  mensagem: string;
  estoqueInsuficiente: boolean;
  itens: ItemEstoqueErroApi[];
} | null;

function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11)
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  if (numeros.length === 10)
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return telefone;
}

function calcularDespacho(entrega: string, prazoDias: number): string {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(entrega)
    ? new Date(`${entrega}T12:00:00`)
    : new Date(entrega);
  if (Number.isNaN(data.getTime())) return '—';
  data.setDate(data.getDate() - prazoDias);
  return formatarDataEntrega(data.toISOString());
}

function nomeFrete(modalidade: string): string {
  return modalidade === 'sedex' ? 'Sedex Expresso' : 'Entrega Padrão';
}

function enderecoCompleto(pedido: PedidoGestao): string {
  const { rua, numero, complemento, bairro, cidade, estado, cep } = pedido.endereco;
  return [
    [rua, numero, complemento].filter(Boolean).join(', '),
    bairro,
    `${cidade}/${estado}`,
    `CEP ${cep}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function erroDaAcao(erro: unknown): ErroAcao {
  const mensagem =
    erro instanceof Error ? erro.message : 'Não foi possível atualizar o pedido. Tente novamente.';
  const codigo = erro instanceof ErroApi ? erro.codigo?.toLowerCase() : undefined;
  return {
    mensagem,
    estoqueInsuficiente:
      codigo === 'estoque_insuficiente' ||
      codigo === 'estoque_item_inexistente' ||
      mensagem.toLowerCase().includes('estoque insuficiente'),
    itens: erro instanceof ErroApi ? erro.itens ?? [] : [],
  };
}

function nomeTipoEstoque(tipo: ItemEstoqueErroApi['tipo']): string {
  return tipo === 'tecido' ? 'Tecido' : 'Adereço';
}

const MOTIVOS_RECUSA = [
  'Falta de malha/tecido no estoque',
  'Falta de adereços no estoque',
  'Data solicitada incompatível com a capacidade do ateliê',
  '1ª parcela (sinal) não foi paga no prazo',
  'Cliente solicitou o cancelamento',
] as const;

function SeletorMotivoRecusa({
  value,
  onChange,
  labelId,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (motivo: string) => void;
  labelId: string;
  invalid: boolean;
  disabled: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const indiceSelecionado = MOTIVOS_RECUSA.findIndex((motivo) => motivo === value);

  useEffect(() => {
    if (aberto) listaRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function fecharAoClicarFora(evento: PointerEvent) {
      if (
        evento.target instanceof Node &&
        !containerRef.current?.contains(evento.target)
      ) {
        setAberto(false);
      }
    }
    document.addEventListener('pointerdown', fecharAoClicarFora);
    return () => document.removeEventListener('pointerdown', fecharAoClicarFora);
  }, [aberto]);

  function abrir() {
    setIndiceAtivo(indiceSelecionado < 0 ? 0 : indiceSelecionado);
    setAberto(true);
  }

  function selecionar(motivo: string) {
    onChange(motivo);
    setAberto(false);
    botaoRef.current?.focus();
  }

  function aoTeclarNaLista(evento: TecladoReact<HTMLDivElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.min(atual + 1, MOTIVOS_RECUSA.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      setIndiceAtivo(0);
    } else if (evento.key === 'End') {
      evento.preventDefault();
      setIndiceAtivo(MOTIVOS_RECUSA.length - 1);
    } else if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      selecionar(MOTIVOS_RECUSA[indiceAtivo]);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      setAberto(false);
      botaoRef.current?.focus();
    } else if (evento.key === 'Tab') {
      setAberto(false);
    }
  }

  return (
    <div className="gestao-pedido-acao__seletor" ref={containerRef}>
      <button
        ref={botaoRef}
        type="button"
        className="gestao-pedido-acao__seletor-botao"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-labelledby={labelId}
        aria-required="true"
        aria-invalid={invalid}
        disabled={disabled}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            if (!aberto) abrir();
          }
        }}
      >
        <span>{value || 'Selecione um motivo'}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m3 6 5 5 5-5" />
        </svg>
      </button>
      {aberto && (
        <div
          ref={listaRef}
          id={`${id}-lista`}
          className="gestao-pedido-acao__opcoes"
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={`${id}-opcao-${indiceAtivo}`}
          tabIndex={-1}
          onKeyDown={aoTeclarNaLista}
        >
          {MOTIVOS_RECUSA.map((motivo, indice) => (
            <div
              id={`${id}-opcao-${indice}`}
              className={`gestao-pedido-acao__opcao${indiceAtivo === indice ? ' gestao-pedido-acao__opcao--ativa' : ''}`}
              key={motivo}
              role="option"
              aria-selected={value === motivo}
              onMouseEnter={() => setIndiceAtivo(indice)}
              onMouseMove={() => setIndiceAtivo(indice)}
              onClick={() => selecionar(motivo)}
            >
              {motivo}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PedidoGestaoDetalhe() {
  const { id = '' } = useParams();
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [acao, setAcao] = useState<AcaoPedido>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [erroAcao, setErroAcao] = useState<ErroAcao>(null);
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [resultado, setResultado] = useState<{
    chave: string;
    pedido: PedidoGestao;
  } | null>(null);
  const [erro, setErro] = useState<{ chave: string; mensagem: string } | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const chaveConsulta = `${id}:${tentativa}`;
  const pedido = resultado?.chave === chaveConsulta ? resultado.pedido : null;
  const erroAtual = erro?.chave === chaveConsulta ? erro.mensagem : null;
  const carregando = !pedido && !erroAtual;

  useEffect(() => {
    if (!acao) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !salvandoAcao) setAcao(null);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [acao, salvandoAcao]);

  useEffect(() => {
    if (!fotoAmpliada) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setFotoAmpliada(null);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [fotoAmpliada]);

  useEffect(() => {
    let ativo = true;

    void buscarPedidoGestao(id)
      .then((pedidoResultado) => {
        if (ativo) setResultado({ chave: chaveConsulta, pedido: pedidoResultado });
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro({
            chave: chaveConsulta,
            mensagem: e instanceof Error ? e.message : 'Não foi possível carregar o pedido.',
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [chaveConsulta, id]);

  function abrirAcao() {
    setErroAcao(null);
    setMotivoRecusa('');
    setAcao('recusar');
  }

  async function confirmarAceite() {
    setErroAcao(null);
    setSalvandoAcao(true);
    try {
      await aceitarPedidoGestao(id);
      setAcao(null);
      setTentativa((atual) => atual + 1);
    } catch (erro: unknown) {
      setErroAcao(erroDaAcao(erro));
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function confirmarRecusa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const motivo = motivoRecusa.trim();
    if (!motivo) {
      setErroAcao({
        mensagem: 'Informe o motivo da recusa.',
        estoqueInsuficiente: false,
        itens: [],
      });
      return;
    }

    setErroAcao(null);
    setSalvandoAcao(true);
    try {
      await recusarPedidoGestao(id, motivo);
      setAcao(null);
      setTentativa((atual) => atual + 1);
    } catch (erro: unknown) {
      setErroAcao(erroDaAcao(erro));
    } finally {
      setSalvandoAcao(false);
    }
  }

  function fecharAcao() {
    if (salvandoAcao) return;
    setAcao(null);
    setErroAcao(null);
  }

  return (
    <main className="app-main gestao-pedido-detalhe">
      <div className="gestao-pedido-detalhe__navegacao">
        <Link to="/gestao/pedidos">‹ Voltar</Link>
        {pedido && (
          <>
            <span className="gestao-pedido-detalhe__titulo">
              Pedido #{pedido.num_pedido} • {pedido.cliente.nome}
            </span>
            <StatusPedido
              status={pedido.status}
              rotulo={
                pedido.status === 'em_analise'
                  ? 'Análise'
                  : pedido.status === 'esperando_1_pag'
                    ? 'Esp. 1º pag.'
                    : pedido.status === 'esperando_2_pag'
                      ? 'Esp. 2º pag.'
                      : undefined
              }
            />
          </>
        )}
      </div>

      {carregando ? (
        <p className="gestao-pedido-detalhe__estado" role="status">
          Carregando detalhes do pedido…
        </p>
      ) : erroAtual ? (
        <div className="alerta alerta--erro gestao-pedido-detalhe__estado" role="alert">
          <p>{erroAtual}</p>
          <button
            type="button"
            className="botao botao--secundario botao--pequeno"
            onClick={() => setTentativa((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : pedido ? (
        <>
          <section
            className="gestao-detalhe-cliente cartao"
            aria-labelledby="gestao-cliente-titulo"
          >
            <div className="gestao-detalhe-cliente__topo">
              <div>
                <h1 id="gestao-cliente-titulo">{pedido.cliente.nome}</h1>
                <p>Contato: {formatarTelefone(pedido.telefone)}</p>
              </div>
              <button type="button" className="gestao-detalhe-cliente__whatsapp">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 1.1a6.3 6.3 0 0 0-5.4 9.55L1.7 14.4l3.9-1a6.4 6.4 0 1 0 2.4-12.3Zm0 11.5c-.8 0-1.6-.2-2.3-.6l-.3-.2-2.3.6.6-2.2-.2-.3A5.2 5.2 0 1 1 8 12.6Zm2.9-3.9c-.2-.1-1-.5-1.2-.5s-.3-.1-.4.1-.5.5-.6.6-.2.1-.4 0a4.2 4.2 0 0 1-1.2-.7 4.7 4.7 0 0 1-.8-1c-.1-.2 0-.3.1-.4l.3-.3.2-.3v-.3l-.5-1.2c-.1-.3-.3-.3-.4-.3h-.4c-.1 0-.3 0-.5.2s-.6.6-.6 1.4.6 1.5.7 1.6a5.8 5.8 0 0 0 2.3 2c1.4.6 1.9.7 2.2.6.4-.1 1-.4 1.1-.8s.1-.7.1-.8 0-.1-.2-.2Z" />
                </svg>
                WhatsApp
              </button>
            </div>
            <p>{enderecoCompleto(pedido)}</p>
            <dl className="gestao-detalhe-cliente__datas">
              <div>
                <dt>Data de Despacho (Envio):</dt>
                <dd>{calcularDespacho(pedido.data_entrega_prevista, pedido.frete.prazo_dias)}</dd>
              </div>
              <div>
                <dt>Entrega Desejada:</dt>
                <dd>
                  {formatarDataEntrega(pedido.data_entrega_prevista)} (
                  {nomeFrete(pedido.frete.modalidade)}) · Frete {formatarMoeda(pedido.frete.preco)}
                </dd>
              </div>
              <div>
                <dt>Valor Total:</dt>
                <dd>{formatarMoeda(pedido.preco_final ?? pedido.preco_estimado)}</dd>
              </div>
            </dl>
          </section>

          <section className="gestao-detalhe-conjuntos" aria-label="Conjuntos do pedido">
            {pedido.conjuntos.length ? (
              <ol className="gestao-detalhe-conjuntos__lista">
                {pedido.conjuntos.map((conjunto, indice) => {
                  const fotoReferencia = conjunto.foto_cliente?.trim();
                  const aderecos = [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos];

                  return (
                    <li className="gestao-conjunto cartao" key={conjunto.id}>
                      <div className="gestao-conjunto__cabecalho">
                        <h3>
                          Conjunto #{indice + 1}: {conjunto.cima.modelo.nome} +{' '}
                          {conjunto.baixo.modelo.nome}
                        </h3>
                      </div>
                      <PedidoPreview
                        modeloCima={conjunto.cima.modelo}
                        modeloBaixo={conjunto.baixo.modelo}
                        tecido={{ foto: conjunto.tecido.foto }}
                        compacto
                      />
                      {fotoReferencia && (
                        <button
                          type="button"
                          className="gestao-conjunto__foto"
                          onClick={() => setFotoAmpliada(urlDaImagemCatalogo(fotoReferencia))}
                        >
                          <img src={urlDaImagemCatalogo(fotoReferencia)} alt="" loading="lazy" />
                          <span>
                            <strong>Foto do Corpo (Medidas)</strong>
                            <small>Clique na foto para ampliar</small>
                          </span>
                        </button>
                      )}
                      <div className="gestao-conjunto__producao">
                        <p>
                          Malha: <strong>{conjunto.tecido.nome}</strong>
                        </p>
                        <p>
                          Tamanhos: Top {conjunto.cima.tamanho} | Calcinha {conjunto.baixo.tamanho}
                        </p>
                        <div className="gestao-conjunto__locais">
                          <p>Locais de Aplicação dos Adereços ({aderecos.length} pontos):</p>
                          {aderecos.length ? (
                            <ul className="gestao-conjunto__aderecos">
                              {aderecos.map((adereco, ponto) => (
                                <li key={`${adereco.id_adereco}-${ponto}`}>
                                  Ponto #{ponto + 1}: {adereco.nome} (Posição: X{' '}
                                  {Math.round(adereco.coordenada_x * 100)}%, Y{' '}
                                  {Math.round(adereco.coordenada_y * 100)}%)
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>Sem adereços</p>
                          )}
                        </div>
                        {conjunto.observacao?.trim() && (
                          <p>Obs Medidas: &quot;{conjunto.observacao.trim()}&quot;</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="gestao-pedido-detalhe__estado">Este pedido não possui conjuntos.</p>
            )}
          </section>

          {pedido.status === 'em_analise' ? (
            <div className="gestao-pedido-detalhe__acoes" role="group" aria-label="Ações do pedido">
              <button
                type="button"
                className="gestao-pedido-detalhe__acao gestao-pedido-detalhe__acao--recusar"
                disabled={salvandoAcao}
                onClick={abrirAcao}
              >
                <span aria-hidden="true">×</span>
                Recusar
              </button>
              <button
                type="button"
                className="gestao-pedido-detalhe__acao gestao-pedido-detalhe__acao--aceitar"
                disabled={salvandoAcao}
                onClick={() => void confirmarAceite()}
              >
                <span aria-hidden="true">✓</span>
                {salvandoAcao ? 'Aceitando…' : 'Aceitar'}
              </button>
            </div>
          ) : pedido.status === 'esperando_1_pag' ? (
            <div className="gestao-pedido-detalhe__acoes" role="group" aria-label="Ações do pedido">
              <button
                type="button"
                className="gestao-pedido-detalhe__acao gestao-pedido-detalhe__acao--recusar"
              >
                <span aria-hidden="true">×</span>
                Cancelar
              </button>
              <button
                type="button"
                className="gestao-pedido-detalhe__acao gestao-pedido-detalhe__acao--aceitar"
              >
                <span aria-hidden="true">✓</span>
                Confirmar 1º Pagamento
              </button>
            </div>
          ) : null}

          {pedido.status === 'em_analise' && erroAcao && !acao && (
            <div
              className={`gestao-pedido-acao__erro${erroAcao.estoqueInsuficiente ? ' gestao-pedido-acao__erro--estoque' : ''}`}
              role="alert"
            >
              <p>{erroAcao.mensagem}</p>
              {erroAcao.itens.length > 0 && (
                <ul>
                  {erroAcao.itens.map((item) => (
                    <li key={`${item.tipo}-${item.id}`}>
                      {nomeTipoEstoque(item.tipo)}: {item.nome}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {fotoAmpliada && (
            <div
              className="gestao-conjunto__foto-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Foto de referência ampliada"
              onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) setFotoAmpliada(null);
              }}
            >
              <img src={fotoAmpliada} alt="Foto de referência enviada para o conjunto" />
              <button type="button" onClick={() => setFotoAmpliada(null)} aria-label="Fechar foto">
                ×
              </button>
            </div>
          )}

          {acao && (
            <div
              className="gestao-pedido-acao__overlay gestao-pedido-acao__overlay--recusa"
              onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) fecharAcao();
              }}
            >
              <section
                className="gestao-pedido-acao__dialog gestao-pedido-acao__dialog--recusa"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gestao-pedido-acao-titulo"
              >
                <form onSubmit={(evento) => void confirmarRecusa(evento)}>
                  <h2 id="gestao-pedido-acao-titulo">Recusar Pedido</h2>
                  <p>Informe o motivo da recusa do pedido:</p>
                  <div className="gestao-pedido-acao__campo">
                    <span id="motivo-recusa-label">Motivo da recusa</span>
                    <SeletorMotivoRecusa
                      value={motivoRecusa}
                      onChange={setMotivoRecusa}
                      labelId="motivo-recusa-label"
                      invalid={!motivoRecusa && Boolean(erroAcao)}
                      disabled={salvandoAcao}
                    />
                  </div>
                  {erroAcao && (
                    <p className="gestao-pedido-acao__erro" role="alert">
                      {erroAcao.mensagem}
                    </p>
                  )}
                  <div className="gestao-pedido-acao__botoes gestao-pedido-acao__botoes--recusa">
                    <button type="button" disabled={salvandoAcao} onClick={fecharAcao}>
                      Voltar
                    </button>
                    <button type="submit" disabled={salvandoAcao}>
                      {salvandoAcao ? 'Confirmando…' : 'Confirmar'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
