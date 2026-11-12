import { useEffect, useMemo, useState } from 'react';
import cadeadoAberto from '../../assets/cadeado-aberto.svg';
import cadeadoFechado from '../../assets/cadeado-fechado.svg';
import { apiJson } from '../../services/api.ts';

type EstadoDia = 'disponivel' | 'com_entrega' | 'bloqueada';

type DiaAgenda = {
  data: string;
  estado: EstadoDia;
  qtd_pedidos: number;
};

type MesAgenda = {
  mes: string;
  dias: DiaAgenda[];
};

type PedidoAgenda = {
  id: string;
  num_pedido: number;
  cliente: { id: string; nome: string };
  status: string;
  entrega: {
    modalidade_frete: string;
    endereco: {
      rua: string;
      numero: string;
      complemento: string | null;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    };
  };
};

type RespostaBloqueio = { data: string; bloqueada: boolean };

const diasDaSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function preencher(valor: number): string {
  return String(valor).padStart(2, '0');
}

function formatarMes(data: Date): string {
  return `${data.getFullYear()}-${preencher(data.getMonth() + 1)}`;
}

function criarData(mes: string, dia: number): string {
  return `${mes}-${preencher(dia)}`;
}

function dataLocal(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function rotuloData(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dataLocal(data));
}

function rotuloMes(mes: string): string {
  const rotulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(dataLocal(`${mes}-01`));
  return rotulo.charAt(0).toLocaleUpperCase('pt-BR') + rotulo.slice(1);
}

function enderecoDoPedido(pedido: PedidoAgenda): string {
  const { rua, numero, complemento, bairro, cidade, estado, cep } = pedido.entrega.endereco;
  const logradouro = `${rua}, ${numero}${complemento ? ` - ${complemento}` : ''}`;
  return `${logradouro} · ${bairro} · ${cidade}/${estado} · CEP ${cep}`;
}

