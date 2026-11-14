import type { Dispatch, SetStateAction } from 'react';
import type { AderecoCatalogo, ModeloCatalogo, TecidoCatalogo } from '../services/catalogo.ts';

export const tamanhos = ['PP', 'P', 'M', 'G', 'GG'] as const;

export type TamanhoPeca = (typeof tamanhos)[number];

export type ParteDaPeca = ModeloCatalogo['parte'];

/** Ponto onde a costureira deve aplicar um adereço; x e y são proporções (0 a 1) da peça. */
export type PontoAdereco = {
  id: string;
  adereco: AderecoCatalogo;
  cor: string;
  peca: ParteDaPeca;
  x: number;
  y: number;
};

export type RascunhoPedido = {
  modeloCima: ModeloCatalogo | null;
  modeloBaixo: ModeloCatalogo | null;
  tecido: TecidoCatalogo | null;
  tamanhoCima: TamanhoPeca;
  tamanhoBaixo: TamanhoPeca;
  fotoReferencia: File | null;
  /** Data URL da foto, só para exibir a prévia; o envio usa `fotoReferencia`. */
  fotoPrevia: string | null;
  observacoes: string;
  pontos: PontoAdereco[];
};

export type ContextoPedido = {
  rascunho: RascunhoPedido;
  setRascunho: Dispatch<SetStateAction<RascunhoPedido>>;
};

export const rascunhoInicial: RascunhoPedido = {
  modeloCima: null,
  modeloBaixo: null,
  tecido: null,
  tamanhoCima: 'M',
  tamanhoBaixo: 'M',
  fotoReferencia: null,
  fotoPrevia: null,
  observacoes: '',
  pontos: [],
};

/** Cores dos adereços, atribuídas pela ordem em que aparecem no catálogo. */
export const coresDosAderecos = ['#776456', '#8e8c8c', '#376fcf', '#991d4f'] as const;

export const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

/** Subtotal acumulado até a etapa de tecido (modelos + malha). */
export function subtotalModeloTecido(rascunho: RascunhoPedido): number {
  return (
    Number(rascunho.modeloCima?.valor ?? 0) +
    Number(rascunho.modeloBaixo?.valor ?? 0) +
    Number(rascunho.tecido?.preco_metro ?? 0)
  );
}

export function totalAderecos(pontos: PontoAdereco[]): number {
  return pontos.reduce((soma, ponto) => soma + Number(ponto.adereco.preco), 0);
}
