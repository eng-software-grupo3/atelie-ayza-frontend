import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import {
  subtotalPedidoCentavos,
  type ConjuntoPedidoBody,
  type ConjuntoPedidoCompleto,
  type ContextoPedido,
  type ModalidadeFrete,
} from '../../data/pedido.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { ErroApi } from '../../services/api.ts';
import {
  carregarDatasDisponiveis,
  cotarFrete,
  type CotacaoFrete,
  type DatasDisponiveis,
  type ModalidadeCotada,
} from '../../services/entrega.ts';
import { criarPedido, type PedidoCriado } from '../../services/pedidos.ts';

const diasDaSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const nomesDosMeses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function mesLocal(data: Date): string {
  return dataLocal(data).slice(0, 7);
}

function mudarMes(mes: string, quantidade: number): string {
  const [ano, numeroMes] = mes.split('-').map(Number);
  return mesLocal(new Date(ano, numeroMes - 1 + quantidade, 1));
}

function primeiroDiaDoMes(mes: string): Date {
  const [ano, numeroMes] = mes.split('-').map(Number);
  return new Date(ano, numeroMes - 1, 1);
}

function nomeModalidade(modalidade: ModalidadeFrete): string {
  return modalidade === 'sedex' ? 'SEDEX' : 'Padrão';
}

function conjuntoCompleto(
  conjunto: ConjuntoPedidoBody,
): conjunto is ConjuntoPedidoCompleto {
  return Boolean(conjunto.id_tecido && conjunto.cima.id_modelo && conjunto.baixo.id_modelo);
}

function mensagemDaCotacao(erro: unknown): string {
  if (erro instanceof ErroApi) {
    if (erro.status === 503) {
      return 'O serviço de CEP ou frete está indisponível. Tente de novo.';
    }
    return erro.message;
  }
  return 'Não foi possível calcular o frete. Verifique a conexão e tente de novo.';
}