export function Agenda() {
  const hoje = new Date();
  const hojeIso = criarData(formatarMes(hoje), hoje.getDate());
  const [mes, setMes] = useState(() => formatarMes(hoje));
  const [dataSelecionada, setDataSelecionada] = useState(hojeIso);
  const [dias, setDias] = useState<DiaAgenda[]>([]);
  const [pedidos, setPedidos] = useState<PedidoAgenda[]>([]);
  const [carregandoMes, setCarregandoMes] = useState(true);
  const [carregandoPedidos, setCarregandoPedidos] = useState(true);
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;
    setCarregandoMes(true);
    setErro('');

    void apiJson<MesAgenda>(`/api/gestao/agenda?mes=${mes}`)
      .then((resposta) => {
        if (ativo) setDias(resposta.dias);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar a agenda.');
      })
      .finally(() => {
        if (ativo) setCarregandoMes(false);
      });

    return () => {
      ativo = false;
    };
  }, [mes]);

  useEffect(() => {
    let ativo = true;
    setCarregandoPedidos(true);
    setPedidos([]);

    void apiJson<PedidoAgenda[]>(`/api/gestao/agenda/${dataSelecionada}/pedidos`)
      .then((resposta) => {
        if (ativo) setPedidos(resposta);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os pedidos do dia.');
      })
      .finally(() => {
        if (ativo) setCarregandoPedidos(false);
      });

    return () => {
      ativo = false;
    };
  }, [dataSelecionada]);

  const diasNoCalendario = useMemo(() => {
    const [ano, numeroMes] = mes.split('-').map(Number);
    const primeiroDia = new Date(ano, numeroMes - 1, 1);
    const diasNoMes = new Date(ano, numeroMes, 0).getDate();
    const deslocamento = (primeiroDia.getDay() + 6) % 7;
    const totalCelulas = Math.ceil((deslocamento + diasNoMes) / 7) * 7;

    return Array.from({ length: totalCelulas }, (_, indice) => {
      const data = new Date(ano, numeroMes - 1, indice - deslocamento + 1);
      const iso = criarData(formatarMes(data), data.getDate());
      const diaDaAgenda = dias.find((dia) => dia.data === iso);
      return {
        iso,
        numero: data.getDate(),
        pertenceAoMes: data.getMonth() === numeroMes - 1,
        diaDaAgenda,
      };
    });
  }, [dias, mes]);

  const diaSelecionado = dias.find((dia) => dia.data === dataSelecionada);

  function navegarMes(deslocamento: number) {
    const [ano, numeroMes] = mes.split('-').map(Number);
    const novaData = new Date(ano, numeroMes - 1 + deslocamento, 1);
    const novoMes = formatarMes(novaData);
    setMes(novoMes);
    setDataSelecionada(criarData(novoMes, 1));
    setSucesso('');
  }

  async function alterarBloqueio(bloqueada: boolean) {
    setSalvandoBloqueio(true);
    setErro('');
    setSucesso('');
    try {
      const resposta = await apiJson<RespostaBloqueio>(
        `/api/gestao/agenda/${dataSelecionada}/bloqueada`,
        { method: 'PATCH', body: JSON.stringify({ bloqueada }) },
      );
      setDias((atuais) => atuais.map((dia) => (
        dia.data === resposta.data
          ? {
              ...dia,
              estado: resposta.bloqueada ? 'bloqueada' : dia.qtd_pedidos > 0 ? 'com_entrega' : 'disponivel',
            }
          : dia
      )));
      setSucesso(bloqueada ? 'Dia bloqueado com sucesso.' : 'Dia desbloqueado com sucesso.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar o bloqueio do dia.');
    } finally {
      setSalvandoBloqueio(false);
    }
  }

  return (
    <main className="app-main agenda-pagina">
      <header className="agenda-cabecalho">
        <h1>Agenda de Envios &amp; Bloqueios</h1>
        <p>Selecione uma data para inspecionar ou bloquear envios</p>
      </header>

      {erro && <div className="alerta alerta--erro" role="alert">{erro}</div>}
      {sucesso && <div className="alerta alerta--sucesso" role="status">{sucesso}</div>}

      <section className="agenda-calendario cartao" aria-label="Calendário de envios">
        <div className="agenda-calendario__topo">
          <h2>{rotuloMes(mes)}</h2>
          <div className="agenda-calendario__navegacao">
            <button
              type="button"
              className="agenda-calendario__navegar"
              aria-label="Mês anterior"
              onClick={() => navegarMes(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="agenda-calendario__navegar"
              aria-label="Próximo mês"
              onClick={() => navegarMes(1)}
            >
              ›
            </button>
          </div>
        </div>

        <div
          className="agenda-grade"
          role="group"
          aria-label="Dias da semana e do mês"
          aria-busy={carregandoMes}
        >
          {diasDaSemana.map((dia) => (
            <div className="agenda-grade__semana" key={dia}>{dia}</div>
          ))}
          {diasNoCalendario.map(({ iso, numero, pertenceAoMes, diaDaAgenda }) => {
            if (!pertenceAoMes) {
              return <span className="agenda-grade__fora" aria-hidden="true" key={iso}>{numero}</span>;
            }

            const estado = diaDaAgenda?.estado ?? 'disponivel';
            const selecionado = iso === dataSelecionada;
            const hoje = iso === hojeIso;
            return (
              <button
                type="button"
                key={iso}
                className={[
                  'agenda-dia',
                  `agenda-dia--${estado}`,
                  selecionado ? 'agenda-dia--selecionado' : '',
                  hoje ? 'agenda-dia--hoje' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`${rotuloData(iso)}: ${
                  estado === 'bloqueada'
                    ? 'bloqueado'
                    : diaDaAgenda?.qtd_pedidos
                      ? `${diaDaAgenda.qtd_pedidos} pedido(s)`
                      : 'disponível'
                }`}
                aria-pressed={selecionado}
                onClick={() => {
                  setDataSelecionada(iso);
                  setErro('');
                  setSucesso('');
                }}
              >
                <span>{numero}</span>
                {diaDaAgenda?.qtd_pedidos ? (
                  <span className="agenda-dia__pedidos" aria-hidden="true">
                    {Array.from({ length: Math.min(diaDaAgenda.qtd_pedidos, 3) }, (_, indice) => (
                      <i key={indice} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="agenda-legenda" aria-label="Legenda do calendário">
          <span><i className="agenda-legenda__marcador agenda-legenda__marcador--disponivel" /> Disponível</span>
          <span><i className="agenda-legenda__marcador agenda-legenda__marcador--entrega" /> Com entrega</span>
          <span><i className="agenda-legenda__marcador agenda-legenda__marcador--bloqueado" /> Bloqueado</span>
        </div>
        {carregandoMes && <p className="agenda-mensagem" role="status">Carregando calendário...</p>}
      </section>

      <section className="agenda-detalhes cartao" aria-labelledby="agenda-dia-titulo">
        <div className="agenda-detalhes__topo">
          <div>
            <h2 id="agenda-dia-titulo">{rotuloData(dataSelecionada)}</h2>
            <p className="texto-suave">
              {diaSelecionado?.qtd_pedidos ?? 0}{' '}
              {(diaSelecionado?.qtd_pedidos ?? 0) === 1 ? 'pedido previsto' : 'pedidos previstos'}
              {diaSelecionado?.estado === 'bloqueada' ? ' · dia bloqueado' : ''}
            </p>
          </div>
          {diaSelecionado?.estado === 'bloqueada' ? (
            <button
              type="button"
              className="botao botao--sucesso"
              disabled={salvandoBloqueio || carregandoMes || !diaSelecionado}
              onClick={() => void alterarBloqueio(false)}
            >
              <img src={cadeadoAberto} alt="" aria-hidden="true" />
              {salvandoBloqueio ? 'Salvando...' : 'Desbloquear este dia'}
            </button>
          ) : (
            <button
              type="button"
              className="botao botao--perigo"
              disabled={salvandoBloqueio || carregandoMes || !diaSelecionado}
              onClick={() => void alterarBloqueio(true)}
            >
              <img src={cadeadoFechado} alt="" aria-hidden="true" />
              {salvandoBloqueio ? 'Salvando...' : 'Bloquear este dia'}
            </button>
          )}
        </div>

        <h3 className="agenda-pedidos__titulo">Pedidos com entrega nesta data</h3>
        {carregandoPedidos ? (
          <p className="agenda-mensagem" role="status">Carregando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="agenda-vazio">Nenhum pedido previsto para este dia.</p>
        ) : (
          <ul className="agenda-pedidos">
            {pedidos.map((pedido) => (
              <li className="agenda-pedido" key={pedido.id}>
                <div className="agenda-pedido__topo">
                  <strong>Pedido #{pedido.num_pedido}</strong>
                  <span className="agenda-pedido__status">{pedido.status.replaceAll('_', ' ')}</span>
                </div>
                <p>{pedido.cliente.nome}</p>
                <p className="agenda-pedido__endereco">{enderecoDoPedido(pedido)}</p>
                <p className="agenda-pedido__frete">
                  Frete {pedido.entrega.modalidade_frete === 'sedex' ? 'Sedex' : 'padrão'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
