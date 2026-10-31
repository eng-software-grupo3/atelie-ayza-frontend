import { useState } from 'react';
import { Logo } from '../../components/Logo.tsx';

export function Login() {
  const [aviso, setAviso] = useState(false);

  return (
    <div className="app-frame">
      <main className="app-main">
        <div className="login">
          <Logo to="" compacto />
          <h1 className="login__titulo">Acesse sua conta</h1>
          <p className="texto-suave">
            Área de gestão do ateliê. A autenticação será conectada na próxima etapa do projeto.
          </p>

          <button
            type="button"
            className="botao botao--secundario botao--bloco"
            onClick={() => setAviso(true)}
          >
            Entre com Google
          </button>

          {aviso ? (
            <p className="alerta alerta--erro" role="status">
              O login ainda não está disponível nesta versão.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
