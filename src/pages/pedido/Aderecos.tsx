import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import {
  coresDosAderecos,
  formatarMoeda,
  type ContextoPedido,
  type ParteDaPeca,
  type PontoAdereco,
} from '../../data/pedido.ts';
import {
  carregarAderecos,
  urlDaImagemCatalogo,
  type AderecoCatalogo,
} from '../../services/catalogo.ts';

const estiloCor = (cor: string) => ({ '--cor-adereco': cor }) as CSSProperties;

export function Aderecos() {
  const { rascunho, setRascunho, catalogos, setCatalogos } =
    useOutletContext<ContextoPedido>();
  const [aderecos, setAderecos] = useState<AderecoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => {
    let ativo = true;

    const carregar = catalogos.aderecos
      ? Promise.resolve(catalogos.aderecos)
      : carregarAderecos();

    void carregar
      .then((lista) => {
        if (!ativo) return;
        setAderecos(lista);
        setCatalogos((atuais) => ({ ...atuais, aderecos: lista }));
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
  }, [catalogos.aderecos, setCatalogos]);
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

  const pontos = useMemo(() => {
    const pontosDaPeca = (peca: ParteDaPeca): PontoAdereco[] => {
      const campo = peca === 'CIMA' ? 'cima' : 'baixo';
      return rascunho[campo].aderecos.flatMap((aplicado, indice) => {
        const adereco = aderecos.find((item) => item.id === aplicado.id_adereco);
        if (!adereco) return [];
        return [{
          id: `${peca}:${indice}`,
          adereco,
          cor: corDe(adereco.id),
          peca,
          x: aplicado.coordenada_x,
          y: aplicado.coordenada_y,
        }];
      });
    };
    return [...pontosDaPeca('CIMA'), ...pontosDaPeca('BAIXO')];
  }, [aderecos, coresPorId, rascunho]);

  const ausentes = useMemo(
    () => (['cima', 'baixo'] as const).flatMap((campo) =>
      rascunho[campo].aderecos.flatMap((aplicado, indice) =>
        aderecos.some((item) => item.id === aplicado.id_adereco)
          ? []
          : [{ id: `${campo === 'cima' ? 'CIMA' : 'BAIXO'}:${indice}`, nome: aplicado.id_adereco }],
      ),
    ),
    [aderecos, rascunho],
  );

  const grupos = useMemo(() => {
    const porAdereco = new Map<
      string,
      { adereco: AderecoCatalogo; cor: string; quantidade: number }
    >();
    for (const ponto of pontos) {
      const grupo = porAdereco.get(ponto.adereco.id);
      if (grupo) grupo.quantidade += 1;
      else
        porAdereco.set(ponto.adereco.id, { adereco: ponto.adereco, cor: ponto.cor, quantidade: 1 });
    }
    return [...porAdereco.values()];
  }, [pontos]);

  // Sem modelo e tecido (acesso direto ou recarga) não há peça para marcar.
  if (!rascunho.cima.id_modelo || !rascunho.baixo.id_modelo) {
    return <Navigate to="/pedido/novo/modelo" replace />;
  }
  if (!rascunho.id_tecido) return <Navigate to="/pedido/novo/tecido" replace />;

  const modeloCima = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.cima.id_modelo && modelo.parte === 'CIMA') ?? null;
  const modeloBaixo = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.baixo.id_modelo && modelo.parte === 'BAIXO') ?? null;
  const tecido = catalogos.tecidos?.find((item) => item.id === rascunho.id_tecido) ?? null;

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

    // O backend e o banco armazenam coordenadas com até 4 casas decimais.
    // Guardamos a mesma precisão no rascunho para manter prévia e pedido alinhados.
    const coordenadaX = Math.round(x * 10000) / 10000;
    const coordenadaY = Math.round(y * 10000) / 10000;

    setAviso('');
    setRascunho((atual) => ({
      ...atual,
      [peca === 'CIMA' ? 'cima' : 'baixo']: {
        ...atual[peca === 'CIMA' ? 'cima' : 'baixo'],
        aderecos: [
          ...atual[peca === 'CIMA' ? 'cima' : 'baixo'].aderecos,
          { id_adereco: adereco.id, coordenada_x: coordenadaX, coordenada_y: coordenadaY },
        ],
      },
    }));
  }

  function remover(pontoId: string) {
    setPontoSelecionadoId(null);
    const [parte, indice] = pontoId.split(':');
    const campo = parte === 'CIMA' ? 'cima' : 'baixo';
    const indicePonto = Number(indice);
    if (!Number.isInteger(indicePonto)) return;
    setRascunho((atual) => ({
      ...atual,
      [campo]: {
        ...atual[campo],
        aderecos: atual[campo].aderecos.filter((_, atualIndice) => atualIndice !== indicePonto),
      },
    }));
  }

  const subtotal =
    Number(modeloCima?.valor ?? 0) +
    Number(modeloBaixo?.valor ?? 0) +
    Number(tecido?.preco_metro ?? 0);
  const valorAderecos = grupos.reduce(
    (total, grupo) => total + Number(grupo.adereco.preco) * grupo.quantidade,
    0,
  );

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={modeloCima}
        modeloBaixo={modeloBaixo}
        tecido={tecido}
        pontos={pontos}
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
                  data-com-pontos={pontos.some((ponto) => ponto.adereco.id === adereco.id)}
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
            Pontos marcados na peça: {pontos.length + ausentes.length}
          </h2>
          {pontos.length + ausentes.length === 0 ? (
            <p className="personalizacao__vazio">Nenhum ponto marcado ainda.</p>
          ) : (
            <>
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
              {ausentes.length > 0 && (
                <div className="personalizacao__erro" role="alert">
                  {ausentes.map((item) => (
                    <p key={item.id}>
                      Um adereço não está mais disponível.{' '}
                      <button type="button" onClick={() => remover(item.id)}>
                        Remover
                      </button>
                    </p>
                  ))}
                </div>
              )}
            </>
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
