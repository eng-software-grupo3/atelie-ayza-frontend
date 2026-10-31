import { Link } from 'react-router-dom';

export function MeusPedidos() {
  return (
    <main className="app-main">
      <div className="acoes">
        <Link className="botao" to="/pedido/novo/modelo">
          + Fazer Novo Pedido
        </Link>
      </div>
    </main>
  );
}
