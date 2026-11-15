import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { salvarSessao } from './services/auth.ts';
import './styles/global.css';

const TEMPO_MAXIMO_SESSAO_MS = 3000;

/**
 * No celular, a sessão chega pela página `/mobile`: ela abre com
 * `#codigo=...`, troca o código pela sessão guardada no dev server e continua
 * o fluxo normal já autenticada. Só existe em desenvolvimento.
 */
async function importarSessaoDoCelular(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const codigo = parametros.get('codigo');
  if (!codigo) return;

  const controlador = new AbortController();
  const limite = window.setTimeout(() => controlador.abort(), TEMPO_MAXIMO_SESSAO_MS);

  try {
    const resposta = await fetch(`/__dev/sessao/${encodeURIComponent(codigo)}`, {
      cache: 'no-store',
      signal: controlador.signal,
    });

    if (resposta.ok) {
      const dados = (await resposta.json()) as {
        accessToken?: unknown;
        refreshToken?: unknown;
        expiresAt?: unknown;
      };

      if (typeof dados.accessToken === 'string' && typeof dados.refreshToken === 'string') {
        const expiraEm = typeof dados.expiresAt === 'number' ? dados.expiresAt : 0;
        salvarSessao({
          accessToken: dados.accessToken,
          refreshToken: dados.refreshToken,
          tokenType: 'Bearer',
          expiresIn: Math.max(0, Math.floor((expiraEm - Date.now()) / 1000)),
        });
      }
    }
  } catch {
    // Sem código válido a aplicação segue para o login normalmente.
  } finally {
    window.clearTimeout(limite);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

async function iniciar(): Promise<void> {
  await importarSessaoDoCelular();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );

  if (import.meta.env.DEV) {
    void import('./components/MobileCheck.tsx').then(({ montarMobileCheck }) => {
      montarMobileCheck();
    });
  }
}

void iniciar();
