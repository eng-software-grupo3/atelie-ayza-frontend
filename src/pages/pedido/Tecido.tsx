import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { formatarMoeda, type ContextoPedido } from '../../data/pedido.ts';
import {
  carregarModelos,
  carregarTecidos,
  urlDaImagemCatalogo,
  type ModeloCatalogo,
  type TecidoCatalogo,
} from '../../services/catalogo.ts';

export function Tecido() {
  const { rascunho, setRascunho } = useOutletContext<ContextoPedido>();
  const [tecidos, setTecidos] = useState<TecidoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => {
    let ativo = true;

    void Promise.all([carregarModelos(), carregarTecidos()])
      .then(([modelos, tecidosDisponiveis]) => {
        if (!ativo) return;
        setTecidos(tecidosDisponiveis);
        setRascunho((atual) => ({
          modeloCima: encontrarModelo(modelos, atual.modeloCima, 'CIMA'),
          modeloBaixo: encontrarModelo(modelos, atual.modeloBaixo, 'BAIXO'),
          tecido:
            tecidosDisponiveis.find((tecido) => tecido.id === atual.tecido?.id) ??
            tecidosDisponiveis[0] ??
            null,
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
  }, [setRascunho]);
  /* oxlint-enable react(set-state-in-effect) */

  const subtotalAnterior =
    (rascunho.modeloCima?.valor ?? 0) + (rascunho.modeloBaixo?.valor ?? 0);
  const valorTecido = Number(rascunho.tecido?.preco_metro ?? 0);

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={rascunho.modeloCima}
        modeloBaixo={rascunho.modeloBaixo}
        tecido={rascunho.tecido}
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
                  aria-pressed={rascunho.tecido?.id === tecido.id}
                  onClick={() => setRascunho((atual) => ({ ...atual, tecido }))}
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

function encontrarModelo(
  modelos: ModeloCatalogo[],
  atual: ModeloCatalogo | null,
  parte: ModeloCatalogo['parte'],
): ModeloCatalogo | null {
  const disponiveis = modelos.filter((modelo) => modelo.parte === parte);
  return disponiveis.find((modelo) => modelo.id === atual?.id) ?? disponiveis[0] ?? null;
}
