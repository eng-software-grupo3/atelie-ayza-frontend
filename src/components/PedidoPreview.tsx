import { useEffect, useMemo, useState } from 'react';
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
};

export function PedidoPreview({
  modeloCima,
  modeloBaixo,
  tecido = null,
  carregando = false,
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
            <img
              className="pedido-preview__peca"
              src={previa.cima}
              alt={`Top ${modeloCima.nome}`}
            />
          ) : (
            <span className="pedido-preview__ausente">Top</span>
          )}
          {modeloBaixo ? (
            <img
              className="pedido-preview__peca"
              src={previa.baixo}
              alt={`Calcinha ${modeloBaixo.nome}`}
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
