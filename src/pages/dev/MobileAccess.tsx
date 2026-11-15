import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { homeDoUsuario, lerSessao } from '../../services/auth.ts';
import './MobileAccess.css';

type RedeInfo = {
  porta: number;
  enderecos: string[];
  urls: string[];
};

type CodigoGerado = {
  codigo: string;
  expiraEm: number;
};

/**
 * Página de apoio ao desenvolvimento (`/mobile`, só em `vite`): mostra os
 * endereços da rede local e transfere a sessão do PC para o celular por um
 * código de uso único, para conferir as telas autenticadas no aparelho.
 */
export function MobileAccess() {
  const { usuario } = useAuth();
  const [rede, setRede] = useState<RedeInfo | null>(null);
  const [erroRede, setErroRede] = useState('');
  const [endereco, setEndereco] = useState('');
  const [sessao] = useState(() => lerSessao());
  const [codigo, setCodigo] = useState<CodigoGerado | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    fetch('/__dev/network', { cache: 'no-store' })
      .then((resposta) => {
        if (!resposta.ok) throw new Error('Rede indisponível.');
        return resposta.json() as Promise<RedeInfo>;
      })
      .then((dados) => {
        if (cancelado) return;
        setRede(dados);
        setEndereco(dados.urls[0] ?? '');
      })
      .catch(() => {
        if (!cancelado) setErroRede('Não foi possível descobrir o endereço da rede local.');
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!codigo) return;

    const intervalo = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [codigo]);

  const gerarCodigo = useCallback(async () => {
    if (!sessao) {
      setErro('Faça login neste computador antes de gerar o QR de sessão.');
      return;
    }

    setGerando(true);
    setErro('');
    setCopiado(false);

    try {
      const resposta = await fetch('/__dev/sessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessao),
      });

      if (!resposta.ok) throw new Error('Sessão recusada.');
      const dados = (await resposta.json()) as CodigoGerado;

      setCodigo(dados);
      setAgora(Date.now());
    } catch {
      setErro('Não foi possível preparar a sessão para o celular.');
      setCodigo(null);
    } finally {
      setGerando(false);
    }
  }, [sessao]);

  const segundosRestantes = codigo ? Math.max(0, Math.ceil((codigo.expiraEm - agora) / 1000)) : 0;
  const urlSessao =
    codigo && endereco && segundosRestantes > 0
      ? `${endereco}/mobile#codigo=${codigo.codigo}`
      : '';

  const copiar = useCallback(async () => {
    if (!urlSessao) return;

    try {
      await navigator.clipboard.writeText(urlSessao);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('O navegador não permitiu copiar. Selecione o link manualmente.');
    }
  }, [urlSessao]);

  return (
    <main className="mobile-acesso">
      <header className="mobile-acesso__cabecalho">
        <h1>Testar no celular</h1>
        <p className="texto-suave">
          Ferramenta de desenvolvimento: abra o sistema no aparelho para conferir o layout e a
          navegação.
        </p>
      </header>

      <section className="cartao mobile-acesso__secao" aria-labelledby="mobile-rede">
        <h2 id="mobile-rede" className="cartao__titulo">
          1. Abrir pelo Wi-Fi
        </h2>
        <p>Conecte o celular na mesma rede Wi-Fi deste computador e abra:</p>

        {erroRede && (
          <div className="alerta alerta--erro" role="alert">
            {erroRede}
          </div>
        )}

        {rede && rede.urls.length > 0 ? (
          <div className="chips">
            {rede.urls.map((url) => (
              <button
                key={url}
                type="button"
                className="chip"
                aria-pressed={url === endereco}
                onClick={() => {
                  setEndereco(url);
                  setCodigo(null);
                  setErro('');
                }}
              >
                {url}
              </button>
            ))}
          </div>
        ) : (
          !erroRede && <p className="texto-suave">Procurando endereço da rede…</p>
        )}

        {endereco && (
          <p className="mobile-acesso__url">
            <a href={endereco} target="_blank" rel="noreferrer">
              {endereco}/
            </a>
          </p>
        )}
      </section>

      <section className="cartao mobile-acesso__secao" aria-labelledby="mobile-sessao">
        <h2 id="mobile-sessao" className="cartao__titulo">
          2. Levar a sessão para o celular
        </h2>
        <p>
          O login com Google não conclui por um IP da rede local. Para conferir as telas de gestão
          e de pedido no aparelho, gere um código de uso único e escaneie o QR:
        </p>

        {usuario && (
          <div className="alerta alerta--sucesso">
            Sessão ativa{usuario.email ? ` como ${usuario.email}` : ''}.{' '}
            <Link to={homeDoUsuario(usuario)}>Ir para a minha área</Link>.
          </div>
        )}

        {!sessao ? (
          <div className="alerta alerta--erro">
            Faça login neste computador primeiro. <Link to="/login">Ir para o login</Link>.
          </div>
        ) : (
          <div className="mobile-acesso__acoes">
            <button
              type="button"
              className="botao"
              onClick={() => void gerarCodigo()}
              disabled={gerando || !endereco}
            >
              {gerando ? 'Gerando…' : 'Gerar QR de sessão'}
            </button>
            {codigo && (
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => void gerarCodigo()}
                disabled={gerando}
              >
                Gerar outro
              </button>
            )}
          </div>
        )}

        {erro && (
          <div className="alerta alerta--erro" role="alert">
            {erro}
          </div>
        )}

        {codigo && urlSessao && (
          <>
            <div className="mobile-acesso__qr">
              <QRCodeSVG
                value={urlSessao}
                size={240}
                level="M"
                bgColor="#ffffff"
                fgColor="#6d4c42"
              />
            </div>
            <p className="mobile-acesso__url">{urlSessao}</p>
            <div className="mobile-acesso__acoes">
              <button type="button" className="botao botao--secundario" onClick={() => void copiar()}>
                {copiado ? 'Copiado' : 'Copiar link'}
              </button>
              <span className="texto-suave">Válido por {segundosRestantes}s, uso único.</span>
            </div>
          </>
        )}

        {codigo && !urlSessao && (
          <div className="alerta alerta--erro" role="alert">
            Código expirado. Gere outro.
          </div>
        )}
      </section>

      <section className="cartao mobile-acesso__secao" aria-labelledby="mobile-dicas">
        <h2 id="mobile-dicas" className="cartao__titulo">
          3. Conferir o layout
        </h2>
        <ul className="mobile-acesso__lista">
          <li>
            Em desenvolvimento aparece uma pílula no canto inferior direito com a largura atual;
            toque para ver o breakpoint e possíveis overflows.
          </li>
          <li>
            Atalho no teclado: <kbd>Shift</kbd> + <kbd>M</kbd>.
          </li>
          <li>
            Para o login Google funcionar direto no aparelho seria preciso HTTPS (túnel) ou port
            forwarding do Chrome via USB; não faz parte desta entrega.
          </li>
        </ul>
      </section>
    </main>
  );
}
