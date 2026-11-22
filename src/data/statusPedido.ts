/**
 * Rótulos e formatação compartilhados pela lista e pelo detalhe de pedidos.
 *
 * Os valores do enum podem chegar com acento, caixa diferente ou underscores.
 * `normalizarStatus` trata isso para que um novo valor do back não quebre a
 * leitura; se o enum mudar, basta ajustar os mapas abaixo.
 */

const ROTULOS: Record<string, string> = {
  em_analise: 'Em análise',
  analise: 'Em análise',
  aguardando_analise: 'Aguardando análise',
  aceito: 'Aceito',
  aprovado: 'Aprovado',
  em_pagamento: 'Em pagamento',
  pagamento: 'Em pagamento',
  pagamento_pendente: 'Pagamento pendente',
  pagamentos: 'Pagamentos',
  pago: 'Pago',
  em_producao: 'Em produção',
  producao: 'Em produção',
  em_confeccao: 'Em confecção',
  confeccao: 'Em confecção',
  pronto: 'Pronto para envio',
  em_envio: 'Em envio',
  enviado: 'Enviado',
  despachado: 'Despachado',
  em_transporte: 'Em transporte',
  em_entrega: 'Em entrega',
  entregue: 'Entregue',
  finalizado: 'Finalizado',
  concluido: 'Concluído',
  recusado: 'Recusado',
  rejeitado: 'Recusado',
  cancelado: 'Cancelado',
};

const STATUS_COM_PROBLEMA = new Set(['recusado', 'rejeitado', 'cancelado']);

const STATUS_ACEITO = new Set([
  'aceito',
  'aprovado',
  'em_pagamento',
  'pagamento',
  'pagamento_pendente',
  'pagamentos',
  'pago',
  'em_producao',
  'producao',
  'em_confeccao',
  'confeccao',
  'pronto',
  'em_envio',
  'enviado',
  'despachado',
  'em_transporte',
  'em_entrega',
  'entregue',
  'finalizado',
  'concluido',
]);

function normalizarStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s-]+/g, '_');
}

export function rotuloStatus(status: string): string {
  const chave = normalizarStatus(status ?? '');
  if (!chave) return 'Status não informado';

  const rotulo = ROTULOS[chave];
  if (rotulo) return rotulo;

  const legivel = chave.replace(/_/g, ' ').trim();
  return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}

export function ehStatusComProblema(status: string): boolean {
  const chave = normalizarStatus(status ?? '');
  // Também cobre variações como `pedido_recusado` ou `cancelada`.
  return STATUS_COM_PROBLEMA.has(chave) || /recus|cancel|rejeit/.test(chave);
}

/** Preço final e parcelas só aparecem depois que o pedido foi aceito. */
export function pedidoFoiAceito(status: string): boolean {
  return STATUS_ACEITO.has(normalizarStatus(status ?? ''));
}

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function converterData(valor: string): Date | null {
  if (!valor) return null;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarDataPedido(valor: string): string {
  const data = converterData(valor);
  return data ? formatadorData.format(data) : '—';
}

export function formatarDataEntrega(valor: string): string {
  return formatarDataPedido(valor);
}

export function formatarDataHoraPedido(valor: string): string {
  const data = converterData(valor);
  return data ? `${formatadorData.format(data)} às ${formatadorHora.format(data)}` : '—';
}
