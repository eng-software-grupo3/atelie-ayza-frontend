import type { Dispatch, SetStateAction } from 'react';
import type { ModeloCatalogo, TecidoCatalogo } from '../services/catalogo.ts';

export type RascunhoPedido = {
  modeloCima: ModeloCatalogo | null;
  modeloBaixo: ModeloCatalogo | null;
  tecido: TecidoCatalogo | null;
};

export type ContextoPedido = {
  rascunho: RascunhoPedido;
  setRascunho: Dispatch<SetStateAction<RascunhoPedido>>;
};

export const rascunhoInicial: RascunhoPedido = {
  modeloCima: null,
  modeloBaixo: null,
  tecido: null,
};

export const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
