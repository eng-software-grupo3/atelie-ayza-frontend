import { ehStatusComProblema, rotuloStatus } from '../data/statusPedido.ts';

export function StatusPedido({ status }: { status: string }) {
  return (
    <span className="status-badge" data-problema={ehStatusComProblema(status)}>
      {rotuloStatus(status)}
    </span>
  );
}
