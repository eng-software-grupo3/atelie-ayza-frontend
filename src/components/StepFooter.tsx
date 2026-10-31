import { Link } from 'react-router-dom';
import type { Etapa } from '../data/etapas.ts';

type Props = {
  etapa: Etapa;
  anterior: Etapa | null;
  onAvancar: () => void;
};

export function StepFooter({ etapa, anterior, onAvancar }: Props) {
  return (
    <div className="step-footer">
      {anterior ? (
        <Link className="step-footer__voltar" to={`/pedido/novo/${anterior.slug}`}>
          <span className="seta seta--esquerda" aria-hidden="true" />
          Voltar
        </Link>
      ) : (
        <span />
      )}

      <button type="button" className="botao" onClick={onAvancar}>
        {etapa.rotuloAcao}
        <span className="seta" aria-hidden="true" />
      </button>
    </div>
  );
}
