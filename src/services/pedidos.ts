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
