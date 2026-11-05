import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent as ReactSubmitEvent,
} from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { lerSessao, urlApi } from '../../services/auth.ts';

const categorias = [
  { to: '/gestao/estoque/tecidos', label: 'Tecidos' },
  { to: '/gestao/estoque/aderecos', label: 'Adereços' },
  { to: '/gestao/estoque/modelos', label: 'Modelos' },
];

type Tecido = {
  id: string | number;
  nome: string;
  foto?: string | null;
  preco_metro: string | number;
  quantidade_m: string | number;
};

export function Estoque() {
  const conteudoEstoque = useRef<HTMLElement>(null);

  function abrirCadastro() {
    const modal =
      conteudoEstoque.current?.querySelector<HTMLDialogElement>(
        '.modal-cadastro',
      );

    modal?.querySelector('form')?.reset();
    modal?.showModal();
  }

  return (
    <main ref={conteudoEstoque} className="app-main">
      <nav
        className="nav-pill nav-pill--sub"
        aria-label="Categorias de estoque"
      >
        {categorias.map((categoria) => (
          <NavLink
            key={categoria.to}
            to={categoria.to}
            className={({ isActive }) =>
              isActive
                ? 'nav-pill__item nav-pill__item--ativo'
                : 'nav-pill__item'
            }
          >
            {categoria.label}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={abrirCadastro}
          className="botao--cadastro"
        >
          +Cadastrar
        </button>
      </nav>

      <Outlet />
    </main>
  );
}

export function EstoqueTecidos() {
  const modalCadastro = useRef<HTMLDialogElement>(null);

  
  const [tecidos, setTecidos] = useState<Tecido[]>([
  {
    id: 1,
    nome: 'Algodão floral',
    foto: null,
    preco_metro: 29.9,
    quantidade_m: 15,
  },
]);
  const [carregando, setCarregando] = useState(true);
  const [erroListagem, setErroListagem] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [excluindoId, setExcluindoId] = useState<Tecido['id'] | null>(
    null,
  );

  const carregarTecidos = useCallback(async () => {
    setCarregando(true);
    setErroListagem('');

    try {
      const sessao = lerSessao();

      if (!sessao) {
        throw new Error('Faça login para acessar os tecidos.');
      }

      const resposta = await fetch(urlApi('/api/gestao/tecidos'), {
        headers: {
          Authorization: `Bearer ${sessao.accessToken}`,
        },
      });

      if (!resposta.ok) {
        throw new Error(
          `Não foi possível carregar os tecidos. Código: ${resposta.status}.`,
        );
      }

      const dados: Tecido[] = await resposta.json();

      if (!Array.isArray(dados)) {
        throw new Error('A API retornou uma lista em formato inesperado.');
      }

      setTecidos(dados);
    } catch (erro) {
      setErroListagem(
        erro instanceof Error
          ? erro.message
          : 'Ocorreu um erro ao carregar os tecidos.',
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  // useEffect(() => {
  //   void carregarTecidos();
  // }, [carregarTecidos]);

  function fecharCadastro() {
    modalCadastro.current?.close();
  }

  async function cadastrarTecido(
    event: ReactSubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formulario = event.currentTarget;
    const dados = new FormData(formulario);

    setSalvando(true);
    setErroCadastro('');
    setSucesso('');

    try {
      const sessao = lerSessao();

      if (!sessao) {
        throw new Error('Faça login para cadastrar tecidos.');
      }

      const resposta = await fetch(urlApi('/api/gestao/tecidos'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessao.accessToken}`,
        },
        body: dados,
      });

      if (!resposta.ok) {
        throw new Error(
          `Não foi possível cadastrar o tecido. Código: ${resposta.status}.`,
        );
      }

      formulario.reset();
      fecharCadastro();
      setSucesso('Tecido cadastrado com sucesso!');

      await carregarTecidos();
    } catch (erro) {
      setErroCadastro(
        erro instanceof Error
          ? erro.message
          : 'Ocorreu um erro ao cadastrar o tecido.',
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirTecido(tecido: Tecido) {
    const confirmou = window.confirm(
      `Deseja excluir o tecido "${tecido.nome}"?`,
    );

    if (!confirmou) return;

    setExcluindoId(tecido.id);
    setErroListagem('');
    setSucesso('');

    try {
      const sessao = lerSessao();

      if (!sessao) {
        throw new Error('Faça login para excluir tecidos.');
      }

      const resposta = await fetch(
        urlApi(
          `/api/gestao/tecidos/${encodeURIComponent(tecido.id)}`,
        ),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sessao.accessToken}`,
          },
        },
      );

      if (!resposta.ok) {
        throw new Error(
          `Não foi possível excluir o tecido. Código: ${resposta.status}.`,
        );
      }

      setTecidos((listaAtual) =>
        listaAtual.filter((item) => item.id !== tecido.id),
      );

      setSucesso('Tecido excluído com sucesso!');
    } catch (erro) {
      setErroListagem(
        erro instanceof Error
          ? erro.message
          : 'Ocorreu um erro ao excluir o tecido.',
      );
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <>
      {sucesso && (
        <p className="alerta alerta--sucesso" role="status">
          {sucesso}
        </p>
      )}

      {erroListagem && (
        <p className="alerta alerta--erro" role="alert">
          {erroListagem}
        </p>
      )}

      {carregando && (
        <p className="texto-suave" role="status">
          Carregando tecidos...
        </p>
      )}

      {!carregando && !erroListagem && tecidos.length === 0 && (
        <p className="texto-suave">Nenhum tecido cadastrado.</p>
      )}

      <div className="lista-tecidos">
        {tecidos.map((tecido) => (
          <article className="tecido-card" key={tecido.id}>
            {tecido.foto ? (
              <img
                className="tecido-card__imagem"
                src={tecido.foto}
                alt={tecido.nome}
              />
            ) : (
              <div className="tecido-card__sem-imagem">
                Sem imagem
              </div>
            )}

            <div className="tecido-card__conteudo">
              <div className="tecido-card__topo">
                <h3 className="tecido-card__nome">
                  {tecido.nome}
                </h3>

                <span className="tecido-card__preco">
                  {Number(tecido.preco_metro).toLocaleString(
                    'pt-BR',
                    {
                      style: 'currency',
                      currency: 'BRL',
                    },
                  )}
                </span>
              </div>

              <p className="tecido-card__estoque">
                Metros atuais:
                <span className="tecido-card__quantidade">
                  {Number(tecido.quantidade_m).toLocaleString(
                    'pt-BR',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
              </p>

              <div className="tecido-card__acoes">
                <button
                  type="button"
                  className="tecido-card__excluir"
                  onClick={() => excluirTecido(tecido)}
                  disabled={excluindoId !== null || carregando}
                  aria-label={`Excluir tecido ${tecido.nome}`}
                >
                  <span aria-hidden="true">×</span>
                  {excluindoId === tecido.id
                    ? 'Excluindo...'
                    : 'Excluir'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <dialog
        ref={modalCadastro}
        className="modal-cadastro"
        aria-labelledby="titulo-cadastro-tecido"
        onClose={() => setErroCadastro('')}
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

        <form
          className="form-cadastro"
          onSubmit={cadastrarTecido}
          aria-busy={salvando}
        >
          <label>
            Nome do tecido
            <input
              type="text"
              name="nome"
              placeholder="Nome"
              required
            />
          </label>

          <label>
            Imagem do tecido (estampa)
            <input
              type="file"
              name="foto"
              accept="image/*"
            />
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

          {erroCadastro && (
            <p className="alerta alerta--erro" role="alert">
              {erroCadastro}
            </p>
          )}

          <div className="form-cadastro__acoes">
            <button
              type="button"
              onClick={fecharCadastro}
              disabled={salvando}
            >
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