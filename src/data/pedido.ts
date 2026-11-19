import type { Dispatch, SetStateAction } from 'react';
import type {
  AderecoCatalogo,
  ModeloCatalogo,
  TecidoCatalogo,
} from '../services/catalogo.ts';

export const tamanhos = ['PP', 'P', 'M', 'G', 'GG'] as const;

export type TamanhoPeca = (typeof tamanhos)[number];
export type ParteDaPeca = ModeloCatalogo['parte'];

export type AderecoAplicado = {
  id_adereco: string;
  coordenada_x: number;
  coordenada_y: number;
};

export type PecaRascunho = {
  id_modelo: string | null;
  tamanho: TamanhoPeca;
  aderecos: AderecoAplicado[];
};

export type ConjuntoRascunho = {
  id_tecido: string | null;
  observacao: string;
  cima: PecaRascunho;
  baixo: PecaRascunho;
  local: {
    fotoReferencia: File | null;
    fotoPrevia: string | null;
  };
};

export type ConjuntoPedidoBody = Omit<ConjuntoRascunho, 'local'>;
export type PedidoRascunho = { conjuntos: ConjuntoPedidoBody[] };

export type CatalogosPedido = {
  modelos: ModeloCatalogo[] | null;
  tecidos: TecidoCatalogo[] | null;
  aderecos: AderecoCatalogo[] | null;
};

export type PontoAdereco = {
  id: string;
  adereco: AderecoCatalogo;
  cor: string;
  peca: ParteDaPeca;
  x: number;
  y: number;
};

export type ContextoPedido = {
  pedido: PedidoRascunho;
  rascunho: ConjuntoRascunho;
  setRascunho: Dispatch<SetStateAction<ConjuntoRascunho>>;
  conjuntos: ConjuntoRascunho[];
  indiceConjuntoAtivo: number;
  setIndiceConjuntoAtivo: Dispatch<SetStateAction<number>>;
  catalogos: CatalogosPedido;
  setCatalogos: Dispatch<SetStateAction<CatalogosPedido>>;
  avisar: (mensagem: string) => void;
  adicionarConjunto: () => boolean;
};

export const rascunhoInicial = (): ConjuntoRascunho => ({
  id_tecido: null,
  observacao: '',
  cima: { id_modelo: null, tamanho: 'M', aderecos: [] },
  baixo: { id_modelo: null, tamanho: 'M', aderecos: [] },
  local: { fotoReferencia: null, fotoPrevia: null },
});

export const catalogosIniciais: CatalogosPedido = {
  modelos: null,
  tecidos: null,
  aderecos: null,
};

/** Cores dos adereços, atribuídas pela ordem em que aparecem no catálogo. */
export const coresDosAderecos = ['#776456', '#8e8c8c', '#376fcf', '#991d4f'] as const;

export const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export const formatarCentavos = (valor: number): string => formatarMoeda(valor / 100);

function decimalParaEscala(valor: number | string, casas: number): number {
  const texto = String(valor);
  const correspondencia = /^(-?)(\d+)(?:\.(\d+))?$/.exec(texto);
  if (!correspondencia) throw new Error(`Valor decimal inválido: ${texto}`);

  const [, sinal, inteiro, fracao = ''] = correspondencia;
  const fator = 10 ** casas;
  const fracaoMantida = fracao.slice(0, casas).padEnd(casas, '0');
  const proximaCasa = Number(fracao[casas] ?? 0);
  const magnitude = Number(inteiro) * fator + Number(fracaoMantida || 0);
  const arredondado = magnitude + (proximaCasa >= 5 ? 1 : 0);
  return sinal === '-' ? -arredondado : arredondado;
}

function arredondarMeioParaCima(numerador: number, denominador: number): number {
  return Math.floor((numerador + denominador / 2) / denominador);
}

export function precificarConjuntoCentavos(
  conjunto: ConjuntoRascunho,
  catalogos: Pick<CatalogosPedido, 'modelos' | 'tecidos' | 'aderecos'>,
): number {
  const modelos = catalogos.modelos ?? [];
  const tecidos = catalogos.tecidos ?? [];
  const aderecos = catalogos.aderecos ?? [];
  const modeloCima = modelos.find((modelo) => modelo.id === conjunto.cima.id_modelo);
  const modeloBaixo = modelos.find((modelo) => modelo.id === conjunto.baixo.id_modelo);
  const tecido = tecidos.find((item) => item.id === conjunto.id_tecido);

  if (!modeloCima || !modeloBaixo || !tecido) {
    throw new Error('Não é possível calcular o preço de um conjunto incompleto.');
  }

  const valorCima = decimalParaEscala(modeloCima.valor, 2);
  const valorBaixo = decimalParaEscala(modeloBaixo.valor, 2);
  const precoMetro = decimalParaEscala(tecido.preco_metro, 2);
  const metragemCima = decimalParaEscala(modeloCima.metragem_media_m, 2);
  const metragemBaixo = decimalParaEscala(modeloBaixo.metragem_media_m, 2);
  const metragemTotal = metragemCima + metragemBaixo;
  const custoTecido = arredondarMeioParaCima(precoMetro * metragemTotal, 100);

  const custoAderecos = [...conjunto.cima.aderecos, ...conjunto.baixo.aderecos].reduce(
    (total, aplicado) => {
      const item = aderecos.find((adereco) => adereco.id === aplicado.id_adereco);
      if (!item) throw new Error('Um adereço deste conjunto não está mais disponível.');
      return total + decimalParaEscala(item.preco, 2);
    },
    0,
  );

  return valorCima + valorBaixo + custoTecido + custoAderecos;
}

export function subtotalPedidoCentavos(
  conjuntos: ConjuntoRascunho[],
  catalogos: CatalogosPedido,
): number {
  return conjuntos.reduce(
    (subtotal, conjunto) => subtotal + precificarConjuntoCentavos(conjunto, catalogos),
    0,
  );
}

export function criarCorpoPedido(conjuntos: ConjuntoRascunho[]): PedidoRascunho {
  return {
    conjuntos: conjuntos.map((conjunto) => ({
      id_tecido: conjunto.id_tecido,
      observacao: conjunto.observacao,
      cima: conjunto.cima,
      baixo: conjunto.baixo,
    })),
  };
}
