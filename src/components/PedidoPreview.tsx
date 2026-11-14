import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import type { ParteDaPeca, PontoAdereco } from '../data/pedido.ts';
import type { ModeloCatalogo } from '../services/catalogo.ts';
import {
  aplicarTecidoNoModelo,
  urlDaImagemCatalogo,
  type TecidoCatalogo,
} from '../services/catalogo.ts';

type Props = {
  modeloCima: ModeloCatalogo | null;
  modeloBaixo: ModeloCatalogo | null;
  tecido?: TecidoCatalogo | null;
  carregando?: boolean;
  /** Pontos de adereço desenhados sobre as peças. */
  pontos?: PontoAdereco[];
  /** Quando informado, tocar numa peça chama a função com a posição (0 a 1) do toque. */
  onMarcar?: (peca: ParteDaPeca, x: number, y: number) => void;
};

type PecaPreviewProps = {
  src: string;
  alt: string;
  peca: ParteDaPeca;
  pontos: PontoAdereco[];
  onMarcar?: Props['onMarcar'];
};

const limitar = (valor: number) => Math.min(1, Math.max(0, valor));

function PecaPreview({ src, alt, peca, pontos, onMarcar }: PecaPreviewProps) {
  const [proporcao, setProporcao] = useState<number | null>(null);
  const pontosDaPeca = pontos.filter((ponto) => ponto.peca === peca);

  function aoCarregar(evento: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = evento.currentTarget;
    setProporcao(naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : null);
  }

  function marcar(evento: MouseEvent<HTMLButtonElement>) {
    if (!onMarcar) return;
    const area = evento.currentTarget.getBoundingClientRect();
    if (area.width === 0 || area.height === 0) return;

    // Ativação por teclado não tem posição de toque: marca o centro da peça.
    if (evento.detail === 0) {
      onMarcar(peca, 0.5, 0.5);
      return;
    }
    onMarcar(
      peca,
      limitar((evento.clientX - area.left) / area.width),
      limitar((evento.clientY - area.top) / area.height),
    );
  }

  const estiloArea = proporcao
    ? ({ '--proporcao': proporcao } as CSSProperties)
    : undefined;

  return (
    <div className="pedido-preview__peca-caixa">
      <img className="pedido-preview__peca" src={src} alt={alt} onLoad={aoCarregar} />
      {onMarcar || pontosDaPeca.length > 0 ? (
        <button
          type="button"
          className={`pedido-preview__area${proporcao ? '' : ' pedido-preview__area--cheia'}`}
          style={estiloArea}
          onClick={marcar}
          disabled={!onMarcar}
          aria-label={`Marcar adereço na ${peca === 'CIMA' ? 'peça de cima' : 'peça de baixo'}`}
        >
          {pontosDaPeca.map((ponto) => (
            <span
              key={ponto.id}
              className="pedido-preview__ponto"
              aria-hidden="true"
              style={
                {
                  left: `${ponto.x * 100}%`,
                  top: `${ponto.y * 100}%`,
                  '--cor-adereco': ponto.cor,
                } as CSSProperties
              }
            />
          ))}
        </button>
      ) : null}
    </div>
  );
}

export function PedidoPreview({
  modeloCima,
  modeloBaixo,
  tecido = null,
  carregando = false,
  pontos = [],
  onMarcar,
}: Props) {
  const [previaTecido, setPreviaTecido] = useState<{
    url: string;
    cima: string;
    baixo: string;
  } | null>(null);
  const [erroTecido, setErroTecido] = useState<{ url: string; message: string } | null>(null);

  useEffect(() => {
    let ativo = true;

    if (!tecido?.foto) return;

    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => void (async () => {
      if (!ativo) return;
      try {
        const [cima, baixo] = await Promise.all([
          modeloCima ? aplicarTecidoNoModelo(modeloCima.svg_url, imagem) : '',
          modeloBaixo ? aplicarTecidoNoModelo(modeloBaixo.svg_url, imagem) : '',
        ]);
        if (ativo) {
          setPreviaTecido({ url: tecido.foto!, cima, baixo });
          setErroTecido(null);
        }
      } catch (e) {
        if (ativo) {
          setErroTecido({
            url: tecido.foto!,
            message:
              e instanceof Error ? e.message : 'Não foi possível aplicar o tecido à prévia.',
          });
        }
      }
    })();
    imagem.onerror = () => {
      if (ativo) {
        setErroTecido({
          url: tecido.foto!,
          message: 'Não foi possível carregar a imagem do tecido selecionado.',
        });
      }
    };
    imagem.src = urlDaImagemCatalogo(tecido.foto);

    return () => {
      ativo = false;
      imagem.onload = null;
      imagem.onerror = null;
    };
  }, [modeloBaixo, modeloCima, tecido?.foto]);

  const previa = useMemo(() => {
    const imagemCima = modeloCima ? urlDaImagemCatalogo(modeloCima.svg_url) : '';
    const imagemBaixo = modeloBaixo ? urlDaImagemCatalogo(modeloBaixo.svg_url) : '';
    if (!tecido?.foto || previaTecido?.url !== tecido.foto) {
      return {
        cima: imagemCima,
        baixo: imagemBaixo,
        erro: erroTecido?.url === tecido?.foto ? (erroTecido?.message ?? '') : '',
      };
    }

    return {
      cima: previaTecido.cima,
      baixo: previaTecido.baixo,
      erro: '',
    };
  }, [erroTecido, modeloBaixo, modeloCima, previaTecido, tecido]);

  return (
    <figure className="pedido-preview" aria-label="Prévia do conjunto">
      <div className="pedido-preview__moldura">
        <div className="pedido-preview__pecas">
          {modeloCima ? (
            <PecaPreview
              src={previa.cima}
              alt={`Top ${modeloCima.nome}`}
              peca="CIMA"
              pontos={pontos}
              onMarcar={onMarcar}
            />
          ) : (
            <span className="pedido-preview__ausente">Top</span>
          )}
          {modeloBaixo ? (
            <PecaPreview
              src={previa.baixo}
              alt={`Calcinha ${modeloBaixo.nome}`}
              peca="BAIXO"
              pontos={pontos}
              onMarcar={onMarcar}
            />
          ) : (
            <span className="pedido-preview__ausente">Calcinha</span>
          )}
        </div>
        {carregando && <span className="pedido-preview__carregando">Carregando prévia…</span>}
      </div>
      {previa.erro && (
        <figcaption className="pedido-preview__erro" role="status">
          {previa.erro}
        </figcaption>
      )}
    </figure>
  );
}
