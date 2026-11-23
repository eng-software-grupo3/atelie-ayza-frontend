type Props = {
  foto: string | null;
  onAmpliar: (url: string) => void;
  rotulo?: string;
};

/** Bloco "Foto do Corpo (Medidas)": mostra a miniatura ou avisa que não há foto. */
export function FotoCorpo({ foto, onAmpliar, rotulo = 'Ampliar foto do corpo' }: Props) {
  if (!foto) {
    return (
      <div className="pedido-card__foto pedido-card__foto--vazia">
        <span className="pedido-card__foto-miniatura" aria-hidden="true" />
        <span className="pedido-card__foto-texto">
          <strong>Foto do Corpo (Medidas)</strong>
          <small>Nenhuma foto enviada</small>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="pedido-card__foto"
      onClick={() => onAmpliar(foto)}
      aria-label={rotulo}
    >
      <img src={foto} alt="" loading="lazy" />
      <span className="pedido-card__foto-texto">
        <strong>Foto do Corpo (Medidas)</strong>
        <small>Clique na foto para ampliar</small>
      </span>
    </button>
  );
}
