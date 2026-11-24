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

export type PedidoGestaoResumo = {
  id: string;
  num_pedido: number;
  status: string;
  data_pedido: string;
  data_entrega_prevista: string;
  preco_estimado: number;
  preco_final: number | null;
  cliente: {
    id: string;
    nome: string;
    email: string | null;
    foto_url: string | null;
  };
};

export type PaginaPedidosGestao = {
  dados: PedidoGestaoResumo[];
  pagina: number;
  limite: number;
  total: number;
  total_paginas: number;
};

export type PedidoGestaoDetalhe = PedidoGestaoResumo & {
  telefone: string;
  endereco: {
    rua: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  frete: {
    modalidade: string;
    preco: number;
    prazo_dias: number;
  };
  motivo_recusa_cancelamento: string | null;
  conjuntos: Array<{
    id: string;
    tecido: {
      id: string;
      nome: string;
      foto: string | null;
      largura_cm: number | null;
    };
    preco: number;
    observacao: string | null;
    foto_cliente: string | null;
    cima: PecaPedidoGestao;
    baixo: PecaPedidoGestao;
  }>;
  historico: Array<{
    status: string;
    data_mudanca: string;
    motivo: string | null;
  }>;
};

export type PecaPedidoGestao = {
  id: string;
  tamanho: string;
  modelo: {
    id: string;
    nome: string;
    parte: 'CIMA' | 'BAIXO';
    svg_url: string;
  };
  aderecos: Array<{
    id_adereco: string;
    nome: string;
    foto: string | null;
    coordenada_x: number;
    coordenada_y: number;
  }>;
};

export function listarPedidosGestao(
  status: string,
  pagina: number,
  limite = 10,
): Promise<PaginaPedidosGestao> {
  const parametros = new URLSearchParams({
    status,
    pagina: String(pagina),
    limite: String(limite),
    ordem: 'desc',
  });
  return apiJson<PaginaPedidosGestao>(`/api/gestao/pedidos?${parametros}`);
}

export function buscarPedidoGestao(id: string): Promise<PedidoGestaoDetalhe> {
  return apiJson<PedidoGestaoDetalhe>(`/api/gestao/pedidos/${encodeURIComponent(id)}`);
}

export type PedidoAcaoGestao = {
  id: string;
  status: string;
  preco_final: number | null;
  valor_parcela_1: number | null;
  valor_parcela_2: number | null;
  motivo_recusa_cancelamento: string | null;
};

export function aceitarPedidoGestao(id: string): Promise<PedidoAcaoGestao> {
  return apiJson<PedidoAcaoGestao>(`/api/gestao/pedidos/${encodeURIComponent(id)}/aceitar`, {
    method: 'PATCH',
  });
}

export function recusarPedidoGestao(id: string, motivo: string): Promise<PedidoAcaoGestao> {
  return apiJson<PedidoAcaoGestao>(`/api/gestao/pedidos/${encodeURIComponent(id)}/recusar`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}
