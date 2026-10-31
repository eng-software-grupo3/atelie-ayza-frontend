import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="app-main">
      <div className="nao-encontrado">
        <h1 className="secao__titulo">Página não encontrada</h1>
        <p className="texto-suave">O endereço informado não corresponde a uma página disponível.</p>
        <Link className="botao" to="/">
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
