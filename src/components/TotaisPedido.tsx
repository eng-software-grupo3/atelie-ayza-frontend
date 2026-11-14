import { formatarMoeda } from '../data/pedido.ts';

type Props = {
  /** Linhas intermediárias, como "Subtotal anterior" e "Adereços". */
  linhas: { rotulo: string; valor: number }[];
  total: number;
};

export function TotaisPedido({ linhas, total }: Props) {
  return (
    <section className="personalizacao__totais" aria-label="Resumo do pedido">
      {linhas.map((linha) => (
        <div className="personalizacao__linha" key={linha.rotulo}>
          <span>{linha.rotulo}</span>
          <span>{formatarMoeda(linha.valor)}</span>
        </div>
      ))}
      <div className="personalizacao__linha personalizacao__linha--total">
        <strong>Total a pagar:</strong>
        <strong>{formatarMoeda(total)}</strong>
      </div>
    </section>
  );
}
