import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { formatarMoeda, type ContextoPedido } from '../../data/pedido.ts';
import {
  carregarModelos,
  carregarTecidos,
  urlDaImagemCatalogo,
  type TecidoCatalogo,
} from '../../services/catalogo.ts';

export function Tecido() {
  const { rascunho, setRascunho, catalogos, setCatalogos } =
    useOutletContext<ContextoPedido>();
  const [tecidos, setTecidos] = useState<TecidoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => {
    let ativo = true;

    const modelosPromise = catalogos.modelos
      ? Promise.resolve(catalogos.modelos)
      : carregarModelos();
    const tecidosPromise = catalogos.tecidos
      ? Promise.resolve(catalogos.tecidos)
      : carregarTecidos();

    void Promise.all([modelosPromise, tecidosPromise])
      .then(([modelos, tecidosDisponiveis]) => {
        if (!ativo) return;
        setTecidos(tecidosDisponiveis);
        setCatalogos((atuais) => ({
          ...atuais,
          modelos,
          tecidos: tecidosDisponiveis,
        }));
        setRascunho((atual) => ({
          ...atual,
          id_tecido: atual.id_tecido ?? tecidosDisponiveis[0]?.id ?? null,
        }));
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar o catálogo.');
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [catalogos.modelos, catalogos.tecidos, setCatalogos, setRascunho]);
  /* oxlint-enable react(set-state-in-effect) */

  const modeloCima = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.cima.id_modelo && modelo.parte === 'CIMA') ?? null;
  const modeloBaixo = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.baixo.id_modelo && modelo.parte === 'BAIXO') ?? null;
  const tecidoSelecionado = tecidos.find((tecido) => tecido.id === rascunho.id_tecido) ?? null;
  const subtotalAnterior =
    Number(modeloCima?.valor ?? 0) + Number(modeloBaixo?.valor ?? 0);
  const valorTecido = Number(tecidoSelecionado?.preco_metro ?? 0);

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={modeloCima}
        modeloBaixo={modeloBaixo}
        tecido={tecidoSelecionado}
        carregando={carregando}
      />
      {erro && <p className="personalizacao__erro" role="alert">{erro}</p>}
      <div className="personalizacao__conteudo personalizacao__conteudo--tecidos">
        <h1 className="apenas-leitor">Escolha a malha ou tecido</h1>
        <section className="personalizacao__grupo personalizacao__grupo--tecidos">
          <h2 className="personalizacao__grupo-titulo">Escolha a malha/tecido:</h2>
          {tecidos.length === 0 ? (
            <p className="personalizacao__vazio">
              {carregando ? 'Carregando tecidos…' : 'Nenhum tecido disponível no catálogo.'}
            </p>
          ) : (
            <div className="personalizacao__opcoes personalizacao__opcoes--tecidos">
              {tecidos.map((tecido) => (
                <button
                  className="personalizacao__opcao personalizacao__opcao--tecido"
                  type="button"
                  key={tecido.id}
                  aria-pressed={rascunho.id_tecido === tecido.id}
                  onClick={() => setRascunho((atual) => ({ ...atual, id_tecido: tecido.id }))}
                >
                  {tecido.foto ? (
                    <img
                      className="personalizacao__amostra"
                      src={urlDaImagemCatalogo(tecido.foto)}
                      alt=""
                    />
                  ) : (
                    <span className="personalizacao__amostra" aria-hidden="true" />
                  )}
                  <span className="personalizacao__opcao-texto">
                    <span>{tecido.nome}</span>
                    <strong>{formatarMoeda(Number(tecido.preco_metro))}</strong>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="personalizacao__totais" aria-label="Resumo do pedido">
          <div className="personalizacao__linha">
            <span>Subtotal anterior:</span>
            <span>{formatarMoeda(subtotalAnterior)}</span>
          </div>
          <div className="personalizacao__linha">
            <span>Malha:</span>
            <span>{formatarMoeda(valorTecido)}</span>
          </div>
          <div className="personalizacao__linha personalizacao__linha--total">
            <strong>Total a pagar:</strong>
            <strong>{formatarMoeda(subtotalAnterior + valorTecido)}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
