/**
 * Verifica classes do `src/styles/global.css` que não são usadas em `src/`.
 *
 * O objetivo é evitar que seletores de telas antigas fiquem para trás: eles
 * confundem quem for mexer no CSS depois (foi o caso do `tecido-card` x
 * `modelo-card` no estoque).
 *
 * Uso:
 *   npm run css:check
 *
 * Sai com código 1 quando encontra classe sem uso, para servir de porteiro no
 * CI. Classes montadas em tempo de execução (template strings) precisam estar
 * na lista `CLASSES_DINAMICAS` abaixo. Classes usadas só em arquivos que não
 * existem nesta branch vão em `CLASSES_EXTERNAS`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const CSS = join(RAIZ, 'src', 'styles', 'global.css');
const FONTES = join(RAIZ, 'src');

const EXTENSOES = /\.(tsx?|jsx?)$/;

/**
 * Classes que só existem no HTML final, montadas por interpolação.
 * `motivo` aparece no relatório para lembrar por que a exceção existe.
 */
const CLASSES_DINAMICAS = [
  {
    padrao: /^agenda-dia--(bloqueada|com_entrega)$/,
    motivo: 'montadas em Agenda.tsx com `agenda-dia--${estado}`',
  },
];

/**
 * Classes usadas só por arquivos que não existem nesta branch. O `global.css`
 * é o mesmo em todas as branches, então apagar estas regras aqui quebraria a
 * página que as usa na `configMobile`.
 */
const CLASSES_EXTERNAS = [
  {
    padrao: /^cartao__titulo$/,
    motivo: 'usada em src/pages/dev/MobileAccess.tsx (branch configMobile)',
  },
  {
    padrao: /^chips?$/,
    motivo: 'usadas em src/pages/dev/MobileAccess.tsx (branch configMobile)',
  },
];

function listarFontes(diretorio) {
  const arquivos = [];

  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);

    if (entrada.isDirectory()) arquivos.push(...listarFontes(caminho));
    else if (EXTENSOES.test(entrada.name)) arquivos.push(caminho);
  }

  return arquivos;
}

function classesDoCss(texto) {
  const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const semUrls = semComentarios.replace(/url\([^)]*\)/g, ' ');
  const classes = new Set();

  // Aceita acentos nos nomes (ex.: `logo__ateliê`).
  for (const achado of semUrls.matchAll(/\.(-?[_a-zA-ZÀ-ÿ][\wÀ-ÿ-]*)/g)) classes.add(achado[1]);

  return [...classes].sort();
}

function estaEmUso(classe, fonte) {
  // Evita que `.lista` seja considerada usada só porque existe `.lista__item`.
  const escapada = classe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const padrao = new RegExp(`(?<![\\wÀ-ÿ-])${escapada}(?![\\wÀ-ÿ-])`);
  return padrao.test(fonte);
}

function ehExcecao(classe) {
  return [...CLASSES_DINAMICAS, ...CLASSES_EXTERNAS].some(({ padrao }) => padrao.test(classe));
}

const css = readFileSync(CSS, 'utf8');
const fontes = listarFontes(FONTES);
const fonte = fontes.map((arquivo) => readFileSync(arquivo, 'utf8')).join('\n');

const classes = classesDoCss(css);
const semUso = classes.filter((classe) => !ehExcecao(classe) && !estaEmUso(classe, fonte));

const caminhoCss = relative(RAIZ, CSS).replaceAll('\\', '/');
console.log(`${caminhoCss}: ${classes.length} classes, ${fontes.length} arquivos varridos.`);

if (semUso.length === 0) {
  console.log('Nenhuma classe sem uso. 👌');
  process.exit(0);
}

console.error(`\n${semUso.length} classe(s) sem uso em src/:\n`);
for (const classe of semUso) console.error(`  .${classe}`);
console.error(
  '\nRemova os seletores mortos ou registre a classe em CLASSES_DINAMICAS' +
    ' (montada por template string) ou CLASSES_EXTERNAS (usada em outra branch),' +
    ' em scripts/verificar-css.mjs.',
);
process.exit(1);
