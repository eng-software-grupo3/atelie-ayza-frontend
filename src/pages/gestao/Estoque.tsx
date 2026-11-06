import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent as ReactSubmitEvent,
} from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { lerSessao, urlApi } from '../../services/auth.ts';
import '../../styles/estoque-tecidos.css';

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

function FotoTecido({ foto, nome }: { foto?: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  const endereco = foto?.trim();
  const src =
    endereco && (/^(https?:|data:image\/|blob:)/i.test(endereco) ? endereco : urlApi(endereco));

  if (!src || falhou) {
    return (
      <div className="tecido-card__sem-imagem" role="img" aria-label={`Sem imagem de ${nome}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden="true"
        >
          <rect x="4" y="5" width="24" height="22" rx="3" />
          <circle cx="12" cy="12" r="2" />
          <path d="m5 23 7-7 5 5 4-4 6 6" />
        </svg>
        <span>Sem imagem</span>
      </div>
    );
  }
  return (
    <img
      className="tecido-card__imagem"
      src={src}
      alt={`Estampa de ${nome}`}
      onError={() => setFalhou(true)}
    />
  );
}

export function Estoque() {
  const conteudoEstoque = useRef<HTMLElement>(null);

  function abrirCadastro() {
    const modal = conteudoEstoque.current?.querySelector<HTMLDialogElement>('.modal-cadastro');

    modal?.querySelector('form')?.reset();
    modal?.showModal();
  }

  return (
    <main ref={conteudoEstoque} className="app-main estoque-pagina">
      <nav className="estoque-categorias" aria-label="Categorias de estoque">
        {categorias.map((categoria) => (
          <NavLink
            key={categoria.to}
            to={categoria.to}
            className={({ isActive }) =>
              isActive
                ? 'estoque-categorias__aba estoque-categorias__aba--ativa'
                : 'estoque-categorias__aba'
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
  const modalExclusao = useRef<HTMLDialogElement>(null);
  const [tecidoSelecionado, setTecidoSelecionado] = useState<Tecido | null>(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [editando, setEditando] = useState<Tecido | null>(null);

  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroListagem, setErroListagem] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [excluindoId, setExcluindoId] = useState<Tecido['id'] | null>(null);

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
        throw new Error(`Não foi possível carregar os tecidos. Código: ${resposta.status}.`);
      }

      const dados: Tecido[] = await resposta.json();

      if (!Array.isArray(dados)) {
        throw new Error('A API retornou uma lista em formato inesperado.');
      }

      setTecidos(dados);
    } catch (erro) {
      setErroListagem(
        erro instanceof Error ? erro.message : 'Ocorreu um erro ao carregar os tecidos.',
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarTecidos();
  }, [carregarTecidos]);

  function fecharCadastro() {
    modalCadastro.current?.close();
  }

  async function salvarTecido(event: ReactSubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;

    const formulario = event.currentTarget;
    const dados = new FormData(formulario);
    const nome = String(dados.get('nome') ?? '').trim();
    if (!nome) {
      setErroCadastro('Informe o nome do tecido.');
      return;
    }
    dados.set('nome', nome);
    const foto = dados.get('foto');
    if (!(foto instanceof File) || foto.size === 0) dados.delete('foto');
    if (editando) dados.delete('quantidade_m');
    const acao = editando ? 'atualizar' : 'cadastrar';

    setSalvando(true);
    setErroCadastro('');
    setSucesso('');

    try {
      const sessao = lerSessao();

      if (!sessao) {
        throw new Error(`Faça login para ${acao} tecidos.`);
      }

      const caminho = editando
        ? `/api/gestao/tecidos/${encodeURIComponent(editando.id)}`
        : '/api/gestao/tecidos';
      const resposta = await fetch(urlApi(caminho), {
        method: editando ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${sessao.accessToken}`,
        },
        body: dados,
      });

      if (!resposta.ok) {
        throw new Error(`Não foi possível ${acao} o tecido. Código: ${resposta.status}.`);
      }

      formulario.reset();
      fecharCadastro();
      setSucesso(editando ? 'Tecido atualizado com sucesso!' : 'Tecido cadastrado com sucesso!');

      await carregarTecidos();
    } catch (erro) {
      setErroCadastro(
        erro instanceof Error ? erro.message : `Ocorreu um erro ao ${acao} o tecido.`,
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirTecido(tecido: Tecido) {
    if (excluindoId !== null) return;

    setExcluindoId(tecido.id);
    setErroExclusao('');
    setSucesso('');

    try {
      const sessao = lerSessao();

      if (!sessao) {
        throw new Error('Faça login para excluir tecidos.');
      }

      const resposta = await fetch(urlApi(`/api/gestao/tecidos/${encodeURIComponent(tecido.id)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessao.accessToken}`,
        },
      });

      if (!resposta.ok) {
        throw new Error(`Não foi possível excluir o tecido. Código: ${resposta.status}.`);
      }

      setTecidos((listaAtual) => listaAtual.filter((item) => item.id !== tecido.id));

      setSucesso('Tecido excluído com sucesso!');
      modalExclusao.current?.close();
    } catch (erro) {
      setErroExclusao(
        erro instanceof Error ? erro.message : 'Ocorreu um erro ao excluir o tecido.',
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
          <article className="tecido-card" key={tecido.id} aria-label={tecido.nome}>
            <FotoTecido key={tecido.foto ?? 'sem-foto'} foto={tecido.foto} nome={tecido.nome} />

            <div className="tecido-card__conteudo">
              <div className="tecido-card__topo">
                <h3 className="tecido-card__nome">{tecido.nome}</h3>

                <div className="tecido-card__valor-edicao">
                  <button
                    type="button"
                    className="tecido-card__editar"
                    disabled={carregando || excluindoId !== null || salvando}
                    aria-label={`Editar tecido ${tecido.nome}`}
                    onClick={() => {
                      setEditando(tecido);
                      setErroCadastro('');
                      modalCadastro.current?.showModal();
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z M5 15l4 4" />
                    </svg>
                  </button>
                  <span className="tecido-card__preco">
                    {Number(tecido.preco_metro).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              <p className="tecido-card__estoque">
                Metros atuais:
                <span className="tecido-card__quantidade">
                  {Number(tecido.quantidade_m).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>

              <div className="tecido-card__acoes">
                <button
                  type="button"
                  className="tecido-card__excluir"
                  onClick={() => {
                    setTecidoSelecionado(tecido);
                    setErroExclusao('');
                    modalExclusao.current?.showModal();
                  }}
                  disabled={excluindoId !== null || carregando}
                  aria-label={`Excluir tecido ${tecido.nome}`}
                >
                  <span aria-hidden="true">×</span>
                  {excluindoId === tecido.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <dialog
        ref={modalExclusao}
        className="tecido-exclusao"
        aria-labelledby="titulo-exclusao-tecido"
        aria-describedby="descricao-exclusao-tecido"
        aria-busy={excluindoId !== null}
        onCancel={(event) => {
          if (excluindoId !== null) event.preventDefault();
        }}
        onClose={() => {
          setTecidoSelecionado(null);
          setErroExclusao('');
        }}
      >
        <button
          type="button"
          className="tecido-exclusao__fechar"
          aria-label="Fechar confirmação"
          disabled={excluindoId !== null}
          onClick={() => modalExclusao.current?.close()}
        >
          ×
        </button>
        <h2 id="titulo-exclusao-tecido" className="apenas-leitor">
          Confirmar exclusão
        </h2>
        <p id="descricao-exclusao-tecido">
          Tem certeza que deseja excluir o item do seu estoque? Ele deixará de estar disponível para
          os clientes.
        </p>
        <p className="tecido-exclusao__nome">{tecidoSelecionado?.nome}</p>
        {erroExclusao && (
          <p className="alerta alerta--erro" role="alert">
            {erroExclusao}
          </p>
        )}
        <div className="tecido-exclusao__acoes">
          <button
            type="button"
            disabled={excluindoId !== null}
            onClick={() => modalExclusao.current?.close()}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={excluindoId !== null || !tecidoSelecionado}
            onClick={() => {
              if (tecidoSelecionado) void excluirTecido(tecidoSelecionado);
            }}
          >
            {excluindoId !== null ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </dialog>

      <dialog
        ref={modalCadastro}
        className="modal-cadastro"
        aria-labelledby="titulo-cadastro-tecido"
        onClose={() => {
          setErroCadastro('');
          setEditando(null);
        }}
        onCancel={(event) => {
          if (salvando) event.preventDefault();
        }}
      >
        <div className="modal-cadastro__cabecalho">
          <h2 id="titulo-cadastro-tecido">{editando ? 'Editar Tecido' : 'Cadastrar Tecido'}</h2>

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
          key={editando?.id ?? 'novo'}
          className="form-cadastro"
          onSubmit={salvarTecido}
          aria-busy={salvando}
        >
          <label>
            Nome do tecido
            <input
              type="text"
              name="nome"
              placeholder="Nome"
              required
              defaultValue={editando?.nome ?? ''}
            />
          </label>

          <label>
            Imagem do tecido (estampa)
            <input type="file" name="foto" accept="image/*" />
            {editando && (
              <span className="form-cadastro__ajuda">Deixe vazio para manter a imagem atual.</span>
            )}
          </label>

          <div className={editando ? undefined : 'form-cadastro__linha'}>
            <label>
              Valor por metro R$
              <input
                type="number"
                name="preco_metro"
                placeholder="0,00"
                min="0"
                step="0.01"
                required
                defaultValue={editando?.preco_metro}
              />
            </label>

            {!editando && (
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
            )}
          </div>

          {erroCadastro && (
            <p className="alerta alerta--erro" role="alert">
              {erroCadastro}
            </p>
          )}

          <div className="form-cadastro__acoes">
            <button type="button" onClick={fecharCadastro} disabled={salvando}>
              Cancelar
            </button>

            <button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar Item'}
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
