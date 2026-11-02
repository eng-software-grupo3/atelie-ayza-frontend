import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { homeDoUsuario } from '../../services/auth.ts';
import assinaturaCabecalho from '../../assets/home/assinatura-1.svg';
import assinaturaSecao from '../../assets/home/assinatura-2.svg';
import retrato from '../../assets/home/ayza.png';
import iconeInstagram from '../../assets/home/icone-instagram.svg';
import iconeLocalizacao from '../../assets/home/icone-localizacao.svg';
import iconeWhatsapp from '../../assets/home/icone-whatsapp.svg';
import marca from '../../assets/home/marca.png';

export function Home() {
  const { usuario, carregando } = useAuth();
  const autenticado = !carregando && usuario;

  return (
    <div className="app-frame app-frame--home">
      <header className="home-header">
        <Link className="home-header__marca" to="/" aria-label="Ateliê Ayza — início">
          <img className="home-header__desenho" src={marca} alt="" />
          <img className="home-header__assinatura" src={assinaturaCabecalho} alt="" />
          <span className="home-header__ateliê">ATELIÊ</span>
        </Link>

        <Link className="home-header__login" to={autenticado ? homeDoUsuario(usuario) : '/login'}>
          {autenticado ? 'Minha área' : 'Login'}
        </Link>
      </header>

      <main className="home">
        <section className="home__sobre" aria-labelledby="home-sobre">
          <h1 className="home__titulo" id="home-sobre">
            Me conheça mais de perto
          </h1>

          <div className="home__apresentacao">
            <div className="home__retrato">
              <img src={retrato} alt="Ayza Silva sentada em um sofá" />
            </div>

            <div className="home__bio">
              <p>
                Ayza Silva, 33 anos, mãe da “Larinha”, proprietária costureira, designer, artista.
              </p>
              <p>
                Com criatividade, busca dar vida às ideias mais íntimas de suas clientes, seja em um
                simples biquíni até elaborados traços de personalidade embutidos em argolas, malhas
                e cores vibrantes.
              </p>
            </div>
          </div>
        </section>

        <section className="home__atelie" aria-labelledby="home-atelie">
          <div className="home__atelie-marca" aria-hidden="true">
            <img className="home__atelie-desenho" src={marca} alt="" />
            <img className="home__atelie-assinatura" src={assinaturaSecao} alt="" />
            <span className="home__atelie-rotulo">ATELIÊ</span>
          </div>

          <h2 className="home__titulo home__titulo--claro" id="home-atelie">
            Sobre o ateliê
          </h2>

          <p className="home__texto">
            Cada peça nasce de uma conversa, de um desejo e de um olhar atento aos detalhes. No
            Ateliê Ayza, modelos, tecidos e adereços se encontram para vestir a sua personalidade —
            do biquíni mais simples às criações cheias de cor, argolas e malhas vibrantes. É
            costura, é arte e é, acima de tudo, um jeito de contar a sua história.
          </p>
        </section>
      </main>

      <footer className="home__rodape">
        <div className="home__rodape-coluna">
          <h2 className="home__rodape-titulo">Contatos</h2>
          <p className="home__rodape-texto">Nosso horário de atendimento é de Seg. as sext.</p>

          <ul className="home__rodape-lista">
            <li>
              <a className="home__rodape-link" href="https://wa.me/5500000000000">
                <img className="home__rodape-icone" src={iconeWhatsapp} alt="" />
                (00) 00000-0000
              </a>
            </li>
            <li>
              <a className="home__rodape-link" href="https://instagram.com/atelieayza">
                <img className="home__rodape-icone" src={iconeInstagram} alt="" />
                @atelieayza
              </a>
            </li>
          </ul>
        </div>

        <div className="home__rodape-coluna">
          <h2 className="home__rodape-titulo">Localização</h2>
          <p className="home__rodape-texto home__rodape-endereco">
            <img className="home__rodape-icone" src={iconeLocalizacao} alt="" />
            <span>Rua ..., Nº ..., Bairro, Piauí.</span>
          </p>
          <p className="home__rodape-assinatura">Seja bem-vinda!</p>
        </div>
      </footer>
    </div>
  );
}
