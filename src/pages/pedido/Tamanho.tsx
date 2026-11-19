import { useRef, useState, type ChangeEvent } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import camera from '../../assets/camera.svg';
import upload from '../../assets/upload.svg';
import { PedidoPreview } from '../../components/PedidoPreview.tsx';
import { TotaisPedido } from '../../components/TotaisPedido.tsx';
import {
  tamanhos,
  type ContextoPedido,
  type TamanhoPeca,
} from '../../data/pedido.ts';

const LIMITE_FOTO_BYTES = 5 * 1024 * 1024;

export function Tamanho() {
  const { rascunho, setRascunho, catalogos } = useOutletContext<ContextoPedido>();
  const [erroFoto, setErroFoto] = useState('');
  const entradaFoto = useRef<HTMLInputElement>(null);
  const { fotoReferencia, fotoPrevia } = rascunho.local;
  const modeloCima = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.cima.id_modelo && modelo.parte === 'CIMA') ?? null;
  const modeloBaixo = catalogos.modelos?.find((modelo) =>
    modelo.id === rascunho.baixo.id_modelo && modelo.parte === 'BAIXO') ?? null;
  const tecido = catalogos.tecidos?.find((item) => item.id === rascunho.id_tecido) ?? null;

  // Sem modelo e tecido (acesso direto ou recarga) não há o que dimensionar.
  if (!rascunho.cima.id_modelo || !rascunho.baixo.id_modelo) {
    return <Navigate to="/pedido/novo/modelo" replace />;
  }
  if (!rascunho.id_tecido) {
    return <Navigate to="/pedido/novo/tecido" replace />;
  }
  if (!modeloCima || !modeloBaixo || !tecido) {
    return <Navigate to="/pedido/novo/modelo" replace />;
  }

  function escolherTamanho(peca: 'cima' | 'baixo', tamanho: TamanhoPeca) {
    setRascunho((atual) => ({ ...atual, [peca]: { ...atual[peca], tamanho } }));
  }

  function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      setErroFoto('Escolha um arquivo de imagem.');
      return;
    }
    if (arquivo.size > LIMITE_FOTO_BYTES) {
      setErroFoto('A foto deve ter no máximo 5 MB.');
      return;
    }

    setErroFoto('');
    const leitor = new FileReader();
    leitor.onload = () =>
      setRascunho((atual) => ({
        ...atual,
        local: {
          fotoReferencia: arquivo,
          fotoPrevia: typeof leitor.result === 'string' ? leitor.result : null,
        },
      }));
    leitor.onerror = () => setErroFoto('Não foi possível ler a foto.');
    leitor.readAsDataURL(arquivo);
  }

  function removerFoto() {
    setErroFoto('');
    setRascunho((atual) => ({
      ...atual,
      local: { fotoReferencia: null, fotoPrevia: null },
    }));
  }

  function renderizarTamanhos(titulo: string, peca: 'cima' | 'baixo') {
    return (
      <section className="personalizacao__grupo" aria-label={titulo}>
        <h2 className="personalizacao__grupo-titulo">{titulo}</h2>
        <div className="personalizacao__tamanhos">
          {tamanhos.map((tamanho) => (
            <button
              className="personalizacao__tamanho"
              type="button"
              key={tamanho}
              aria-pressed={rascunho[peca].tamanho === tamanho}
              onClick={() => escolherTamanho(peca, tamanho)}
            >
              {tamanho}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const subtotal =
    Number(modeloCima.valor) + Number(modeloBaixo.valor) + Number(tecido.preco_metro);

  return (
    <div className="personalizacao">
      <PedidoPreview
        modeloCima={modeloCima}
        modeloBaixo={modeloBaixo}
        tecido={tecido}
      />
      <div className="personalizacao__conteudo">
        <h1 className="apenas-leitor">Escolha os tamanhos</h1>
        {renderizarTamanhos('Tamanho do top', 'cima')}
        {renderizarTamanhos('Tamanho da calcinha', 'baixo')}

        <section className="personalizacao__grupo" aria-label="Foto de referência">
          <h2 className="personalizacao__grupo-titulo personalizacao__grupo-titulo--icone">
            <img src={camera} alt="" width={12} height={12} />
            Foto do corpo como referência (opcional)
          </h2>
          {fotoPrevia ? (
            <div className="personalizacao__foto">
              <img
                className="personalizacao__foto-previa"
                src={fotoPrevia}
                alt="Foto de referência"
              />
              <span className="personalizacao__foto-nome">{fotoReferencia?.name}</span>
              <button
                className="botao botao--secundario botao--pequeno"
                type="button"
                onClick={removerFoto}
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              className="personalizacao__upload"
              type="button"
              onClick={() => entradaFoto.current?.click()}
            >
              <img src={upload} alt="" width={14} height={14} />
              Enviar foto do corpo para ajuste de medidas
            </button>
          )}
          <input
            ref={entradaFoto}
            className="apenas-leitor"
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            onChange={aoEscolherFoto}
          />
          {erroFoto && (
            <p className="personalizacao__erro" role="alert">
              {erroFoto}
            </p>
          )}
        </section>

        <section className="personalizacao__grupo" aria-label="Medidas e observações">
          <label className="personalizacao__grupo-titulo" htmlFor="observacoes-caimento">
            Medidas / observações de caimento
          </label>
          <textarea
            id="observacoes-caimento"
            className="personalizacao__observacoes"
            rows={2}
            maxLength={500}
            placeholder="Observações de caimento (ex: prefiro mais justo no top)"
            value={rascunho.observacao}
            onChange={(evento) =>
              setRascunho((atual) => ({ ...atual, observacao: evento.target.value }))
            }
          />
        </section>

        <TotaisPedido
          linhas={[
            { rotulo: 'Subtotal anterior:', valor: subtotal },
            { rotulo: 'Ajustes de tamanho:', valor: 0 },
          ]}
          total={subtotal}
        />
      </div>
    </div>
  );
}
