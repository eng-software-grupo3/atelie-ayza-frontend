import { urlDaImagemCatalogo } from '../services/catalogo.ts';

/** Data de despacho = entrega prevista menos o prazo do frete. */
export function calcularDespacho(entrega: string, prazoDias: number | undefined): string | null {
  if (!entrega || !prazoDias) return null;
  const base = /^\d{4}-\d{2}-\d{2}$/.test(entrega) ? `${entrega}T12:00:00` : entrega;
  const data = new Date(base);
  if (Number.isNaN(data.getTime())) return null;
  data.setDate(data.getDate() - prazoDias);
  return data.toISOString();
}

export function urlDaFoto(foto: string | null | undefined): string | null {
  const valor = foto?.trim();
  if (!valor) return null;
  if (/^(https?:\/\/|data:image\/)/i.test(valor)) return valor;
  if (valor.startsWith('/')) return urlDaImagemCatalogo(valor);
  return null;
}
