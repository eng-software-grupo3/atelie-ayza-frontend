const ROTULOS: Record<string, string> = {
  em_analise: 'Em análise',
  recusado: 'Recusado',
  esperando_1_pag: 'Esperando 1º pagamento',
  em_producao: 'Em produção',
  esperando_2_pag: 'Esperando 2º pagamento',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function normalizarStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s-]+/g, '_');
}

export function rotuloStatus(status: string): string {
  const normalizado = normalizarStatus(status);
  return ROTULOS[normalizado] ?? normalizado.replace(/_/g, ' ');
}

export function ehStatusComProblema(status: string): boolean {
  return /recus|cancel/.test(normalizarStatus(status));
}

function converterData(valor: string): Date | null {
  if (!valor) return null;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
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
