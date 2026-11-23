import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import type {
  AderecoAplicado,
  CatalogosPedido,
  ContextoPedido,
  ConjuntoRascunho,
  ParteDaPeca,
  PontoAdereco,
} from '../../data/pedido.ts';
import {
  coresDosAderecos,
  formatarCentavos,
  subtotalPedidoCentavos,
} from '../../data/pedido.ts';
import {
  carregarAderecos,
  carregarModelos,
  carregarTecidos,
  type AderecoCatalogo,
  type ModeloCatalogo,
  type TecidoCatalogo,
} from '../../services/catalogo.ts';

type PropsCardConjunto = {
  numero: number;
  conjunto: ConjuntoRascunho;
  modeloCima: ModeloCatalogo;
  modeloBaixo: ModeloCatalogo;
  tecido: TecidoCatalogo;
  aderecos: AderecoCatalogo[];
  precoCentavos: number;
  onAlterar: () => void;
};

function corDoAdereco(id: string, aderecos: AderecoCatalogo[]): string {
  const indice = aderecos.findIndex((adereco) => adereco.id === id);
  return indice < 0 ? coresDosAderecos[0] : coresDosAderecos[indice % coresDosAderecos.length];
}

function agruparAderecos(
  aplicados: AderecoAplicado[],
  catalogo: AderecoCatalogo[],
): { nome: string; quantidade: number; cor: string }[] {
  const grupos = new Map<string, { nome: string; quantidade: number; cor: string }>();
  for (const aplicado of aplicados) {
    const adereco = catalogo.find((item) => item.id === aplicado.id_adereco);
    if (!adereco) continue;
    const grupo = grupos.get(adereco.nome);
    if (grupo) grupo.quantidade += 1;
    else {
      grupos.set(adereco.nome, {
        nome: adereco.nome,
        quantidade: 1,
        cor: corDoAdereco(adereco.id, catalogo),
      });
    }
  }
  return [...grupos.values()];
}

