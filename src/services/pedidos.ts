import type { ConjuntoPedidoCompleto, ModalidadeFrete } from '../data/pedido.ts';
import { apiJson } from './api.ts';

export type CriarPedidoBody = {
  telefone: string;
  endereco: {
    cep: string;
    numero: string;
    complemento: string;
    rua?: string;
    bairro?: string;
  };
  modalidade_frete: ModalidadeFrete;
  data_entrega_prevista: string;
  conjuntos: ConjuntoPedidoCompleto[];
};

export type PedidoCriado = {
  id: string;
  num_pedido: number;
  status: string;
  data_entrega_prevista: string;
  modalidade_frete: ModalidadeFrete;
  preco_frete: number;
  prazo_frete_dias: number;
  preco_final: number;
  conjuntos: Array<{ id: string; preco: number }>;
};

export function criarPedido(body: CriarPedidoBody): Promise<PedidoCriado> {
  return apiJson<PedidoCriado>('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Campos comuns à lista e ao detalhe devolvidos por `/api/pedidos`. */
export type PedidoResumo = {
  id: string;
  num_pedido: number;
  status: string;
  data_pedido: string;
  data_entrega_prevista: string;
  preco_final: number;
  preco_frete: number;
  modalidade_frete: string;
  valor_parcela_1: number;
  valor_parcela_2: number;
  motivo_recusa_cancelamento: string | null;
};

export type AderecoPedido = {
  id_adereco: string;
  nome: string;
  coordenada_x: number;
  coordenada_y: number;
};

export type PecaPedido = {
  id: string;
  id_modelo: string;
  modelo: string;
  parte: string;
  tamanho: string;
  aderecos: AderecoPedido[];
};

export type ConjuntoPedido = {
  id: string;
  id_tecido: string;
  tecido: string;
  preco: number;
  observacao: string;
  foto_cliente: string | null;
  cima: PecaPedido;
  baixo: PecaPedido;
};

export type HistoricoStatusPedido = {
  status: string;
  data_mudanca: string;
  motivo: string | null;
};

export type PedidoDetalhe = PedidoResumo & {
  endereco: {
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  prazo_frete_dias: number;
  conjuntos: ConjuntoPedido[];
  historico: HistoricoStatusPedido[];
};

/** A lista já vem ordenada no back; ordenar aqui também cobre mudanças no contrato. */
export async function listarPedidos(): Promise<PedidoResumo[]> {
  const pedidos = await apiJson<PedidoResumo[]>('/api/pedidos');
  return [...pedidos].sort((a, b) => Date.parse(b.data_pedido) - Date.parse(a.data_pedido));
}

export function buscarPedido(id: string): Promise<PedidoDetalhe> {
  return apiJson<PedidoDetalhe>(`/api/pedidos/${encodeURIComponent(id)}`);
}
