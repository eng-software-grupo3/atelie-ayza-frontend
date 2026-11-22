import { formatarMoeda } from '../data/pedido.ts';

type Props = {
  linhas: { rotulo: string; valor: number | string }[];
  total: number | string;
};

export function TotaisPedido({ linhas, total }: Props) {
  return (
    <section className="personalizacao__totais" aria-label="Resumo do pedido">
      {linhas.map((linha) => (
        <div className="personalizacao__linha" key={linha.rotulo}>
          <span>{linha.rotulo}</span>
          <span>{typeof linha.valor === 'number' ? formatarMoeda(linha.valor) : linha.valor}</span>
        </div>
      ))}
      <div className="personalizacao__linha personalizacao__linha--total">
        <strong>Total a pagar:</strong>
        <strong>{typeof total === 'number' ? formatarMoeda(total) : total}</strong>
      </div>
    </section>
  );
}