export function CardConjuntoResumo({
  numero,
  conjunto,
  modeloCima,
  modeloBaixo,
  tecido,
  aderecos,
  precoCentavos,
  onAlterar,
}: PropsCardConjunto) {
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const dialogFotoRef = useRef<HTMLDialogElement>(null);
  const gruposAderecos = agruparAderecos(
    [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos],
    aderecos,
  );
  const totalAderecos = gruposAderecos.reduce((total, grupo) => total + grupo.quantidade, 0);
  const pontosPreview: PontoAdereco[] = (
    [
      { parte: 'CIMA', aplicados: conjunto.cima.aderecos },
      { parte: 'BAIXO', aplicados: conjunto.baixo.aderecos },
    ] satisfies { parte: ParteDaPeca; aplicados: AderecoAplicado[] }[]
  ).flatMap(({ parte, aplicados }) =>
    aplicados.flatMap((aplicado, indice) => {
      const adereco = aderecos.find((item) => item.id === aplicado.id_adereco);
      if (!adereco) return [];
      return [{
        id: `${parte}:${indice}`,
        adereco,
        cor: corDoAdereco(adereco.id, aderecos),
        peca: parte,
        x: aplicado.coordenada_x,
        y: aplicado.coordenada_y,
      }];
    }),
  );

  useEffect(() => {
    const dialog = dialogFotoRef.current;
    if (!dialog) return;
    if (fotoAmpliada && !dialog.open) dialog.showModal();
    else if (!fotoAmpliada && dialog.open) dialog.close();
  }, [fotoAmpliada]);

  return (
    <article className="resumo-conjunto">
      <header className="resumo-conjunto__cabecalho">
        <h2>Conjunto #{numero}</h2>
        <strong>{formatarCentavos(precoCentavos)}</strong>
        <button className="botao botao--secundario botao--pequeno" type="button" onClick={onAlterar}>
          Alterar
        </button>
      </header>

      <div className="resumo-conjunto__previews">
        <PedidoPreview
          modeloCima={modeloCima}
          modeloBaixo={modeloBaixo}
          tecido={tecido}
          pontos={pontosPreview}
          compacto
        />
      </div>

      <section
        className="resumo-conjunto__especificacoes"
        aria-label={`Especificações do conjunto ${numero}`}
      >
        <dl className="resumo-conjunto__detalhes">
          <div className="resumo-conjunto__pecas">
            <div className="resumo-conjunto__peca-info">
              <dt>TOP</dt>
              <dd>
                <span className="resumo-conjunto__peca-nome">{modeloCima.nome}</span>
                <span className="resumo-conjunto__peca-tamanho">
                  Tamanho: {conjunto.cima.tamanho}
                </span>
              </dd>
            </div>
            <div className="resumo-conjunto__peca-info">
              <dt>CALCINHA</dt>
              <dd>
                <span className="resumo-conjunto__peca-nome">{modeloBaixo.nome}</span>
                <span className="resumo-conjunto__peca-tamanho">
                  Tamanho: {conjunto.baixo.tamanho}
                </span>
              </dd>
            </div>
          </div>
          <div className="resumo-conjunto__malha">
            <dt>Malha</dt>
            <dd>{tecido.nome}</dd>
          </div>
        </dl>

        <div className="resumo-conjunto__referencia">
          {conjunto.local.fotoPrevia ? (
            <button
              className="resumo-conjunto__abrir-foto"
              type="button"
              onClick={() => setFotoAmpliada(true)}
              aria-haspopup="dialog"
              aria-label="Ampliar foto de referência das medidas"
            >
              <img className="resumo-conjunto__foto" src={conjunto.local.fotoPrevia} alt="" />
              <span>Foto de Referência de medidas</span>
            </button>
          ) : (
            <span className="resumo-conjunto__sem-foto">Nenhuma foto enviada</span>
          )}
        </div>

        <div className="resumo-conjunto__observacoes">
          <span>Observações</span>
          <p>{conjunto.observacao.trim() || 'Nenhuma observação.'}</p>
        </div>

        <div className="resumo-conjunto__aderecos">
          <p className="resumo-conjunto__aderecos-cabecalho">
            <span>
              Adereços: {totalAderecos} {totalAderecos === 1 ? 'aplicado' : 'aplicados'}
            </span>
            {gruposAderecos.length === 0 && (
              <span className="resumo-conjunto__aderecos-vazio">Nenhum</span>
            )}
          </p>
          {gruposAderecos.length > 0 && (
            <ul>
              {gruposAderecos.map((grupo, indice) => (
                <li key={`${grupo.nome}-${indice}`}>
                  <span className="resumo-conjunto__adereco-nome">
                    <span
                      className="resumo-conjunto__adereco-cor"
                      style={{ '--cor-adereco': grupo.cor } as CSSProperties}
                      aria-hidden="true"
                    />
                    {grupo.nome}
                    <span className="resumo-conjunto__adereco-quantidade">
                      ({grupo.quantidade}x)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {conjunto.local.fotoPrevia && (
        <dialog
          className="resumo-foto-dialog"
          ref={dialogFotoRef}
          aria-label="Foto de referência das medidas"
          onClose={() => setFotoAmpliada(false)}
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) setFotoAmpliada(false);
          }}
        >
          <button
            className="resumo-foto-dialog__fechar"
            type="button"
            onClick={() => setFotoAmpliada(false)}
            aria-label="Fechar foto ampliada"
          >
            ×
          </button>
          <img src={conjunto.local.fotoPrevia} alt="Foto de referência das medidas ampliada" />
        </dialog>
      )}
    </article>
  );
}

function etapaDoItemIndisponivel(
  conjuntos: ConjuntoRascunho[],
  catalogos: CatalogosPedido,
): { indice: number; etapa: 'modelo' | 'tecido' | 'aderecos'; mensagem: string } | null {
  for (const [indice, conjunto] of conjuntos.entries()) {
    const modeloCima = catalogos.modelos?.find((modelo) =>
      modelo.id === conjunto.cima.id_modelo && modelo.parte === 'CIMA');
    const modeloBaixo = catalogos.modelos?.find((modelo) =>
      modelo.id === conjunto.baixo.id_modelo && modelo.parte === 'BAIXO');
    if (!modeloCima || !modeloBaixo) {
      return {
        indice,
        etapa: 'modelo',
        mensagem: `Um modelo do conjunto #${indice + 1} não está mais disponível. Escolha outro modelo.`,
      };
    }

    if (!catalogos.tecidos?.some((tecido) => tecido.id === conjunto.id_tecido)) {
      return {
        indice,
        etapa: 'tecido',
        mensagem: `O tecido do conjunto #${indice + 1} não está mais disponível. Escolha outro tecido.`,
      };
    }

    const idsAderecos = [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos]
      .map((aplicado) => aplicado.id_adereco);
    if (idsAderecos.some((id) => !catalogos.aderecos?.some((adereco) => adereco.id === id))) {
      return {
        indice,
        etapa: 'aderecos',
        mensagem: `Um adereço do conjunto #${indice + 1} não está mais disponível. Revise os adereços aplicados.`,
      };
    }
  }
  return null;
}

export function Resumo() {
  const {
    conjuntos,
    setIndiceConjuntoAtivo,
    setCatalogos,
    avisar,
    adicionarConjunto,
  } = useOutletContext<ContextoPedido>();
  const navigate = useNavigate();
  const [catalogoResumo, setCatalogoResumo] = useState<CatalogosPedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [validado, setValidado] = useState(false);

  /* oxlint-disable react(set-state-in-effect) -- carregamento e validação do catálogo */
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    setValidado(false);

    void Promise.all([carregarModelos(), carregarTecidos(), carregarAderecos()])
      .then(([modelos, tecidos, aderecos]) => {
        if (!ativo) return;
        const novosCatalogos = { modelos, tecidos, aderecos };
        setCatalogoResumo(novosCatalogos);
        setCatalogos(novosCatalogos);
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar o catálogo do pedido.');
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [setCatalogos, tentativa]);

  useEffect(() => {
    if (carregando || erro || !catalogoResumo) return;
    if (
      conjuntos.length === 0 ||
      conjuntos.every((conjunto) =>
        !conjunto.cima.id_modelo &&
        !conjunto.baixo.id_modelo &&
        !conjunto.id_tecido &&
        conjunto.cima.aderecos.length === 0 &&
        conjunto.baixo.aderecos.length === 0,
      )
    ) {
      avisar('Comece escolhendo os modelos para montar seu pedido.');
      void navigate('/pedido/novo/modelo', { replace: true });
      return;
    }

    const incompleto = conjuntos.findIndex((conjunto) =>
      !conjunto.cima.id_modelo || !conjunto.baixo.id_modelo);
    if (incompleto >= 0) {
      setIndiceConjuntoAtivo(incompleto);
      avisar(`Complete os modelos do conjunto #${incompleto + 1} para ver o resumo.`);
      void navigate('/pedido/novo/modelo', { replace: true });
      return;
    }
    const semTecido = conjuntos.findIndex((conjunto) => !conjunto.id_tecido);
    if (semTecido >= 0) {
      setIndiceConjuntoAtivo(semTecido);
      avisar(`Escolha o tecido do conjunto #${semTecido + 1} para ver o resumo.`);
      void navigate('/pedido/novo/tecido', { replace: true });
      return;
    }

    const indisponivel = etapaDoItemIndisponivel(conjuntos, catalogoResumo);
    if (indisponivel) {
      setIndiceConjuntoAtivo(indisponivel.indice);
      avisar(indisponivel.mensagem);
      void navigate(`/pedido/novo/${indisponivel.etapa}`, { replace: true });
      return;
    }
    setValidado(true);
  }, [
    avisar,
    carregando,
    catalogoResumo,
    conjuntos,
    erro,
    navigate,
    setIndiceConjuntoAtivo,
  ]);
  /* oxlint-enable react(set-state-in-effect) */

  if (carregando) {
    return <p className="resumo-status" role="status">Carregando catálogo do pedido...</p>;
  }
  if (erro) {
    return (
      <section className="resumo-erro" role="alert">
        <p>Não foi possível carregar os dados do resumo: {erro}</p>
        <button className="botao" type="button" onClick={() => setTentativa((valor) => valor + 1)}>
          Tentar novamente
        </button>
      </section>
    );
  }
  if (!catalogoResumo || !validado) {
    return <p className="resumo-status" role="status">Conferindo os itens do pedido...</p>;
  }

  const modelos = catalogoResumo.modelos ?? [];
  const tecidos = catalogoResumo.tecidos ?? [];
  const aderecos = catalogoResumo.aderecos ?? [];
  const precos = conjuntos.map((conjunto) =>
    subtotalPedidoCentavos([conjunto], catalogoResumo),
  );
  const subtotal = subtotalPedidoCentavos(conjuntos, catalogoResumo);

  return (
    <div className="resumo-pedido">
      <h1>Resumo do Pedido</h1>
      {conjuntos.map((conjunto, indice) => {
        const modeloCima = modelos.find((modelo) =>
          modelo.id === conjunto.cima.id_modelo && modelo.parte === 'CIMA')!;
        const modeloBaixo = modelos.find((modelo) =>
          modelo.id === conjunto.baixo.id_modelo && modelo.parte === 'BAIXO')!;
        const tecido = tecidos.find((item) => item.id === conjunto.id_tecido)!;
        return (
          <CardConjuntoResumo
            key={`conjunto-${indice}`}
            numero={indice + 1}
            conjunto={conjunto}
            modeloCima={modeloCima}
            modeloBaixo={modeloBaixo}
            tecido={tecido}
            aderecos={aderecos}
            precoCentavos={precos[indice] ?? 0}
            onAlterar={() => {
              setIndiceConjuntoAtivo(indice);
              void navigate('/pedido/novo/modelo');
            }}
          />
        );
      })}

      <button
        className="resumo-pedido__novo"
        type="button"
        disabled={conjuntos.length >= 6}
        onClick={() => {
          if (adicionarConjunto()) void navigate('/pedido/novo/modelo');
        }}
      >
        <span>+ Fazer outro conjunto para o pedido</span>
        <span className="resumo-pedido__novo-dica">Volta à etapa 1</span>
      </button>
      {conjuntos.length >= 6 && (
        <p className="resumo-pedido__limite" role="status">
          Este pedido já chegou ao limite de 6 conjuntos.
        </p>
      )}

      <div className="resumo-pedido__totais">
        <TotaisPedido
          linhas={[{ rotulo: 'Subtotal das peças:', valor: subtotal / 100 }]}
          total={subtotal / 100}
        />
      </div>
    </div>
  );
}