export function Entrega() {
  const {
    pedido,
    conjuntos,
    setConjuntos,
    setIndiceConjuntoAtivo,
    catalogos,
    dadosEntrega,
    setDadosEntrega,
    avisar,
  } = useOutletContext<ContextoPedido>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [mesExibido, setMesExibido] = useState(() => mesLocal(new Date()));
  const [cotacao, setCotacao] = useState<CotacaoFrete | null>(null);
  const [carregandoFrete, setCarregandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState('');
  const [calendario, setCalendario] = useState<DatasDisponiveis | null>(null);
  const [carregandoCalendario, setCarregandoCalendario] = useState(false);
  const [erroCalendario, setErroCalendario] = useState('');
  const [tentativaCalendario, setTentativaCalendario] = useState(0);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoCriado | null>(null);
  const requisicaoCotacao = useRef(0);

  const modalidadeSelecionada = cotacao?.modalidades.find(
    (modalidade) => modalidade.modalidade === dadosEntrega.modalidadeFrete,
  );
  const catalogoCompleto = conjuntos.every((conjunto) => {
    if (
      !conjunto.id_tecido ||
      !conjunto.cima.id_modelo ||
      !conjunto.baixo.id_modelo ||
      !catalogos.modelos ||
      !catalogos.tecidos ||
      !catalogos.aderecos
    ) {
      return false;
    }
    return (
      catalogos.modelos.some((modelo) => modelo.id === conjunto.cima.id_modelo) &&
      catalogos.modelos.some((modelo) => modelo.id === conjunto.baixo.id_modelo) &&
      catalogos.tecidos.some((tecido) => tecido.id === conjunto.id_tecido) &&
      [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos].every((aplicado) =>
        catalogos.aderecos?.some((adereco) => adereco.id === aplicado.id_adereco),
      )
    );
  });
  const subtotalCentavos = catalogoCompleto ? subtotalPedidoCentavos(conjuntos, catalogos) : null;
  const telefoneValido = /^[1-9]\d{9,10}$/.test(dadosEntrega.telefone.replace(/\D/g, ''));
  const cepValido = /^\d{8}$/.test(dadosEntrega.cep.replace(/\D/g, ''));
  const numeroValido = dadosEntrega.semNumero || Boolean(dadosEntrega.numero.trim());
  const dataSelecionadaValida = Boolean(
    dadosEntrega.dataEntregaPrevista &&
      calendario?.dias.some(
        (dia) => dia.data === dadosEntrega.dataEntregaPrevista && dia.disponivel,
      ),
  );
  const enderecoCompleto = Boolean(
    dadosEntrega.rua.trim() &&
      dadosEntrega.bairro.trim() &&
      numeroValido,
  );
  const formularioValido = Boolean(
    conjuntos.length > 0 &&
      catalogoCompleto &&
      subtotalCentavos !== null &&
      cepValido &&
      enderecoCompleto &&
      telefoneValido &&
      modalidadeSelecionada &&
      dataSelecionadaValida,
  );
  const totalCentavos = subtotalCentavos !== null && modalidadeSelecionada
    ? subtotalCentavos + Math.round(modalidadeSelecionada.preco * 100)
    : null;

  /* oxlint-disable react(set-state-in-effect) */
  useEffect(() => {
    if (
      dadosEntrega.quantidadeConjuntosCotada === null ||
      dadosEntrega.quantidadeConjuntosCotada === conjuntos.length
    ) {
      return;
    }

    const idRequisicao = ++requisicaoCotacao.current;
    setCotacao(null);
    setCalendario(null);
    setErroFrete('');
    setErroCalendario('');
    setCarregandoFrete(cepValido);
    setDadosEntrega((atual) => ({
      ...atual,
      quantidadeConjuntosCotada: null,
      modalidadeFrete: '',
      dataEntregaPrevista: '',
    }));

    if (!cepValido) {
      setCarregandoFrete(false);
      return;
    }

    void cotarFrete(dadosEntrega.cep, conjuntos.length)
      .then((resultado) => {
        if (idRequisicao !== requisicaoCotacao.current) return;
        setCotacao(resultado);
        setDadosEntrega((atual) => ({
          ...atual,
          cep: resultado.cep,
          rua: resultado.endereco.logradouro ?? atual.rua,
          ruaViaCep: Boolean(resultado.endereco.logradouro?.trim()),
          bairro: resultado.endereco.bairro ?? atual.bairro,
          bairroViaCep: Boolean(resultado.endereco.bairro?.trim()),
          quantidadeConjuntosCotada: conjuntos.length,
        }));
      })
      .catch((erroDaCotacao: unknown) => {
        if (idRequisicao !== requisicaoCotacao.current) return;
        setErroFrete(mensagemDaCotacao(erroDaCotacao));
        setDadosEntrega((atual) => ({ ...atual, quantidadeConjuntosCotada: null }));
      })
      .finally(() => {
        if (idRequisicao === requisicaoCotacao.current) setCarregandoFrete(false);
      });
  }, [
    conjuntos.length,
    dadosEntrega.cep,
    dadosEntrega.quantidadeConjuntosCotada,
    cepValido,
    setDadosEntrega,
  ]);
  /* oxlint-enable react(set-state-in-effect) */

  // A cotação revalida endereço e preço para o mês e prazo de frete escolhidos.
  /* oxlint-disable react(set-state-in-effect) */
  useEffect(() => {
    if (!modalidadeSelecionada) {
      setCalendario(null);
      setErroCalendario('');
      setCarregandoCalendario(false);
      return;
    }

    let ativo = true;
    setCalendario(null);
    setErroCalendario('');
    setCarregandoCalendario(true);

    void carregarDatasDisponiveis(mesExibido, modalidadeSelecionada.prazo_frete_dias)
      .then((resultado) => {
        if (ativo) setCalendario(resultado);
      })
      .catch((erroDaAgenda: unknown) => {
        if (ativo) {
          setErroCalendario(
            erroDaAgenda instanceof Error
              ? erroDaAgenda.message
              : 'Não foi possível carregar as datas. Tente novamente.',
          );
        }
      })
      .finally(() => {
        if (ativo) setCarregandoCalendario(false);
      });

    return () => {
      ativo = false;
    };
  }, [mesExibido, modalidadeSelecionada, tentativaCalendario]);
  /* oxlint-enable react(set-state-in-effect) */

  function atualizarCep(valor: string) {
    requisicaoCotacao.current += 1;
    setCarregandoFrete(false);
    setDadosEntrega((atual) => ({
      ...atual,
      cep: valor,
      rua: '',
      ruaViaCep: false,
      bairro: '',
      bairroViaCep: false,
      quantidadeConjuntosCotada: null,
      modalidadeFrete: '',
      dataEntregaPrevista: '',
    }));
    setCotacao(null);
    setCalendario(null);
    setErroFrete('');
    setErroCalendario('');
    setErro('');
  }

  async function calcularFrete() {
    setErro('');
    setErroFrete('');
    const idRequisicao = ++requisicaoCotacao.current;
    setCotacao(null);
    setCalendario(null);
    setDadosEntrega((atual) => ({
      ...atual,
      quantidadeConjuntosCotada: null,
      modalidadeFrete: '',
      dataEntregaPrevista: '',
    }));

    if (!cepValido) {
      setErroFrete('Informe um CEP com 8 números para calcular o frete.');
      return;
    }

    setCarregandoFrete(true);
    try {
      const quantidadeCotada = conjuntos.length;
      const resultado = await cotarFrete(dadosEntrega.cep, quantidadeCotada);
      if (idRequisicao !== requisicaoCotacao.current) return;
      setCotacao(resultado);
      setDadosEntrega((atual) => ({
        ...atual,
        cep: resultado.cep,
        rua: resultado.endereco.logradouro ?? atual.rua,
        ruaViaCep: Boolean(resultado.endereco.logradouro?.trim()),
        bairro: resultado.endereco.bairro ?? atual.bairro,
        bairroViaCep: Boolean(resultado.endereco.bairro?.trim()),
        quantidadeConjuntosCotada: quantidadeCotada,
      }));
      setErroCalendario('');
    } catch (erroDaCotacao: unknown) {
      if (idRequisicao === requisicaoCotacao.current) {
        setErroFrete(mensagemDaCotacao(erroDaCotacao));
      }
    } finally {
      if (idRequisicao === requisicaoCotacao.current) setCarregandoFrete(false);
    }
  }

  function selecionarModalidade(modalidade: ModalidadeCotada) {
    setDadosEntrega((atual) => ({
      ...atual,
      modalidadeFrete: modalidade.modalidade,
      dataEntregaPrevista: '',
    }));
    setCalendario(null);
    setErroCalendario('');
    setErro('');
  }

  function atualizarRua(valor: string) {
    setDadosEntrega((atual) => ({ ...atual, rua: valor }));
  }

  function atualizarBairro(valor: string) {
    setDadosEntrega((atual) => ({ ...atual, bairro: valor }));
  }

  function marcarSemNumero(marcado: boolean) {
    setDadosEntrega((atual) => ({
      ...atual,
      semNumero: marcado,
      numero: marcado ? 'S/N' : atual.numero === 'S/N' ? '' : atual.numero,
    }));
  }

  function selecionarData(data: string) {
    setDadosEntrega((atual) => ({ ...atual, dataEntregaPrevista: data }));
    setErro('');
  }

  function navegarMes(diferenca: number) {
    setMesExibido((atual) => mudarMes(atual, diferenca));
    setDadosEntrega((atual) => ({ ...atual, dataEntregaPrevista: '' }));
    setErroCalendario('');
  }

  function erroDeEnvio(erroEnvio: unknown) {
    if (!(erroEnvio instanceof ErroApi)) {
      setErro('Não foi possível conectar à API. Verifique sua conexão e tente de novo.');
      return;
    }

    if (erroEnvio.codigo === 'data_indisponivel') {
      setDadosEntrega((atual) => ({ ...atual, dataEntregaPrevista: '' }));
      setErro('Essa data foi bloqueada. Atualizamos o calendário; escolha outra data disponível.');
      setTentativaCalendario((tentativa) => tentativa + 1);
      return;
    }

    if (erroEnvio.codigo === 'item_indisponivel') {
      const ids = new Set(erroEnvio.ids ?? []);
      if (ids.size === 0) {
        avisar('Um ou mais itens ficaram indisponíveis. Confira e corrija os conjuntos do pedido.');
        void navigate('/pedido/novo/resumo');
        return;
      }

      const destino = (() => {
        for (const [indice, conjunto] of conjuntos.entries()) {
          if (
            (conjunto.cima.id_modelo !== null && ids.has(conjunto.cima.id_modelo)) ||
            (conjunto.baixo.id_modelo !== null && ids.has(conjunto.baixo.id_modelo))
          ) {
            return { indice, etapa: 'modelo' as const };
          }
          if (conjunto.id_tecido !== null && ids.has(conjunto.id_tecido)) {
            return { indice, etapa: 'tecido' as const };
          }
          if (
            [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos].some((item) =>
              ids.has(item.id_adereco),
            )
          ) {
            return { indice, etapa: 'aderecos' as const };
          }
        }
        return null;
      })();
      const idsEncontrados = new Set(
        conjuntos.flatMap((conjunto) => [
          ...(conjunto.id_tecido ? [conjunto.id_tecido] : []),
          ...(conjunto.cima.id_modelo ? [conjunto.cima.id_modelo] : []),
          ...conjunto.cima.aderecos.map((item) => item.id_adereco),
          ...(conjunto.baixo.id_modelo ? [conjunto.baixo.id_modelo] : []),
          ...conjunto.baixo.aderecos.map((item) => item.id_adereco),
        ]),
      );
      const idsRemovidos = new Set([...ids].filter((id) => idsEncontrados.has(id)));

      if (destino) {
        setConjuntos((atuais) =>
          atuais.map((conjunto) => {
            const cimaIndisponivel =
              conjunto.cima.id_modelo !== null && idsRemovidos.has(conjunto.cima.id_modelo);
            const baixoIndisponivel =
              conjunto.baixo.id_modelo !== null && idsRemovidos.has(conjunto.baixo.id_modelo);
            const tecidoIndisponivel =
              conjunto.id_tecido !== null && idsRemovidos.has(conjunto.id_tecido);

            return {
              ...conjunto,
              id_tecido: tecidoIndisponivel ? null : conjunto.id_tecido,
              cima: {
                ...conjunto.cima,
                id_modelo: cimaIndisponivel ? null : conjunto.cima.id_modelo,
                aderecos: cimaIndisponivel
                  ? []
                  : conjunto.cima.aderecos.filter(
                      (item) => !idsRemovidos.has(item.id_adereco),
                    ),
              },
              baixo: {
                ...conjunto.baixo,
                id_modelo: baixoIndisponivel ? null : conjunto.baixo.id_modelo,
                aderecos: baixoIndisponivel
                  ? []
                  : conjunto.baixo.aderecos.filter(
                      (item) => !idsRemovidos.has(item.id_adereco),
                    ),
              },
            };
          }),
        );
        setIndiceConjuntoAtivo(destino.indice);
        avisar(
          `Os itens indisponíveis (${[...idsRemovidos].join(', ')}) foram removidos do rascunho. Escolha substitutos para continuar.`,
        );
        void navigate(`/pedido/novo/${destino.etapa}`);
      } else {
        avisar(
          `O backend informou itens indisponíveis (${[...ids].join(', ')}), mas nenhum corresponde aos itens do rascunho.`,
        );
      }
      return;
    }

    if (erroEnvio.status === 503) {
      setErro('O serviço de CEP ou frete está indisponível. Tente de novo.');
      return;
    }

    setErro(erroEnvio.message);
  }

  async function confirmarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro('');

    if (!formularioValido || !modalidadeSelecionada || !pedido.conjuntos.every(conjuntoCompleto)) {
      setErro('Confira os dados obrigatórios, o frete, a data e os conjuntos antes de confirmar.');
      return;
    }

    setEnviando(true);
    try {
      const criado = await criarPedido({
        telefone: dadosEntrega.telefone,
        endereco: {
          cep: dadosEntrega.cep,
          numero: dadosEntrega.semNumero ? 'S/N' : dadosEntrega.numero,
          complemento: dadosEntrega.complemento,
          ...(dadosEntrega.ruaViaCep ? {} : { rua: dadosEntrega.rua }),
          ...(dadosEntrega.bairroViaCep ? {} : { bairro: dadosEntrega.bairro }),
        },
        modalidade_frete: modalidadeSelecionada.modalidade,
        data_entrega_prevista: dadosEntrega.dataEntregaPrevista,
        conjuntos: pedido.conjuntos,
      });
      setPedidoConfirmado(criado);
    } catch (erroEnvio: unknown) {
      erroDeEnvio(erroEnvio);
    } finally {
      setEnviando(false);
    }
  }

  const primeiroDia = (primeiroDiaDoMes(mesExibido).getDay() + 6) % 7;
  const diasNoMes = new Date(
    Number(mesExibido.slice(0, 4)),
    Number(mesExibido.slice(5, 7)),
    0,
  ).getDate();
  const calendarioCarregado = useMemo(() => calendario?.mes === mesExibido, [calendario, mesExibido]);

  return (
    <section className="entrega">
      <header className="entrega__cabecalho">
        <h1>Entrega e confirmação</h1>
        <p>Confira seus dados, escolha o frete e agende a entrega.</p>
      </header>

      <form
        className="entrega__formulario"
        id="entrega-formulario"
        onSubmit={(evento) => void confirmarPedido(evento)}
      >
        <section className="entrega__secao" aria-labelledby="entrega-contato-titulo">
          <h2 id="entrega-contato-titulo">Contato do cliente</h2>
          <div className="entrega__grade entrega__grade--contato">
            <label className="campo">
              <span className="campo__rotulo">Nome</span>
              <input autoComplete="name" readOnly value={usuario?.name ?? ''} />
            </label>
            <label className="campo">
              <span className="campo__rotulo">Telefone</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={18}
                placeholder="(00) 00000-0000"
                required
                value={dadosEntrega.telefone}
                onChange={(evento) =>
                  setDadosEntrega((atual) => ({ ...atual, telefone: evento.target.value }))
                }
              />
            </label>
          </div>
          {!telefoneValido && dadosEntrega.telefone && (
            <p className="entrega__ajuda entrega__ajuda--erro" role="status">
              Informe um telefone com DDD e 10 ou 11 números.
            </p>
          )}
        </section>

        <section className="entrega__secao" aria-labelledby="entrega-endereco-titulo">
          <h2 id="entrega-endereco-titulo">Endereço de entrega</h2>
          <div className="entrega__cep-linha">
            <label className="campo">
              <span className="campo__rotulo">CEP</span>
              <input
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
                required
                value={dadosEntrega.cep}
                onChange={(evento) => atualizarCep(evento.target.value)}
              />
            </label>
            <button
              className="botao entrega__calcular"
              disabled={!cepValido || carregandoFrete || conjuntos.length === 0}
              type="button"
              onClick={() => void calcularFrete()}
            >
              {carregandoFrete ? 'Calculando...' : 'Calcular frete'}
            </button>
          </div>
          {!cepValido && dadosEntrega.cep && (
            <p className="entrega__ajuda entrega__ajuda--erro" role="status">
              Informe um CEP com 8 números.
            </p>
          )}
          {erroFrete && (
            <div className="entrega__mensagem entrega__mensagem--erro" role="alert">
              <p>{erroFrete}</p>
              <button
                className="botao"
                disabled={!cepValido || carregandoFrete}
                type="button"
                onClick={() => void calcularFrete()}
              >
                Tentar novamente
              </button>
            </div>
          )}
          <div className="entrega__grade entrega__grade--endereco">
            <label className="campo entrega__campo-rua">
              <span className="campo__rotulo">Rua</span>
              <input
                autoComplete="address-line1"
                maxLength={150}
                readOnly={dadosEntrega.ruaViaCep}
                required
                value={dadosEntrega.rua}
                onChange={(evento) => atualizarRua(evento.target.value)}
              />
            </label>
            <label className="campo">
              <span className="campo__rotulo">Bairro</span>
              <input
                autoComplete="address-level3"
                maxLength={100}
                readOnly={dadosEntrega.bairroViaCep}
                required
                value={dadosEntrega.bairro}
                onChange={(evento) => atualizarBairro(evento.target.value)}
              />
            </label>
            <div className="entrega__numero-linha">
              <label className="campo">
                <span className="campo__rotulo">Número</span>
                <input
                  autoComplete="address-line2"
                  disabled={dadosEntrega.semNumero}
                  maxLength={20}
                  required={!dadosEntrega.semNumero}
                  value={dadosEntrega.semNumero ? 'S/N' : dadosEntrega.numero}
                  onChange={(evento) =>
                    setDadosEntrega((atual) => ({ ...atual, numero: evento.target.value }))
                  }
                />
              </label>
              <label className="entrega__sem-numero">
                <input
                  checked={dadosEntrega.semNumero}
                  type="checkbox"
                  onChange={(evento) => marcarSemNumero(evento.target.checked)}
                />
                Sem número
              </label>
            </div>
            <label className="campo">
              <span className="campo__rotulo">Complemento</span>
              <input
                autoComplete="address-line3"
                maxLength={250}
                value={dadosEntrega.complemento}
                onChange={(evento) =>
                  setDadosEntrega((atual) => ({ ...atual, complemento: evento.target.value }))
                }
              />
            </label>
          </div>
          {cotacao && (
            <p className="entrega__endereco-cotado" role="status">
              {cotacao.endereco.cidade} - {cotacao.endereco.estado}
            </p>
          )}
        </section>

        <section className="entrega__secao" aria-labelledby="entrega-frete-titulo">
          <h2 id="entrega-frete-titulo">Modalidade de frete</h2>
          {cotacao ? (
            cotacao.modalidades.length ? (
              <>
                <div className="entrega__fretes" role="radiogroup" aria-label="Escolha do frete">
                  {cotacao.modalidades.map((modalidade) => (
                    <label
                      className={`entrega__frete${dadosEntrega.modalidadeFrete === modalidade.modalidade ? ' entrega__frete--selecionado' : ''}`}
                      key={modalidade.modalidade}
                    >
                      <input
                        checked={dadosEntrega.modalidadeFrete === modalidade.modalidade}
                        name="modalidade-frete"
                        type="radio"
                        value={modalidade.modalidade}
                        onChange={() => selecionarModalidade(modalidade)}
                      />
                      <span className="entrega__frete-info">
                        <strong>{nomeModalidade(modalidade.modalidade)}</strong>
                        <span>
                          {modalidade.prazo_frete_dias === 0
                            ? 'Entrega local'
                            : `${modalidade.prazo_frete_dias} ${modalidade.prazo_frete_dias === 1 ? 'dia' : 'dias'}`}
                        </span>
                      </span>
                      <strong className="entrega__frete-preco">
                        {modalidade.preco === 0
                          ? 'Grátis'
                          : `R$ ${modalidade.preco.toFixed(2).replace('.', ',')}`}
                      </strong>
                    </label>
                  ))}
                </div>
                <p className="entrega__ajuda">
                  Valores e prazos calculados para {conjuntos.length}{' '}
                  {conjuntos.length === 1 ? 'conjunto' : 'conjuntos'}.
                </p>
              </>
            ) : (
              <p className="entrega__ajuda">Não há modalidades de frete disponíveis para este CEP.</p>
            )
          ) : (
            <p className="entrega__ajuda">Calcule o frete para consultar as modalidades disponíveis.</p>
          )}
        </section>

        <section className="entrega__secao" aria-labelledby="entrega-data-titulo">
          <h2 id="entrega-data-titulo">Data de entrega</h2>
          {modalidadeSelecionada ? (
            <>
              {calendarioCarregado && calendario && (
                <p className="entrega__ajuda">
                  A primeira data possível é{' '}
                  {new Date(`${calendario.data_minima}T12:00:00`).toLocaleDateString('pt-BR')}.
                </p>
              )}
              <div className="entrega__calendario">
                <div className="entrega__calendario-topo">
                  <button
                    aria-label="Mês anterior"
                    className="entrega__mes"
                    type="button"
                    onClick={() => navegarMes(-1)}
                  >
                    ‹
                  </button>
                  <h3>
                    {nomesDosMeses[Number(mesExibido.slice(5, 7)) - 1]} de {mesExibido.slice(0, 4)}
                  </h3>
                  <button
                    aria-label="Próximo mês"
                    className="entrega__mes"
                    type="button"
                    onClick={() => navegarMes(1)}
                  >
                    ›
                  </button>
                </div>
                {carregandoCalendario ? (
                  <p className="entrega__ajuda" role="status">Carregando datas disponíveis...</p>
                ) : erroCalendario ? (
                  <div className="entrega__mensagem entrega__mensagem--erro" role="alert">
                    <p>{erroCalendario}</p>
                    <button
                      className="botao"
                      type="button"
                      onClick={() => setTentativaCalendario((tentativa) => tentativa + 1)}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : calendarioCarregado && calendario ? (
                  <div className="entrega__dias" role="group" aria-label="Dias da semana">
                    {diasDaSemana.map((dia) => (
                      <span className="entrega__dia-semana" key={dia}>{dia}</span>
                    ))}
                    {Array.from({ length: primeiroDia }, (_, indice) => (
                      <span aria-hidden="true" className="entrega__dia-vazio" key={`vazio-${indice}`} />
                    ))}
                    {Array.from({ length: diasNoMes }, (_, indice) => {
                      const dia = indice + 1;
                      const data = `${mesExibido}-${String(dia).padStart(2, '0')}`;
                      const disponivel = calendario.dias.some(
                        (item) => item.data === data && item.disponivel,
                      );
                      const selecionada = dadosEntrega.dataEntregaPrevista === data;
                      return (
                        <button
                          aria-label={new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                          aria-pressed={selecionada}
                          className={`entrega__dia${selecionada ? ' entrega__dia--selecionado' : ''}`}
                          disabled={!disponivel}
                          key={data}
                          type="button"
                          onClick={() => selecionarData(data)}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="entrega__ajuda">Calcule o frete e escolha uma modalidade para ver as datas.</p>
          )}
        </section>

        {!catalogoCompleto && (
          <p className="entrega__mensagem entrega__mensagem--erro" role="alert">
            Não foi possível validar os itens do pedido. Volte ao resumo e confira se os modelos, o tecido e os adereços continuam disponíveis.
          </p>
        )}
        {erro && <p className="entrega__mensagem entrega__mensagem--erro" role="alert">{erro}</p>}

        <div className="resumo-pedido__totais">
          <TotaisPedido
            linhas={[
              {
                rotulo: 'Subtotal das peças',
                valor: subtotalCentavos !== null ? subtotalCentavos / 100 : 'A definir',
              },
              {
                rotulo: modalidadeSelecionada
                  ? `Frete (${nomeModalidade(modalidadeSelecionada.modalidade)})`
                  : 'Frete',
                valor: modalidadeSelecionada ? modalidadeSelecionada.preco : 'A definir',
              },
            ]}
            total={totalCentavos !== null ? totalCentavos / 100 : 'A definir'}
          />
        </div>
      </form>

      <div className="step-footer entrega__acoes">
        <Link className="step-footer__voltar" to="/pedido/novo/resumo">
          <span className="seta seta--esquerda" aria-hidden="true" />
          Voltar
        </Link>
        <button
          className="botao"
          disabled={!formularioValido || enviando || pedidoConfirmado !== null}
          form="entrega-formulario"
          type="submit"
        >
          {enviando ? 'Enviando pedido...' : 'Confirmar Pedido'}
          <span className="seta" aria-hidden="true" />
        </button>
      </div>

      {pedidoConfirmado && (
        <div className="entrega__overlay">
          <section
            aria-labelledby="pedido-confirmado-titulo"
            aria-modal="true"
            className="entrega__confirmacao"
            role="dialog"
          >
            <span aria-hidden="true" className="entrega__confirmacao-icone">✓</span>
            <p className="entrega__confirmacao-sobretitulo">Pedido recebido com sucesso</p>
            <h2 id="pedido-confirmado-titulo">
              Pedido #{pedidoConfirmado.num_pedido} confirmado!
            </h2>
            <p>
              Seu pedido foi enviado para análise. Você poderá acompanhar as próximas atualizações
              na área de pedidos.
            </p>
            <button
              className="botao"
              type="button"
              onClick={() => void navigate('/meus-pedidos', { replace: true })}
            >
              Confirmar e acompanhar meus pedidos
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
