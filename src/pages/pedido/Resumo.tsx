import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import { useContainedImageArea } from '../../hooks/useContainedImageArea.ts';
import type {
  AderecoAplicado,
  CatalogosPedido,
  ContextoPedido,
  ConjuntoRascunho,
  ParteDaPeca,
} from '../../data/pedido.ts';
import { coresDosAderecos, formatarCentavos, subtotalPedidoCentavos } from '../../data/pedido.ts';
import {
  aplicarTecidoNoModelo,
  carregarAderecos,
  carregarModelos,
  carregarTecidos,
  urlDaImagemCatalogo,
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

function srcModelo(svg: string): string {
  return /^https?:\/\//i.test(svg) || svg.startsWith('/')
    ? svg
    : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function carregarSvgModelo(svg: string): Promise<string> {
  if (!/^https?:\/\//i.test(svg) && !svg.startsWith('/')) return svg;

  const resposta = await fetch(urlDaImagemCatalogo(svg));
  if (!resposta.ok) throw new Error('Não foi possível carregar o modelo para aplicar o tecido.');
  return resposta.text();
}

function corDoAdereco(id: string, aderecos: AderecoCatalogo[]): string {
  const indice = aderecos.findIndex((adereco) => adereco.id === id);
  return indice < 0 ? coresDosAderecos[0] : coresDosAderecos[indice % coresDosAderecos.length];
}

function PreviewPeca({
  modelo,
  aplicados,
  aderecos,
  tecido,
  parte,
  rotulo,
}: {
  modelo: ModeloCatalogo;
  aplicados: AderecoAplicado[];
  aderecos: AderecoCatalogo[];
  tecido: TecidoCatalogo;
  parte: ParteDaPeca;
  rotulo: string;
}) {
  const [proporcao, setProporcao] = useState<number | null>(null);
  const { ref: caixaRef, estilo: estiloArea } = useContainedImageArea(proporcao);
  const [resultadoTecido, setResultadoTecido] = useState<{
    modeloSvg: string;
    fotoTecido: string;
    src?: string;
    erro?: string;
  } | null>(null);

  useEffect(() => {
    let ativo = true;
    const { foto } = tecido;

    if (!foto) {
      return () => {
        ativo = false;
      };
    }

    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => {
      void (async () => {
        try {
          const svgModelo = await carregarSvgModelo(modelo.svg_url);
          const src = await aplicarTecidoNoModelo(svgModelo, imagem);
          if (ativo) setResultadoTecido({ modeloSvg: modelo.svg_url, fotoTecido: foto, src });
        } catch (erro: unknown) {
          if (ativo) {
            setResultadoTecido({
              modeloSvg: modelo.svg_url,
              fotoTecido: foto,
              erro:
                erro instanceof Error
                  ? erro.message
                  : 'Não foi possível aplicar o tecido à prévia.',
            });
          }
        }
      })();
    };
    imagem.onerror = () => {
      if (ativo) {
        setResultadoTecido({
          modeloSvg: modelo.svg_url,
          fotoTecido: foto,
          erro: 'Não foi possível carregar a imagem do tecido selecionado.',
        });
      }
    };
    imagem.src = urlDaImagemCatalogo(foto);

    return () => {
      ativo = false;
      imagem.onload = null;
      imagem.onerror = null;
    };
  }, [modelo.svg_url, tecido.foto]);

  function atualizarProporcao(evento: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = evento.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setProporcao(naturalWidth / naturalHeight);
    }
  }

  const srcTecido =
    resultadoTecido?.modeloSvg === modelo.svg_url && resultadoTecido.fotoTecido === tecido.foto
      ? resultadoTecido.src
      : null;
  const erroTecido =
    resultadoTecido?.modeloSvg === modelo.svg_url && resultadoTecido.fotoTecido === tecido.foto
      ? resultadoTecido.erro
      : null;

  return (
    <figure className="resumo-peca">
      <div className="resumo-peca__imagem" ref={caixaRef}>
        <div className="resumo-peca__area" data-parte={parte} style={estiloArea}>
          <img
            src={srcTecido ?? srcModelo(modelo.svg_url)}
            alt={`${rotulo}: ${modelo.nome}`}
            onLoad={atualizarProporcao}
          />
          {aplicados.map((aplicado, indice) => {
            const adereco = aderecos.find((item) => item.id === aplicado.id_adereco);
            const posicao: CSSProperties & { '--cor-adereco': string } = {
              left: `${aplicado.coordenada_x * 100}%`,
              top: `${aplicado.coordenada_y * 100}%`,
              '--cor-adereco': corDoAdereco(aplicado.id_adereco, aderecos),
            };
            return (
              <span
                className="resumo-peca__ponto"
                style={posicao}
                key={`${aplicado.id_adereco}-${indice}`}
                title={adereco?.nome}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>
      {tecido.foto && erroTecido && (
        <p className="resumo-peca__erro-tecido" role="status">
          Prévia sem estampa: {erroTecido}
        </p>
      )}
    </figure>
  );
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
        <button
          className="botao botao--secundario botao--pequeno"
          type="button"
          onClick={onAlterar}
        >
          Alterar
        </button>
      </header>

      <div className="resumo-conjunto__previews">
        <PreviewPeca
          modelo={modeloCima}
          aplicados={conjunto.cima.aderecos}
          aderecos={aderecos}
          tecido={tecido}
          parte="CIMA"
          rotulo="TOP"
        />
        <PreviewPeca
          modelo={modeloBaixo}
          aplicados={conjunto.baixo.aderecos}
          aderecos={aderecos}
          tecido={tecido}
          parte="BAIXO"
          rotulo="CALCINHA"
        />
      </div>

      <section
        className="resumo-conjunto__especificacoes"
        aria-label={`Especificações do conjunto ${numero}`}
      >
        <h3>Especificações do conjunto</h3>
        <dl className="resumo-conjunto__detalhes">
          <div className="resumo-conjunto__peca-info">
            <dt>
              <strong>Top · tamanho {conjunto.cima.tamanho}</strong>
            </dt>
            <dd>{modeloCima.nome}</dd>
          </div>
          <div className="resumo-conjunto__peca-info">
            <dt>
              <strong>Calcinha · tamanho {conjunto.baixo.tamanho}</strong>
            </dt>
            <dd>{modeloBaixo.nome}</dd>
          </div>
          <div className="resumo-conjunto__malha">
            <dt>
              <strong>Malha:</strong>
            </dt>
            <dd>{tecido.nome}</dd>
          </div>
          <div className="resumo-conjunto__referencia">
            <dt>Foto de referência das medidas</dt>
            <dd>
              {conjunto.local.fotoPrevia ? (
                <button
                  className="resumo-conjunto__abrir-foto"
                  type="button"
                  onClick={() => setFotoAmpliada(true)}
                  aria-haspopup="dialog"
                  aria-label="Ampliar foto de referência das medidas"
                >
                  <img className="resumo-conjunto__foto" src={conjunto.local.fotoPrevia} alt="" />
                  <span>Toque para ampliar</span>
                </button>
              ) : (
                <span className="resumo-conjunto__sem-foto">Nenhuma foto enviada</span>
              )}
            </dd>
          </div>
          <div className="resumo-conjunto__detalhe">
            <dt>
              <strong>Observações</strong>
            </dt>
            <dd>{conjunto.observacao.trim() || 'Nenhuma observação.'}</dd>
          </div>
          <div className="resumo-conjunto__detalhe">
            <dt>
              <strong>Adereços aplicados</strong>
            </dt>
            <dd>
              {gruposAderecos.length > 0 ? (
                <ul className="resumo-conjunto__aderecos">
                  {gruposAderecos.map((grupo, indice) => (
                    <li key={`${grupo.nome}-${indice}`}>
                      <span className="resumo-conjunto__adereco-nome">
                        <span
                          className="resumo-conjunto__adereco-cor"
                          style={{ '--cor-adereco': grupo.cor } as CSSProperties}
                          aria-hidden="true"
                        />
                        {grupo.nome}
                      </span>
                      <span>
                        {grupo.quantidade} {grupo.quantidade === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="resumo-conjunto__sem-foto">Nenhum adereço aplicado.</span>
              )}
            </dd>
          </div>
        </dl>
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
    const modeloCima = catalogos.modelos?.find(
      (modelo) => modelo.id === conjunto.cima.id_modelo && modelo.parte === 'CIMA',
    );
    const modeloBaixo = catalogos.modelos?.find(
      (modelo) => modelo.id === conjunto.baixo.id_modelo && modelo.parte === 'BAIXO',
    );
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

    const idsAderecos = [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos].map(
      (aplicado) => aplicado.id_adereco,
    );
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
  const { conjuntos, setIndiceConjuntoAtivo, setCatalogos, avisar, adicionarConjunto } =
    useOutletContext<ContextoPedido>();
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
          setErro(
            e instanceof Error ? e.message : 'Não foi possível carregar o catálogo do pedido.',
          );
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
      conjuntos.every(
        (conjunto) =>
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

    const incompleto = conjuntos.findIndex(
      (conjunto) => !conjunto.cima.id_modelo || !conjunto.baixo.id_modelo,
    );
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
  }, [avisar, carregando, catalogoResumo, conjuntos, erro, navigate, setIndiceConjuntoAtivo]);
  /* oxlint-enable react(set-state-in-effect) */

  if (carregando) {
    return (
      <p className="resumo-status" role="status">
        Carregando catálogo do pedido...
      </p>
    );
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
    return (
      <p className="resumo-status" role="status">
        Conferindo os itens do pedido...
      </p>
    );
  }

  const modelos = catalogoResumo.modelos ?? [];
  const tecidos = catalogoResumo.tecidos ?? [];
  const aderecos = catalogoResumo.aderecos ?? [];
  const precos = conjuntos.map((conjunto) => subtotalPedidoCentavos([conjunto], catalogoResumo));
  const subtotal = subtotalPedidoCentavos(conjuntos, catalogoResumo);

  return (
    <div className="resumo-pedido">
      <h1>Resumo do Pedido</h1>
      {conjuntos.map((conjunto, indice) => {
        const modeloCima = modelos.find(
          (modelo) => modelo.id === conjunto.cima.id_modelo && modelo.parte === 'CIMA',
        )!;
        const modeloBaixo = modelos.find(
          (modelo) => modelo.id === conjunto.baixo.id_modelo && modelo.parte === 'BAIXO',
        )!;
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
        + Fazer outro conjunto
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
