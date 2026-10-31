import { Link } from 'react-router-dom';

export function Inicio() {
  return (
    <main className="app-main">
      <section className="hero">
        <p className="texto-suave">Ateliê Ayza</p>
        <h1 className="hero__titulo">Monte sua peça do seu jeito</h1>
        <p className="hero__texto">
          Escolha modelo, tecido, tamanho e adereços em poucos passos, e acompanhe cada pedido por
          aqui.
        </p>
        <div className="hero__acoes">
          <Link className="botao" to="/pedido/novo/modelo">
            Montar meu pedido
          </Link>
          <Link className="botao botao--secundario" to="/meus-pedidos">
            Meus pedidos
          </Link>
        </div>
      </section>
    </main>
  );
}
