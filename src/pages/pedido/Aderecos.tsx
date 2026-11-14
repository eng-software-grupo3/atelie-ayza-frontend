import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import {
  coresDosAderecos,
  formatarMoeda,
  subtotalModeloTecido,
  totalAderecos,
  type ContextoPedido,
  type ParteDaPeca,
} from '../../data/pedido.ts';
import {
  carregarAderecos,
  urlDaImagemCatalogo,
  type AderecoCatalogo,
} from '../../services/catalogo.ts';

const estiloCor = (cor: string) => ({ '--cor-adereco': cor }) as CSSProperties;

export function Aderecos() {
  const { rascunho, setRascunho } = useOutletContext<ContextoPedido>();
  const [aderecos, setAderecos] = useState<AderecoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => {
    let ativo = true;

    void carregarAderecos()
      .then((lista) => {
        if (!ativo) return;
        setAderecos(lista);
        // Descarta pontos de adereços que saíram do catálogo desde a última visita.
        setRascunho((atual) => ({
          ...atual,
          pontos: atual.pontos.filter((ponto) =>
            lista.some((adereco) => adereco.id === ponto.adereco.id),
          ),
        }));
      })
      .catch((e: unknown) => {
        if (ativo)
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar os adereços.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [setRascunho]);
  /* oxlint-enable react(set-state-in-effect) */

  const coresPorId = useMemo(
    () =>
      new Map(
        aderecos.map((adereco, indice) => [
          adereco.id,
          coresDosAderecos[indice % coresDosAderecos.length],
        ]),
      ),
    [aderecos],
  );

  const corDe = (aderecoId: string) => coresPorId.get(aderecoId) ?? coresDosAderecos[0];

  const grupos = useMemo(() => {
    const porAdereco = new Map<
      string,
      { adereco: AderecoCatalogo; cor: string; quantidade: number }
    >();
    for (const ponto of rascunho.pontos) {
      const grupo = porAdereco.get(ponto.adereco.id);
      if (grupo) grupo.quantidade += 1;
      else
        porAdereco.set(ponto.adereco.id, { adereco: ponto.adereco, cor: ponto.cor, quantidade: 1 });
    }
    return [...porAdereco.values()];
  }, [rascunho.pontos]);

  // Sem modelo e tecido (acesso direto ou recarga) não há peça para marcar.
  if (!rascunho.modeloCima || !rascunho.modeloBaixo || !rascunho.tecido) {
    return <Navigate to="/pedido/novo/modelo" replace />;
  }

  function selecionar(adereco: AderecoCatalogo) {
    setAviso('');
    setPontoSelecionadoId(null);
    setAtivoId((atual) => (atual === adereco.id ? null : adereco.id));
  }

  function marcar(peca: ParteDaPeca, x: number, y: number) {
    // Com um ponto selecionado, o toque em outro lugar só tira a seleção.
    if (pontoSelecionadoId) {
      setPontoSelecionadoId(null);
      return;
    }

    const adereco = aderecos.find((item) => item.id === ativoId);
    if (!adereco) {
      setAviso('Selecione um adereço antes de tocar na peça.');
      return;
    }

    setAviso('');
    setRascunho((atual) => ({
      ...atual,
      pontos: [
        ...atual.pontos,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          adereco,
          cor: corDe(adereco.id),
          peca,
          x,
          y,
        },
      ],
    }));
  }

  function remover(pontoId: string) {
    setPontoSelecionadoId(null);
    setRascunho((atual) => ({
      ...atual,
      pontos: atual.pontos.filter((ponto) => ponto.id !== pontoId),
    }));
  }

  const subtotal = subtotalModeloTecido(rascunho);
  const valorAderecos = totalAderecos(rascunho.pontos);

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={rascunho.modeloCima}
        modeloBaixo={rascunho.modeloBaixo}
        tecido={rascunho.tecido}
        pontos={rascunho.pontos}
        onMarcar={marcar}
        pontoSelecionadoId={pontoSelecionadoId}
        onSelecionarPonto={setPontoSelecionadoId}
        onRemoverPonto={remover}
      />
      <div className="personalizacao__conteudo">
        <h1 className="apenas-leitor">Escolha os adereços</h1>

        <p className="personalizacao__instrucao">
          <strong>👉 Como aplicar: </strong>
          Selecione o adereço abaixo e <strong>toque no biquíni no topo</strong> para fixar o ponto
          colorido onde a costureira deve aplicá-lo! Para remover, toque na bolinha e depois no ×.
        </p>
        {aviso && (
          <p className="personalizacao__erro" role="status">
            {aviso}
          </p>
        )}
        {erro && (
          <p className="personalizacao__erro" role="alert">
            {erro}
          </p>
        )}

        <section aria-label="Adereços disponíveis">
          <h2 className="personalizacao__grupo-titulo">Adereços disponíveis:</h2>
          {aderecos.length === 0 ? (
            <p className="personalizacao__vazio">
              {carregando ? 'Carregando adereços…' : 'Nenhum adereço disponível no catálogo.'}
            </p>
          ) : (
            <div className="personalizacao__opcoes personalizacao__opcoes--aderecos">
              {aderecos.map((adereco) => (
                <button
                  className="adereco-card"
                  type="button"
                  key={adereco.id}
                  style={estiloCor(corDe(adereco.id))}
                  aria-pressed={ativoId === adereco.id}
                  data-com-pontos={rascunho.pontos.some((ponto) => ponto.adereco.id === adereco.id)}
                  onClick={() => selecionar(adereco)}
                >
                  <span className="adereco-card__foto">
                    {adereco.foto && <img src={urlDaImagemCatalogo(adereco.foto)} alt="" />}
                  </span>
                  <span className="adereco-card__info">
                    <span className="adereco-card__nome">{adereco.nome}</span>
                    <span className="adereco-card__preco">
                      <span className="adereco-card__cor" aria-hidden="true" />
                      <strong>{formatarMoeda(Number(adereco.preco))}</strong>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="personalizacao__grupo personalizacao__grupo--pontos">
          <h2 className="personalizacao__grupo-titulo">
            Pontos marcados na peça: {rascunho.pontos.length}
          </h2>
          {rascunho.pontos.length === 0 ? (
            <p className="personalizacao__vazio">Nenhum ponto marcado ainda.</p>
          ) : (
            <ul className="pontos-lista">
              {grupos.map(({ adereco, cor, quantidade }) => (
                <li className="pontos-lista__item" key={adereco.id} style={estiloCor(cor)}>
                  <span className="pontos-lista__nome">
                    <span className="pontos-lista__cor" aria-hidden="true" />
                    {adereco.nome}
                    <span className="pontos-lista__quantidade">{quantidade}x</span>
                  </span>
                  <strong>{formatarMoeda(Number(adereco.preco) * quantidade)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <TotaisPedido
          linhas={[
            { rotulo: 'Subtotal anterior:', valor: subtotal },
            { rotulo: 'Adereços:', valor: valorAderecos },
          ]}
          total={subtotal + valorAderecos}
        />
      </div>
    </div>
  );
}
