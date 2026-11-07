import { NavLink, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useState, type FocusEvent, type FormEvent } from 'react';
import { apiJson } from '../../services/api.ts';
import { urlApi } from '../../services/auth.ts';

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
      <Outlet />
    </main>
  );
}

function EstoqueAbas({ onCadastrar }: { onCadastrar: () => void }) {
  return (
    <div className="estoque-categoria__barra">
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
      <button className="botao botao--pequeno estoque-modelos__cadastrar" onClick={onCadastrar}>+ Cadastrar</button>
    </div>
  );
}

export function EstoqueTecidos() {
  return <EstoqueItens tipo="tecidos" />;
}

export function EstoqueAderecos() {
  return <EstoqueItens tipo="aderecos" />;
}

type TipoEstoque = 'tecidos' | 'aderecos';

type TecidoApi = {
  id: string;
  nome: string;
  foto: string | null;
  preco_metro: number;
  quantidade_m: number;
  desabilitado: boolean;
};

type AderecoApi = {
  id: string;
  nome: string;
  foto: string | null;
  preco: number;
  quantidade: number;
  desabilitado: boolean;
};

type ItemApi = TecidoApi | AderecoApi;

type ItemEstoque = {
  id: string;
  nome: string;
  foto: string | null;
  valor: number;
  quantidade: number;
  desabilitado: boolean;
};

type FormItemEstoque = { nome: string; valor: string; quantidade: string };

function adaptarItem(item: ItemApi): ItemEstoque {
  return {
    id: item.id,
    nome: item.nome,
    foto: item.foto,
    valor: 'preco_metro' in item ? item.preco_metro : item.preco,
    quantidade: 'quantidade_m' in item ? item.quantidade_m : item.quantidade,
    desabilitado: item.desabilitado,
  };
}

