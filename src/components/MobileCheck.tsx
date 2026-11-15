import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './MobileCheck.css';

const CHAVE_PAINEL = 'atelie.mobileCheck.aberto';
const LIMITE_ELEMENTOS = 6;

type Breakpoint = {
  nome: string;
  faixa: string;
};

type Medidas = {
  largura: number;
  altura: number;
  escala: number;
};

type Overflow = {
  total: number;
  elementos: string[];
};

function breakpointDe(largura: number): Breakpoint {
  if (largura <= 359) return { nome: 'XS', faixa: 'até 359px' };
  if (largura <= 479) return { nome: 'SM', faixa: '360–479px' };
  if (largura <= 767) return { nome: 'MD', faixa: '480–767px' };
  if (largura <= 1099) return { nome: 'LG', faixa: '768–1099px' };
  return { nome: 'XL', faixa: '1100px ou mais' };
}

function descreverElemento(elemento: Element): string {
  const classe =
    typeof elemento.className === 'string'
      ? elemento.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      : '';

  return `${elemento.tagName.toLowerCase()}${elemento.id ? `#${elemento.id}` : ''}${classe ? `.${classe}` : ''}`;
}

function acharOverflow(): Overflow {
  const largura = document.documentElement.clientWidth;
  const elementos: string[] = [];
  const vistos = new Set<string>();
  let total = 0;

  for (const elemento of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    if (elemento.closest('.mobile-check')) continue;

    const retangulo = elemento.getBoundingClientRect();
    if (retangulo.width <= 0 || retangulo.height <= 0) continue;

    const sobra = Math.max(retangulo.right - largura, -retangulo.left);
    if (sobra <= 1) continue;

    total += 1;
    const descricao = descreverElemento(elemento);
    if (elementos.length < LIMITE_ELEMENTOS && !vistos.has(descricao)) {
      vistos.add(descricao);
      elementos.push(descricao);
    }
  }

  return { total, elementos };
}

/**
 * Overlay de verificação de layout, montado apenas no servidor de
 * desenvolvimento (ver `main.tsx`). Não entra no build de produção.
 */
export function MobileCheck() {
  const [aberto, setAberto] = useState(
    () => window.sessionStorage.getItem(CHAVE_PAINEL) === '1',
  );
  const [medidas, setMedidas] = useState<Medidas>(() => ({
    largura: window.innerWidth,
    altura: window.innerHeight,
    escala: window.devicePixelRatio || 1,
  }));
  const [overflow, setOverflow] = useState<Overflow>({ total: 0, elementos: [] });
  // Não persiste: recarregar a página traz a pílula de volta.
  const [oculto, setOculto] = useState(false);
  const agendamento = useRef(0);

  const atualizar = useCallback(() => {
    window.cancelAnimationFrame(agendamento.current);
    agendamento.current = window.requestAnimationFrame(() => {
      setMedidas({
        largura: window.innerWidth,
        altura: window.innerHeight,
        escala: window.devicePixelRatio || 1,
      });
      setOverflow(acharOverflow());
    });
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(CHAVE_PAINEL, aberto ? '1' : '0');
  }, [aberto]);

  useEffect(() => {
    atualizar();

    window.addEventListener('resize', atualizar);
    window.addEventListener('orientationchange', atualizar);

    const observadorTamanho = new ResizeObserver(atualizar);
    observadorTamanho.observe(document.documentElement);

    const observadorDom = new MutationObserver(atualizar);
    observadorDom.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(agendamento.current);
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('orientationchange', atualizar);
      observadorTamanho.disconnect();
      observadorDom.disconnect();
    };
  }, [atualizar]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) return;
      if (evento.key.toLowerCase() !== 'm') return;

      const alvo = evento.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      ) {
        return;
      }

      setOculto(false);
      setAberto((valor) => !valor);
    }

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const breakpoint = breakpointDe(medidas.largura);
  const temOverflow = overflow.total > 0;

  if (oculto) return null;

  return (
    <div className="mobile-check">
      {aberto && (
        <aside className="mobile-check__painel" aria-label="Verificação de layout mobile">
          <header className="mobile-check__topo">
            <strong>Verificação mobile</strong>
            <button
              type="button"
              className="mobile-check__fechar"
              onClick={() => setAberto(false)}
              aria-label="Fechar verificação mobile"
            >
              ×
            </button>
          </header>

          <dl className="mobile-check__medidas">
            <div>
              <dt>Viewport</dt>
              <dd>
                {medidas.largura} × {medidas.altura}px
              </dd>
            </div>
            <div>
              <dt>Breakpoint</dt>
              <dd>
                {breakpoint.nome} <span className="texto-suave">({breakpoint.faixa})</span>
              </dd>
            </div>
            <div>
              <dt>Densidade</dt>
              <dd>{medidas.escala.toFixed(2)}×</dd>
            </div>
          </dl>

          <div
            className={`mobile-check__overflow ${temOverflow ? 'mobile-check__overflow--erro' : ''}`}
            role="status"
          >
            {temOverflow ? (
              <>
                <span>
                  Overflow horizontal: {overflow.total} elemento
                  {overflow.total === 1 ? '' : 's'}
                </span>
                <ul>
                  {overflow.elementos.map((elemento) => (
                    <li key={elemento}>
                      <code>{elemento}</code>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <span>Sem overflow horizontal.</span>
            )}
          </div>

          <p className="mobile-check__dica">
            Toque no botão ou use <kbd>Shift</kbd> + <kbd>M</kbd> para abrir e fechar.
          </p>

          <button
            type="button"
            className="mobile-check__ocultar"
            onClick={() => {
              setAberto(false);
              setOculto(true);
            }}
          >
            Ocultar pílula (recarregue para voltar)
          </button>
        </aside>
      )}

      <button
        type="button"
        className="mobile-check__pivo"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-label="Abrir verificação de layout mobile"
      >
        <span className="mobile-check__largura">{medidas.largura}px</span>
        <span
          className={`mobile-check__status ${temOverflow ? 'mobile-check__status--erro' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/** Monta o overlay fora da árvore do React principal (chamado só em dev). */
export function montarMobileCheck(): void {
  if (document.getElementById('ayza-mobile-check')) return;

  const container = document.createElement('div');
  container.id = 'ayza-mobile-check';
  document.body.appendChild(container);
  createRoot(container).render(<MobileCheck />);
}
