import { useRef, useState, type SubmitEvent } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const categorias = [
  { to: '/gestao/estoque/tecidos', label: 'Tecidos' },
  { to: '/gestao/estoque/aderecos', label: 'Adereços' },
  { to: '/gestao/estoque/modelos', label: 'Modelos' },
];

export function Estoque() {
  const conteudoEstoque = useRef<HTMLElement>(null);

  function abrirCadastro() {
    const modal = conteudoEstoque.current?.querySelector<HTMLDialogElement>('.modal-cadastro');

    modal?.querySelector('form')?.reset();
    modal?.showModal();
  }

  return (
    <main ref={conteudoEstoque} className="app-main">
      <nav className="nav-pill nav-pill--sub" aria-label="Categorias de estoque">
        {categorias.map((categoria) => (
          <NavLink
            key={categoria.to}
            to={categoria.to}
            className={({ isActive }) =>
              isActive ? 'nav-pill__item nav-pill__item--ativo' : 'nav-pill__item'
            }
          >
            {categoria.label}
          </NavLink>
        ))}
        <button type="button" onClick={abrirCadastro} className="botao--cadastro">
          +Cadastrar
        </button>
      </nav>

      <Outlet />
    </main>
  );
}

export function EstoqueTecidos() {
  const modalCadastro = useRef<HTMLDialogElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function fecharCadastro() {
    modalCadastro.current?.close();
  }

  async function cadastrar_tecido(event: SubmitEvent<HTMLFormElement>) {
    const formulario = event.currentTarget;
    const dados = new FormData(formulario);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;

      const resposta = await fetch(`${apiUrl}/api/gestao/tecidos`, {
        method: 'POST',
        body: dados,
      });
      if (!resposta.ok)
        throw new Error(`Não foi possível cadastrar o tecido. Código: ${resposta.status}.`);
      formulario.reset();
      fecharCadastro();
      setSucesso('Tecido cadastrado com sucesso!');
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : 'Ocorreu um erro ao cadastrar o tecido.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {sucesso && (
        <p className="alerta alerta--sucesso" role="status">
          {sucesso}
        </p>
      )}

      <dialog
        ref={modalCadastro}
        className="modal-cadastro"
        aria-labelledby="titulo-cadastro-tecido"
        onCancel={(event) => {
          if (salvando) event.preventDefault();
        }}
      >
        <div className="modal-cadastro__cabecalho">
          <h2 id="titulo-cadastro-tecido">Cadastrar Tecido</h2>

          <button
            type="button"
            className="modal-cadastro__fechar"
            aria-label="Fechar cadastro"
            onClick={fecharCadastro}
            disabled={salvando}
          >
            x
          </button>
        </div>

        <form className="form-cadastro" onSubmit={cadastrar_tecido} aria-busy={salvando}>
          <label>
            Nome do tecido
            <input type="text" name="nome" placeholder="Nome" required />
          </label>

          <label>
            Imagem do tecido (estampa)
            <input type="file" name="foto" accept="image/*" />
          </label>

          <div className="form-cadastro__linha">
            <label>
              Valor por metro R$
              <input
                type="number"
                name="preco_metro"
                placeholder="0,00"
                min="0"
                step="0.01"
                required
              />
            </label>

            <label>
              Metros atuais
              <input
                type="number"
                name="quantidade_m"
                placeholder="Ex.: 42,20"
                min="0"
                step="0.01"
                required
              />
            </label>
          </div>

          {erro && (
            <p className="alerta alerta--erro" role="alert">
              {erro}
            </p>
          )}

          <div className="form-cadastro__acoes">
            <button type="button" onClick={fecharCadastro} disabled={salvando}>
              Cancelar
            </button>

            <button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Item'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function EstoqueAderecos() {
  return null;
}

export function EstoqueModelos() {
  return null;
}
