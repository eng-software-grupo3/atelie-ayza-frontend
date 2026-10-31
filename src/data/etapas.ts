export type EtapaSlug = 'modelo' | 'tecido' | 'tamanho' | 'aderecos' | 'resumo' | 'entrega';

export type Etapa = {
  slug: EtapaSlug;
  titulo: string;
  /** Rótulo do botão de avanço, sempre alinhado com a próxima seção. */
  rotuloAcao: string;
};

export const etapas: Etapa[] = [
  { slug: 'modelo', titulo: 'Modelo', rotuloAcao: 'Próximo: Tecido' },
  { slug: 'tecido', titulo: 'Tecido', rotuloAcao: 'Próximo: Tamanho' },
  { slug: 'tamanho', titulo: 'Tamanho', rotuloAcao: 'Próximo: Adereços' },
  { slug: 'aderecos', titulo: 'Adereços', rotuloAcao: 'Ver Resumo' },
  { slug: 'resumo', titulo: 'Resumo', rotuloAcao: 'Seguir para Entrega' },
  { slug: 'entrega', titulo: 'Entrega', rotuloAcao: 'Confirmar Pedido' },
];

export function indiceDaEtapa(slug: EtapaSlug): number {
  return etapas.findIndex((etapa) => etapa.slug === slug);
}

export function etapaPorSlug(slug: string): Etapa | undefined {
  return etapas.find((etapa) => etapa.slug === slug);
}
