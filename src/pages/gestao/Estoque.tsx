import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent as ReactSubmitEvent,
} from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useState, type FocusEvent, type FormEvent } from 'react';

type Modelo = {
  id: string;
  nome: string;
  parte: 'CIMA' | 'BAIXO';
  valor: number;
  metragem_media_m: number;
  svg_url: string;
  habilitado: boolean;
};

type ModeloForm = Omit<Modelo, 'id' | 'habilitado'>;

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message || `Erro ${response.status} ao comunicar com a API.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const vazio: ModeloForm = { nome: '', parte: 'CIMA', valor: 0, metragem_media_m: 2.5, svg_url: '' };

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
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [form, setForm] = useState<ModeloForm>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setModelos(await request<Modelo[]>('/api/gestao/modelos'));
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os modelos.');
    } finally { setCarregando(false); }
  }, []);

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => { void carregar(); }, [carregar]);
  /* oxlint-enable react(set-state-in-effect) */

  function abrir(modelo?: Modelo) {
    setErroModal('');
    setErro('');
    setSucesso('');
    setEditando(modelo ?? null);
    setForm(modelo ? { nome: modelo.nome, parte: modelo.parte, valor: modelo.valor, metragem_media_m: modelo.metragem_media_m, svg_url: modelo.svg_url } : vazio);
    setModal(true);
  }

  async function selecionarImagem(file?: File) {
    if (!file) return;
    setErroModal('');
    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      setForm((atual) => ({ ...atual, svg_url: '' }));
      setErroModal('O arquivo precisa estar no formato SVG. Imagens PNG e JPG não são aceitas.');
      return;
    }
    try {
      const svg = await file.text();
      if (!/<svg[\s>]/i.test(svg)) {
        setForm((atual) => ({ ...atual, svg_url: '' }));
        setErroModal('O arquivo selecionado não contém um SVG válido.');
        return;
      }
      setForm((atual) => ({ ...atual, svg_url: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` }));
    } catch {
      setErroModal('Não foi possível ler o arquivo selecionado. Tente escolher o SVG novamente.');
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroModal('');
    setSucesso('');
    if (!form.svg_url) {
      setErroModal('Escolha uma imagem SVG para o modelo antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      const body = { nome: form.nome.trim(), parte: form.parte, valor: Number(form.valor), metragem_media_m: Number(form.metragem_media_m), svg_url: form.svg_url };
      await request<Modelo>(editando ? `/api/gestao/modelos/${editando.id}` : '/api/gestao/modelos', {
        method: editando ? 'PATCH' : 'POST', body: JSON.stringify(body),
      });
      setModal(false);
      setSucesso(editando ? 'Modelo atualizado com sucesso.' : 'Modelo cadastrado com sucesso.');
      await carregar();
    } catch (e) { setErroModal(e instanceof Error ? e.message : 'Não foi possível salvar o modelo.'); }
    finally { setSalvando(false); }
  }

  async function habilitar(modelo: Modelo) {
    try {
      await request(`/api/gestao/modelos/${modelo.id}/habilitado`, { method: 'PATCH', body: JSON.stringify({ habilitado: !modelo.habilitado }) });
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível alterar o status.'); }
  }

  async function atualizarCampoModelo(
    modelo: Modelo,
    campo: 'valor' | 'metragem_media_m',
    valor: number,
  ): Promise<boolean> {
    if (salvandoModelo || !Number.isFinite(valor)) return false;
    setSalvandoModelo(modelo.id);
    setErro('');
    setSucesso('');
    try {
      const atualizado = await request<Modelo>(`/api/gestao/modelos/${modelo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [campo]: valor }),
      });
      setModelos((atuais) => atuais.map((item) => item.id === atualizado.id ? atualizado : item));
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar o modelo.');
      return false;
    } finally {
      setSalvandoModelo(null);
    }
  }

  async function ajustarMetragem(modelo: Modelo, variacao: number) {
    const atual = Number(modelo.metragem_media_m);
    const proximo = Number((atual + variacao).toFixed(2));
    if (proximo < 0.01) return;
    await atualizarCampoModelo(modelo, 'metragem_media_m', proximo);
  }

  async function salvarNumeroDoCard(
    event: FocusEvent<HTMLInputElement>,
    modelo: Modelo,
    campo: 'valor' | 'metragem_media_m',
  ) {
    const input = event.currentTarget;
    const original = Number(modelo[campo]);
    const valor = Number(input.value);
    const minimo = campo === 'valor' ? 0 : 0.01;
    if (input.value.trim() === '' || !Number.isFinite(valor) || valor < minimo) {
      input.value = String(original);
      setErro(campo === 'valor' ? 'Informe um valor igual ou maior que zero.' : 'A metragem deve ser maior que zero.');
      return;
    }
    if (valor === original) return;
    const salvo = await atualizarCampoModelo(modelo, campo, Number(valor.toFixed(2)));
    if (!salvo) input.value = String(original);
  }

  async function excluir(modelo: Modelo) {
    if (!window.confirm(`Excluir o modelo “${modelo.nome}”?`)) return;
    try { await request(`/api/gestao/modelos/${modelo.id}`, { method: 'DELETE' }); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível excluir o modelo.'); }
  }

  return (
    <section className="estoque-modelos" aria-label="Modelos cadastrados">
      <div className="estoque-modelos__topo">
        <h1 className="secao__titulo">Modelos</h1>
        <button className="botao botao--pequeno estoque-modelos__cadastrar" onClick={() => abrir()}>+ Cadastrar</button>
      </div>
      {sucesso && <div className="alerta alerta--sucesso" role="status">{sucesso}<button className="estoque-modelos__fechar-erro" onClick={() => setSucesso('')} aria-label="Fechar mensagem">×</button></div>}
      {erro && <div className="alerta alerta--erro" role="alert">{erro}<button className="estoque-modelos__fechar-erro" onClick={() => setErro('')} aria-label="Fechar erro">×</button></div>}
      {carregando ? <p className="texto-suave">Carregando modelos…</p> : modelos.length === 0 ? <p className="texto-suave">Nenhum modelo cadastrado.</p> : (
        <div className="estoque-modelos__lista">
          {modelos.map((modelo) => (
            <article className={`modelo-card${modelo.habilitado ? '' : ' modelo-card--inativo'}`} key={modelo.id}>
              <img className="modelo-card__imagem" src={modelo.svg_url} alt={`Modelo ${modelo.nome}`} />
              <div className="modelo-card__conteudo">
                <div className="modelo-card__titulo">
                  <strong>{modelo.nome}</strong>
                  <button type="button" className="modelo-card__editar" onClick={() => abrir(modelo)} aria-label={`Editar nome e imagem de ${modelo.nome}`} title="Editar nome e imagem">✎</button>
                  <label className="modelo-card__preco" aria-label={`Valor unitário de ${modelo.nome}`}>
                    <span>R$</span>
                    <input key={`${modelo.id}-valor-${modelo.valor}`} aria-label={`Valor unitário de ${modelo.nome}`} type="number" min="0" step="0.01" defaultValue={Number(modelo.valor).toFixed(2)} disabled={salvandoModelo !== null} onBlur={(event) => void salvarNumeroDoCard(event, modelo, 'valor')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                  </label>
                </div>
                <span className="modelo-card__tipo">♟ Modelo {modelo.parte === 'CIMA' ? 'Top' : 'Calcinha'}</span>
                <label className="modelo-card__metragem">
                  <span>Metros para a confecção:</span>
                  <input key={`${modelo.id}-metros-${modelo.metragem_media_m}`} aria-label={`Metros para confecção de ${modelo.nome}`} type="number" min="0.01" step="0.01" defaultValue={Number(modelo.metragem_media_m).toFixed(2)} disabled={salvandoModelo !== null} onBlur={(event) => void salvarNumeroDoCard(event, modelo, 'metragem_media_m')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                </label>
                <div className="modelo-card__base">
                  <div className="modelo-card__stepper">
                    <button type="button" aria-label={`Aumentar metragem de ${modelo.nome} em 1 metro`} title="Aumentar 1 metro" disabled={salvandoModelo !== null} onClick={() => void ajustarMetragem(modelo, 1)}>+</button>
                    <button type="button" aria-label={`Diminuir metragem de ${modelo.nome} em 1 metro`} title="Diminuir 1 metro" disabled={salvandoModelo !== null || Number(modelo.metragem_media_m) - 1 < 0.01} onClick={() => void ajustarMetragem(modelo, -1)}>−</button>
                  </div>
                  <div className="modelo-card__acoes"><button className={`botao botao--pequeno ${modelo.habilitado ? 'botao--perigo' : 'botao--sucesso'}`} onClick={() => void habilitar(modelo)}>{modelo.habilitado ? 'Desabilitar' : 'Habilitar'}</button><button className="botao botao--pequeno botao--perigo" onClick={() => void excluir(modelo)}>× Excluir</button></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {modal && <div className="modelo-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}>
        <form className="modelo-modal" onSubmit={salvar} aria-labelledby="modelo-modal-titulo">
          <button className="modelo-modal__x" type="button" onClick={() => setModal(false)} aria-label="Fechar">×</button>
          <h2 id="modelo-modal-titulo">{editando ? 'Editar Modelo' : 'Cadastrar Modelo'}</h2>
          {erroModal && <div className="alerta alerta--erro modelo-modal__erro" role="alert">{erroModal}</div>}
          <label className="campo"><span className="campo__rotulo">Nome do produto</span><input required maxLength={100} value={form.nome} placeholder="Nome" onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
          <label className="campo"><span className="campo__rotulo">Imagem do item (SVG):</span><input required={!form.svg_url} type="file" accept="image/svg+xml,.svg" onChange={(e) => void selecionarImagem(e.target.files?.[0])} /><small className="modelo-modal__ajuda">Selecione um arquivo .svg; PNG e JPG não são aceitos.</small>{form.svg_url && <img className="modelo-modal__preview" src={form.svg_url} alt="Prévia do modelo" />}</label>
          <div className="modelo-modal__linha">
            <label className="campo"><span className="campo__rotulo">Tipo:</span><select value={form.parte} onChange={(e) => setForm({ ...form, parte: e.target.value as ModeloForm['parte'] })}><option value="CIMA">Top</option><option value="BAIXO">Calcinha</option></select></label>
            <label className="campo"><span className="campo__rotulo">Valor Unitário R$:</span><input required type="number" min="0" step="0.10" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></label>
          </div>
          <label className="campo"><span className="campo__rotulo">Metros de tecido para o modelo (m):</span><input required type="number" min="0.01" step="0.01" value={form.metragem_media_m} onChange={(e) => setForm({ ...form, metragem_media_m: Number(e.target.value) })} /></label>
          <div className="modelo-modal__acoes"><button className="botao botao--secundario" type="button" onClick={() => setModal(false)}>Cancelar</button><button className="botao" disabled={salvando}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar Item'}</button></div>
        </form>
      </div>}
    </section>
  );
}