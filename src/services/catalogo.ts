import { apiJson } from './api.ts';
import { urlApi } from './auth.ts';

export type ModeloCatalogo = {
  id: string;
  nome: string;
  parte: 'CIMA' | 'BAIXO';
  valor: number;
  metragem_media_m: number;
  svg_url: string;
};

export type TecidoCatalogo = {
  id: string;
  nome: string;
  foto: string | null;
  preco_metro: number;
};

export type AderecoCatalogo = {
  id: string;
  nome: string;
  foto: string | null;
  preco: number;
};

export function carregarAderecos(): Promise<AderecoCatalogo[]> {
  return apiJson<AderecoCatalogo[]>('/api/aderecos');
}

export function carregarModelos(): Promise<ModeloCatalogo[]> {
  return apiJson<ModeloCatalogo[]>('/api/modelos');
}

export function carregarTecidos(): Promise<TecidoCatalogo[]> {
  return apiJson<TecidoCatalogo[]>('/api/tecidos');
}

export function urlDaImagemCatalogo(url: string): string {
  const imagem = url.trim();
  if (imagem.startsWith('<')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(imagem)}`;
  }
  if (import.meta.env.DEV && imagem.startsWith('/uploads/')) {
    return imagem;
  }
  return imagem.startsWith('/') ? urlApi(imagem) : imagem;
}

export async function aplicarTecidoNoModelo(
  svg: string,
  fotoTecido: HTMLImageElement,
): Promise<string> {
  const documento = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const raiz = documento.documentElement;
  const dimensoes = raiz
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    raiz.localName !== 'svg' ||
    !dimensoes ||
    dimensoes.length !== 4 ||
    dimensoes.some((dimensao) => !Number.isFinite(dimensao)) ||
    dimensoes[2] <= 0 ||
    dimensoes[3] <= 0 ||
    documento.querySelector('parsererror')
  ) {
    throw new Error('Não foi possível aplicar o tecido à prévia do modelo.');
  }

  const mascara = documento.cloneNode(true) as XMLDocument;
  const contorno = documento.cloneNode(true) as XMLDocument;
  const formas = 'path, rect, circle, ellipse, polygon';

  for (const forma of mascara.querySelectorAll(formas)) {
    let ancestral: Element | null = forma;
    let preenchimento: string | null = null;
    while (ancestral && !preenchimento) {
      preenchimento = ancestral.getAttribute('fill');
      ancestral = ancestral.parentElement;
    }

    forma.setAttribute('fill', preenchimento && preenchimento.toLowerCase() !== 'none' ? '#fff' : 'none');
    forma.setAttribute('stroke', 'none');
  }

  for (const forma of contorno.querySelectorAll(formas)) {
    forma.setAttribute('fill', 'none');
  }

  const [larguraOriginal, alturaOriginal] = dimensoes.slice(2);
  const escala = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(larguraOriginal * escala);
  canvas.height = Math.ceil(alturaOriginal * escala);
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Não foi possível preparar a prévia do tecido.');

  const dimensoesFoto = fotoTecido.naturalWidth / fotoTecido.naturalHeight;
  const dimensoesCanvas = canvas.width / canvas.height;
  let sx = 0;
  let sy = 0;
  let sw = fotoTecido.naturalWidth;
  let sh = fotoTecido.naturalHeight;
  if (dimensoesFoto > dimensoesCanvas) {
    sw = fotoTecido.naturalHeight * dimensoesCanvas;
    sx = (fotoTecido.naturalWidth - sw) / 2;
  } else {
    sh = fotoTecido.naturalWidth / dimensoesCanvas;
    sy = (fotoTecido.naturalHeight - sh) / 2;
  }
  contexto.drawImage(fotoTecido, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const mascaraImagem = await carregarImagemSvg(mascara);
  contexto.globalCompositeOperation = 'destination-in';
  contexto.drawImage(mascaraImagem, 0, 0, canvas.width, canvas.height);

  const contornoImagem = await carregarImagemSvg(contorno);
  contexto.globalCompositeOperation = 'source-over';
  contexto.drawImage(contornoImagem, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

function carregarImagemSvg(documento: XMLDocument): Promise<HTMLImageElement> {
  const svg = new XMLSerializer().serializeToString(documento);
  const imagem = new Image();

  return new Promise((resolve, reject) => {
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('Não foi possível preparar a imagem do modelo.'));
    imagem.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