function EstoqueItens({ tipo }: { tipo: TipoEstoque }) {
  const tecidos = tipo === 'tecidos';
  const endpoint = `/api/gestao/${tipo}`;
  const categoria = tecidos ? 'Tecido' : 'Adereço';
  const campoPreco = tecidos ? 'preco_metro' : 'preco';
  const campoQuantidade = tecidos ? 'quantidade_m' : 'quantidade';
  const unidade = tecidos ? 'Metros atual:' : 'Qtd. atual:';
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<ItemEstoque | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemEstoque | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [form, setForm] = useState<FormItemEstoque>({ nome: '', valor: '', quantidade: '' });
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvandoItem, setSalvandoItem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await request<ItemApi[]>(endpoint);
      setItens(resposta.map(adaptarItem));
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Não foi possível carregar ${categoria.toLowerCase()}s.`);
    } finally {
      setCarregando(false);
    }
  }, [categoria, endpoint]);

  /* oxlint-disable react(set-state-in-effect) -- loading remote data is the effect's purpose */
  useEffect(() => { void carregar(); }, [carregar]);
  /* oxlint-enable react(set-state-in-effect) */

  useEffect(() => {
    if (!fotoPreview.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(fotoPreview);
  }, [fotoPreview]);

  function abrir(item?: ItemEstoque) {
    setErroModal('');
    setErro('');
    setSucesso('');
    setEditando(item ?? null);
    setForm(item
      ? { nome: item.nome, valor: String(item.valor), quantidade: String(item.quantidade) }
      : { nome: '', valor: '', quantidade: '' });
    setFoto(null);
    setFotoPreview(item?.foto ? urlApi(item.foto) : '');
    setModal(true);
  }

  function selecionarFoto(file?: File) {
    if (!file) return;
    setErroModal('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErroModal('A foto deve estar no formato JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErroModal('A foto deve ter no máximo 5 MiB.');
      return;
    }
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroModal('');
    if (!editando && !foto) {
      setErroModal('Escolha uma foto para o item.');
      return;
    }
    setSalvando(true);
    const body = new FormData();
    body.append('nome', form.nome.trim());
    body.append(campoPreco, String(Number(form.valor)));
    if (!editando) body.append(campoQuantidade, String(Number(form.quantidade)));
    if (foto) body.append('foto', foto);
    try {
      await request<ItemApi>(editando ? `${endpoint}/${editando.id}` : endpoint, {
        method: editando ? 'PATCH' : 'POST',
        body,
      });
      setModal(false);
      setSucesso(editando ? `${categoria} atualizado com sucesso.` : `${categoria} cadastrado com sucesso.`);
      await carregar();
    } catch (e) {
      setErroModal(e instanceof Error ? e.message : `Não foi possível salvar ${categoria.toLowerCase()}.`);
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarCampo(
    item: ItemEstoque,
    valor: number,
  ): Promise<boolean> {
    if (salvandoItem || !Number.isFinite(valor)) return false;
    setSalvandoItem(item.id);
    setErro('');
    setSucesso('');
    try {
      const atualizado = await request<ItemApi>(`${endpoint}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [campoPreco]: valor }),
      });
      const itemAtualizado = adaptarItem(atualizado);
      setItens((atuais) => atuais.map((atual) => atual.id === item.id ? itemAtualizado : atual));
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Não foi possível atualizar ${categoria.toLowerCase()}.`);
      return false;
    } finally {
      setSalvandoItem(null);
    }
  }

  async function salvarNumeroDoCard(
    event: FocusEvent<HTMLInputElement>,
    item: ItemEstoque,
    campo: 'valor' | 'quantidade',
  ) {
    const input = event.currentTarget;
    const original = Number(item[campo]);
    const valor = Number(input.value);
    const quantidadeInvalida = campo === 'quantidade' && !tecidos && !Number.isInteger(valor);
    if (input.value.trim() === '' || !Number.isFinite(valor) || valor < 0 || quantidadeInvalida) {
      input.value = String(original);
      setErro(campo === 'valor'
        ? 'O valor deve ser igual ou maior que zero.'
        : tecidos ? 'A metragem não pode ser negativa.' : 'A quantidade de adereços deve ser um número inteiro igual ou maior que zero.');
      return;
    }
    if (valor === original) return;
    const salvo = campo === 'valor'
      ? await atualizarCampo(item, Number(valor.toFixed(2)))
      : await corrigirQuantidade(item, Number(valor.toFixed(2)));
    if (!salvo) input.value = String(original);
  }

  async function enviarMovimentacao(
    item: ItemEstoque,
    body: { tipo: 'entrada' | 'saida'; quantidade: number } | { tipo: 'correcao'; quantidade_atual: number },
  ): Promise<boolean> {
    if (salvandoItem) return false;
    setSalvandoItem(item.id);
    setErro('');
    setSucesso('');
    try {
      await request<unknown>(`/api/gestao/estoque/${tipo}/${item.id}/movimentacoes`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Não foi possível atualizar o estoque de ${item.nome}.`);
      return false;
    } finally {
      setSalvandoItem(null);
    }
  }

  async function corrigirQuantidade(item: ItemEstoque, quantidadeAtual: number) {
    return enviarMovimentacao(item, { tipo: 'correcao', quantidade_atual: quantidadeAtual });
  }

  async function ajustarQuantidade(item: ItemEstoque, direcao: 'entrada' | 'saida') {
    const incremento = 1;
    if (direcao === 'saida' && item.quantidade < incremento) return;
    await enviarMovimentacao(item, { tipo: direcao, quantidade: incremento });
  }

  async function alternarStatus(item: ItemEstoque) {
    if (salvandoItem) return;
    setSalvandoItem(item.id);
    setErro('');
    setSucesso('');
    try {
      const atualizado = await request<ItemApi>(`${endpoint}/${item.id}/habilitado`, {
        method: 'PATCH',
        body: JSON.stringify({ habilitado: item.desabilitado }),
      });
      const itemAtualizado = adaptarItem(atualizado);
      setItens((atuais) => atuais.map((atual) => atual.id === item.id ? itemAtualizado : atual));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível alterar o status.');
    } finally {
      setSalvandoItem(null);
    }
  }

  async function excluir() {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      await request(`${endpoint}/${itemParaExcluir.id}`, { method: 'DELETE' });
      setItens((atuais) => atuais.filter((atual) => atual.id !== itemParaExcluir.id));
      setItemParaExcluir(null);
      setSucesso(`${categoria} excluído com sucesso.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Não foi possível excluir ${categoria.toLowerCase()}.`);
      setItemParaExcluir(null);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <section className="estoque-modelos" aria-label={`${categoria}s cadastrados`}>
      <EstoqueAbas onCadastrar={() => abrir()} />
      {sucesso && <div className="alerta alerta--sucesso" role="status">{sucesso}<button className="estoque-modelos__fechar-erro" onClick={() => setSucesso('')} aria-label="Fechar mensagem">×</button></div>}
      {erro && <div className="alerta alerta--erro" role="alert">{erro}<button className="estoque-modelos__fechar-erro" onClick={() => setErro('')} aria-label="Fechar erro">×</button></div>}
      {carregando ? <p className="texto-suave">Carregando {categoria.toLowerCase()}s…</p> : itens.length === 0 ? <p className="texto-suave">Nenhum item cadastrado.</p> : (
        <div className="estoque-modelos__lista">
          {itens.map((item) => (
            <article className={`modelo-card${item.desabilitado ? ' modelo-card--inativo' : ''}`} key={item.id}>
              {item.foto
                ? <img className="modelo-card__imagem" src={urlApi(item.foto)} alt={item.nome} />
                : <div className="modelo-card__imagem modelo-card__imagem--vazia" aria-label="Sem foto">Sem foto</div>}
              <div className="modelo-card__conteudo">
                <div className="modelo-card__titulo">
                  <strong>{item.nome}</strong>
                  <button type="button" className="modelo-card__editar" onClick={() => abrir(item)} aria-label={`Editar ${item.nome}`} title={`Editar ${item.nome}`}>✎</button>
                  <label className="modelo-card__preco" aria-label={`${tecidos ? 'Preço por metro' : 'Preço'} de ${item.nome}`}>
                    <span>R$</span>
                    <input key={`${item.id}-valor-${item.valor}`} type="number" min="0" step="0.01" defaultValue={Number(item.valor).toFixed(2)} disabled={salvandoItem !== null} onBlur={(event) => void salvarNumeroDoCard(event, item, 'valor')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                  </label>
                </div>
                {!tecidos && <span className="modelo-card__tipo">♟ Adereço</span>}
                <label className="modelo-card__metragem">
                  <span>{unidade}</span>
                  <input key={`${item.id}-quantidade-${item.quantidade}`} className="estoque-item__quantidade" aria-label={`${unidade} ${item.nome}`} type="number" min="0" step={tecidos ? '0.01' : '1'} defaultValue={Number(item.quantidade).toFixed(tecidos ? 2 : 0)} disabled={salvandoItem !== null} onBlur={(event) => void salvarNumeroDoCard(event, item, 'quantidade')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                </label>
                <div className="modelo-card__base">
                  <div className="modelo-card__stepper">
                    <button type="button" aria-label={`Adicionar ${tecidos ? '1 metro ao estoque de' : '1 unidade ao estoque de'} ${item.nome}`} title="Adicionar ao estoque" disabled={salvandoItem !== null} onClick={() => void ajustarQuantidade(item, 'entrada')}>+</button>
                    <button type="button" aria-label={`Retirar ${tecidos ? '1 metro do estoque de' : '1 unidade do estoque de'} ${item.nome}`} title="Retirar do estoque" disabled={salvandoItem !== null || item.quantidade < 1} onClick={() => void ajustarQuantidade(item, 'saida')}>−</button>
                  </div>
                  <div className="modelo-card__acoes">
                    <button type="button" className={`botao botao--pequeno ${item.desabilitado ? 'botao--sucesso' : 'botao--perigo'}`} disabled={salvandoItem !== null} onClick={() => void alternarStatus(item)}>{item.desabilitado ? 'Habilitar' : 'Desabilitar'}</button>
                    <button type="button" className="botao botao--pequeno botao--perigo" onClick={() => setItemParaExcluir(item)}>× Excluir</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {modal && <div className="modelo-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}>
        <form className="modelo-modal" onSubmit={salvar} aria-labelledby="estoque-item-modal-titulo">
          <button className="modelo-modal__x" type="button" onClick={() => setModal(false)} aria-label="Fechar">×</button>
          <h2 id="estoque-item-modal-titulo">{editando ? `Editar ${categoria}` : `Cadastrar ${categoria}`}</h2>
          {erroModal && <div className="alerta alerta--erro modelo-modal__erro" role="alert">{erroModal}</div>}
          <label className="campo"><span className="campo__rotulo">Nome do item</span><input required maxLength={100} value={form.nome} placeholder="Nome" onChange={(event) => setForm({ ...form, nome: event.target.value })} /></label>
          <label className="campo">
            <span className="campo__rotulo">{tecidos ? 'Imagem do item (Estampa):' : 'Imagem do item:'}</span>
            <input required={!editando} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => selecionarFoto(event.target.files?.[0])} />
            <small className="modelo-modal__ajuda">JPG, PNG ou WebP; até 5 MiB.</small>
            {fotoPreview && <img className="modelo-modal__preview" src={fotoPreview} alt={`Prévia de ${categoria.toLowerCase()}`} />}
          </label>
          <div className="modelo-modal__linha">
            <label className="campo"><span className="campo__rotulo">Valor R$:</span><input required type="number" min="0" step="0.01" value={form.valor} placeholder="R$ 0,00" onChange={(event) => setForm({ ...form, valor: event.target.value })} /></label>
            {!editando && <label className="campo"><span className="campo__rotulo">{tecidos ? 'Metros atual:' : 'Quantidade atual:'}</span><input required type="number" min="0" step={tecidos ? '0.01' : '1'} value={form.quantidade} placeholder={tecidos ? 'Ex. 42,20' : 'Ex. 20'} onChange={(event) => setForm({ ...form, quantidade: event.target.value })} /></label>}
          </div>
          <div className="modelo-modal__acoes"><button className="botao botao--secundario" type="button" onClick={() => setModal(false)}>Cancelar</button><button className="botao" disabled={salvando}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar item'}</button></div>
        </form>
      </div>}
      {itemParaExcluir && <div className="estoque-confirmacao__overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !excluindo) setItemParaExcluir(null); }}>
        <section className="estoque-confirmacao" role="alertdialog" aria-modal="true" aria-labelledby="estoque-confirmacao-titulo" aria-describedby="estoque-confirmacao-descricao">
          <button type="button" className="estoque-confirmacao__fechar" aria-label="Fechar" disabled={excluindo} onClick={() => setItemParaExcluir(null)}>×</button>
          <h2 id="estoque-confirmacao-titulo" className="apenas-leitor">Confirmar exclusão</h2>
          <p id="estoque-confirmacao-descricao">Tem certeza que deseja excluir o item do seu estoque? Ele deixará de estar disponível para os clientes.</p>
          <div className="estoque-confirmacao__acoes">
            <button type="button" disabled={excluindo} onClick={() => setItemParaExcluir(null)}>Cancelar</button>
            <button type="button" disabled={excluindo} onClick={() => void excluir()}>{excluindo ? 'Excluindo…' : 'Excluir'}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}

export function EstoqueModelos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [modeloParaExcluir, setModeloParaExcluir] = useState<Modelo | null>(null);
  const [excluindoModelo, setExcluindoModelo] = useState(false);
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

  async function excluir() {
    if (!modeloParaExcluir) return;
    setExcluindoModelo(true);
    try {
      await request(`/api/gestao/modelos/${modeloParaExcluir.id}`, { method: 'DELETE' });
      setModelos((atuais) => atuais.filter((atual) => atual.id !== modeloParaExcluir.id));
      setModeloParaExcluir(null);
      setSucesso('Modelo excluído com sucesso.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o modelo.');
      setModeloParaExcluir(null);
    } finally {
      setExcluindoModelo(false);
    }
  }

  return (
    <section className="estoque-modelos" aria-label="Modelos cadastrados">
      <EstoqueAbas onCadastrar={() => abrir()} />
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
                  <div className="modelo-card__acoes"><button className={`botao botao--pequeno ${modelo.habilitado ? 'botao--perigo' : 'botao--sucesso'}`} onClick={() => void habilitar(modelo)}>{modelo.habilitado ? 'Desabilitar' : 'Habilitar'}</button><button className="botao botao--pequeno botao--perigo" onClick={() => setModeloParaExcluir(modelo)}>× Excluir</button></div>
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
      {modeloParaExcluir && <div className="estoque-confirmacao__overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !excluindoModelo) setModeloParaExcluir(null); }}>
        <section className="estoque-confirmacao" role="alertdialog" aria-modal="true" aria-labelledby="modelo-exclusao-titulo" aria-describedby="modelo-exclusao-descricao">
          <button type="button" className="estoque-confirmacao__fechar" aria-label="Fechar" disabled={excluindoModelo} onClick={() => setModeloParaExcluir(null)}>×</button>
          <h2 id="modelo-exclusao-titulo" className="apenas-leitor">Confirmar exclusão do modelo</h2>
          <p id="modelo-exclusao-descricao">Tem certeza que deseja excluir o item do seu estoque? Ele deixará de estar disponível para os clientes.</p>
          <div className="estoque-confirmacao__acoes">
            <button type="button" disabled={excluindoModelo} onClick={() => setModeloParaExcluir(null)}>Cancelar</button>
            <button type="button" disabled={excluindoModelo} onClick={() => void excluir()}>{excluindoModelo ? 'Excluindo…' : 'Excluir'}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}