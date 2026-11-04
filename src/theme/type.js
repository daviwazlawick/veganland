import { BrandFonts } from '../brand';

// Peso equivalente quando a marca não tem fonte própria (VeganLand usa a do sistema).
const WEIGHTS = {
  display: '900', heading: '800', headingMed: '700',
  body: '400', bodyMed: '500', bodyBold: '600', bold: '700',
};

// Devolve o estilo de fonte do papel pedido. Com fonte de marca, só a família:
// no Android, fontWeight junto de família customizada troca a fonte pela do sistema.
export function font(role) {
  const family = BrandFonts[role];
  return family ? { fontFamily: family } : { fontWeight: WEIGHTS[role] || '400' };
}
