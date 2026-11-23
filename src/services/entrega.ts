import type { ModalidadeFrete } from '../data/pedido.ts';
import { apiJson } from './api.ts';

export type EnderecoCotado = {
  logradouro: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
};

export type ModalidadeCotada = {
  modalidade: ModalidadeFrete;
  preco: number;
  prazo_frete_dias: number;
};

export type CotacaoFrete = {
  cep: string;
  endereco: EnderecoCotado;
  modalidades: ModalidadeCotada[];
};

export type DiaDisponivel = {
  data: string;
  disponivel: boolean;
};

export type DatasDisponiveis = {
  mes: string;
  data_minima: string;
  dias: DiaDisponivel[];
};

export function cotarFrete(cep: string, quantidadeConjuntos: number): Promise<CotacaoFrete> {
  const parametros = new URLSearchParams({
    cep,
    conjuntos: String(quantidadeConjuntos),
  });
  return apiJson<CotacaoFrete>(`/api/frete/cotacao?${parametros.toString()}`);
}

export function carregarDatasDisponiveis(
  mes: string,
  prazoFreteDias: number,
): Promise<DatasDisponiveis> {
  const parametros = new URLSearchParams({
    mes,
    prazo_frete_dias: String(prazoFreteDias),
  });
  return apiJson<DatasDisponiveis>(`/api/agenda/datas-disponiveis?${parametros.toString()}`);
}
