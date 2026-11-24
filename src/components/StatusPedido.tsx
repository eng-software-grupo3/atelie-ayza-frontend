import { ehStatusComProblema, rotuloStatus } from '../data/statusPedido.ts';

export function StatusPedido({ status, rotulo }: { status: string; rotulo?: string }) {
  return (
    <span
      className="status-badge"
      data-problema={ehStatusComProblema(status)}
      data-status={status.trim().toLowerCase().replaceAll('_', '-')}
    >
      {rotulo ?? rotuloStatus(status)}
    </span>
  );
}
