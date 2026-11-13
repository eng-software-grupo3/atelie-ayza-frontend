import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { formatarMoeda, type ContextoPedido } from '../../data/pedido.ts';
import { carregarModelos, type ModeloCatalogo } from '../../services/catalogo.ts';

type ModelosPorParte = {
  cima: ModeloCatalogo[];
  baixo: ModeloCatalogo[];
};

export function Modelo() {
  const { rascunho, setRascunho } = useOutletContext<ContextoPedido>();
  const [modelos, setModelos] = useState<ModelosPorParte>({ cima: [], baixo: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => {
    let ativo = true;

    void carregarModelos()
      .then((resposta) => {
        if (!ativo) return;
        const disponiveis = {
          cima: resposta.filter((modelo) => modelo.parte === 'CIMA'),
          baixo: resposta.filter((modelo) => modelo.parte === 'BAIXO'),
        };
        setModelos(disponiveis);
        setRascunho((atual) => ({
          ...atual,
          modeloCima:
            disponiveis.cima.find((modelo) => modelo.id === atual.modeloCima?.id) ??
            disponiveis.cima[0] ??
            null,
          modeloBaixo:
            disponiveis.baixo.find((modelo) => modelo.id === atual.modeloBaixo?.id) ??
            disponiveis.baixo[0] ??
            null,
        }));
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os modelos.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [setRascunho]);
  /* oxlint-enable react(set-state-in-effect) */

  const totalModelos = (rascunho.modeloCima?.valor ?? 0) + (rascunho.modeloBaixo?.valor ?? 0);

  function selecionarModelo(modelo: ModeloCatalogo) {
    setRascunho((atual) => ({
      ...atual,
      [modelo.parte === 'CIMA' ? 'modeloCima' : 'modeloBaixo']: modelo,
    }));
  }

  function renderizarOpcoes(titulo: string, parte: 'CIMA' | 'BAIXO', opcoes: ModeloCatalogo[]) {
    const selecionado = parte === 'CIMA' ? rascunho.modeloCima : rascunho.modeloBaixo;

    return (
      <section className="personalizacao__grupo" aria-label={titulo}>
        <h2 className="personalizacao__grupo-titulo">{titulo}</h2>
        {opcoes.length === 0 ? (
          <p className="personalizacao__vazio">Nenhum modelo disponível nesta categoria.</p>
        ) : (
          <div className="personalizacao__opcoes personalizacao__opcoes--modelos">
            {opcoes.map((modelo) => (
              <button
                className="personalizacao__opcao"
                type="button"
                key={modelo.id}
                aria-pressed={selecionado?.id === modelo.id}
                onClick={() => selecionarModelo(modelo)}
              >
                <span>{modelo.nome}</span>
                <strong>{formatarMoeda(Number(modelo.valor))}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={rascunho.modeloCima}
        modeloBaixo={rascunho.modeloBaixo}
        carregando={carregando}
      />
      {erro && <p className="personalizacao__erro" role="alert">{erro}</p>}
      <div className="personalizacao__conteudo">
        <h1 className="apenas-leitor">Escolha o modelo</h1>
        {renderizarOpcoes('Modelo do top', 'CIMA', modelos.cima)}
        {renderizarOpcoes('Modelo da calcinha', 'BAIXO', modelos.baixo)}
        <section className="personalizacao__totais" aria-label="Resumo do pedido">
          <div className="personalizacao__linha">
            <span>Subtotal anterior:</span>
            <span>{formatarMoeda(0)}</span>
          </div>
          <div className="personalizacao__linha">
            <span>Modelo (top + calcinha):</span>
            <span>{formatarMoeda(totalModelos)}</span>
          </div>
          <div className="personalizacao__linha personalizacao__linha--total">
            <strong>Total a pagar:</strong>
            <strong>{formatarMoeda(totalModelos)}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
