import { Link } from 'react-router-dom';
import { LogoAssinatura } from './LogoAssinatura.tsx';
import { LogoDesenho } from './LogoDesenho.tsx';

type Props = {
  to?: string;
  compacto?: boolean;
  /** Cor do desenho da marca. O padrão vem do CSS (`--cor-logo-desenho`). */
  corDesenho?: string;
  /** Cor da assinatura "Ayza Silva". O padrão vem do CSS (`--cor-logo-assinatura`). */
  corAssinatura?: string;
};

export function Logo({ to = '/', compacto = false, corDesenho, corAssinatura }: Props) {
  const conteudo = (
    <span className={compacto ? 'logo logo--compacto' : 'logo'}>
      <LogoDesenho className="logo__icone" cor={corDesenho} />
      <span className="logo__marca">
        <LogoAssinatura className="logo__assinatura" cor={corAssinatura} />
        <span className="logo__ateliê">ATELIÊ</span>
      </span>
    </span>
  );

  if (!to) {
    return conteudo;
  }

  return (
    <Link className="logo__link" to={to} aria-label="Ateliê Ayza — início">
      {conteudo}
    </Link>
  );
}
