import { useEffect, useRef, useState, type CSSProperties } from 'react';

type DimensoesArea = {
  proporcao: number;
  largura: number;
  altura: number;
};

export function useContainedImageArea(proporcao: number | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensoes, setDimensoes] = useState<DimensoesArea | null>(null);

  useEffect(() => {
    const caixa = ref.current;
    if (!caixa || !proporcao || !Number.isFinite(proporcao)) return;

    function atualizar(larguraCaixa: number, alturaCaixa: number) {
      if (larguraCaixa <= 0 || alturaCaixa <= 0) return;

      const largura = Math.min(larguraCaixa, alturaCaixa * proporcao);
      const altura = Math.min(alturaCaixa, larguraCaixa / proporcao);
      setDimensoes((atuais) =>
        atuais?.proporcao === proporcao &&
        Math.abs(atuais.largura - largura) < 0.5 &&
        Math.abs(atuais.altura - altura) < 0.5
          ? atuais
          : { proporcao, largura, altura },
      );
    }

    const retangulo = caixa.getBoundingClientRect();
    atualizar(retangulo.width, retangulo.height);

    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) atualizar(entrada.contentRect.width, entrada.contentRect.height);
    });
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [proporcao]);

  const estilo: CSSProperties | undefined =
    dimensoes?.proporcao === proporcao
      ? { width: dimensoes.largura, height: dimensoes.altura }
      : undefined;

  return { ref, estilo };
}
