import { NavLink, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useState, type FocusEvent, type FormEvent } from 'react';
import { apiJson } from '../../services/api.ts';

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

const request = apiJson;

const vazio: ModeloForm = { nome: '', parte: 'CIMA', valor: 0, metragem_media_m: 2.5, svg_url: '' };

const categorias = [
  { to: '/gestao/estoque/tecidos', label: 'Tecidos' },
  { to: '/gestao/estoque/aderecos', label: 'Adereços' },
  { to: '/gestao/estoque/modelos', label: 'Modelos' },
];

export function Estoque() {
  return (
    <main className="app-main">
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
      </nav>

      <Outlet />
    </main>
  );
}

/**
 * Subcategorias do estoque.
 *
 * O conteúdo destas telas será implementado em uma etapa futura.
 */
export function EstoqueTecidos() {
  return null;
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
