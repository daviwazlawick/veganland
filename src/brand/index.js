import veganland from './veganland';
import novaqi from './novaqi';

const brands = { veganland, novaqi };
const brandId = process.env.EXPO_PUBLIC_BRAND || 'veganland';

export const Brand = brands[brandId] || brands.veganland;
export const Colors = Brand.colors;
export const BrandFonts = Brand.fonts || {};

export default Brand;
