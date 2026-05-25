import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import Brand from '../../brand';
import NovaQILogo from './NovaQILogo';

const isNovaQI = Brand.id === 'novaqi';

const ICON_ACCENTS = {
  vegan: Colors.primary,
  vegetarian: Colors.primary,
  pescatarian: '#5C8BA8',
  gluten_free: Colors.accent,
  halal: Colors.forest,
  omnivore: Colors.textLight,
  peanuts: Colors.accent,
  tree_nuts: Colors.accentDark,
  dairy: '#9CB6C8',
  eggs: '#D8C08A',
  gluten: Colors.accent,
  soy: Colors.primary,
  shellfish: Colors.danger,
  fish: '#5C8BA8',
  sesame: Colors.primary,
  corn: '#D7A848',
  sulfites: '#A77C8E',
  mustard: '#C79C35',
  fragrance: '#C993A5',
  essential_oils: '#8AAE7E',
  latex: '#6C8A54',
  nickel: '#A0A0A0',
  lanolin: '#C9B08A',
  formaldehyde: '#8DA9B8',
  parabens: '#A7A0B8',
  sulfates: '#83AFC0',
  dyes: '#B48AC2',
  wool: '#C8BCA8',
  scan: Colors.primary,
  ai: Colors.accent,
  profile: Colors.forest,
  home: Colors.primary,
  settings: Colors.textLight,
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const ICON_MAP = {
  // UI / Navigation
  home:          { lib: 'ion', name: 'home' },
  profile:       { lib: 'ion', name: 'person' },
  settings:      { lib: 'ion', name: 'settings-sharp' },
  scan:          { lib: 'ion', name: 'camera' },
  ai:            { lib: 'ion', name: 'sparkles' },
  // Status
  safe:          { lib: 'ion', name: 'shield-checkmark' },
  caution:       { lib: 'ion', name: 'warning' },
  danger:        { lib: 'ion', name: 'close-circle' },
  // Diets
  vegan:         { lib: 'mci', name: 'sprout' },
  vegetarian:    { lib: 'mci', name: 'carrot' },
  pescatarian:   { lib: 'mci', name: 'fish' },
  gluten_free:   { lib: 'mci', name: 'barley-off' },
  halal:         { lib: 'mci', name: 'food-halal' },
  omnivore:      { lib: 'mci', name: 'silverware-fork-knife' },
  // Food allergies
  peanuts:       { lib: 'mci', name: 'peanut' },
  tree_nuts:     { lib: 'mci', name: 'nut' },
  dairy:         { lib: 'mci', name: 'cow' },
  eggs:          { lib: 'mci', name: 'egg' },
  gluten:        { lib: 'mci', name: 'barley' },
  soy:           { lib: 'mci', name: 'soy-sauce' },
  shellfish:     { lib: 'mci', name: 'fishbowl-outline' },
  fish:          { lib: 'mci', name: 'fish-off' },
  sesame:        { lib: 'mci', name: 'seed' },
  corn:          { lib: 'mci', name: 'corn' },
  sulfites:      { lib: 'mci', name: 'bottle-wine' },
  mustard:       { lib: 'mci', name: 'mortar-pestle' },
  // Cosmetic allergies
  fragrance:     { lib: 'mci', name: 'spray' },
  essential_oils:{ lib: 'mci', name: 'bottle-tonic-plus' },
  latex:         { lib: 'mci', name: 'medical-bag' },
  nickel:        { lib: 'mci', name: 'circle-outline' },
  lanolin:       { lib: 'mci', name: 'sheep' },
  formaldehyde:  { lib: 'mci', name: 'flask' },
  parabens:      { lib: 'mci', name: 'flask-outline' },
  sulfates:      { lib: 'mci', name: 'water' },
  dyes:          { lib: 'mci', name: 'palette' },
  wool:          { lib: 'mci', name: 'sheep' },
};

export default function PremiumIcon({ name = 'vegan', size = 40, color, muted = false }) {
  const accent = color || ICON_ACCENTS[name] || Colors.primary;
  const glyphSize = Math.round(size * 0.68);

  let glyph;
  if (isNovaQI && name === 'scan') {
    glyph = <NovaQILogo size={glyphSize} color={accent} />;
  } else {
    const entry = ICON_MAP[name] || { lib: 'mci', name: 'leaf' };
    glyph = entry.lib === 'ion'
      ? <Ionicons name={entry.name} size={glyphSize} color={accent} />
      : <MaterialCommunityIcons name={entry.name} size={glyphSize} color={accent} />;
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1,
      borderColor: accent + '44',
      backgroundColor: 'rgba(255,255,255,0.52)',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: muted ? 0.45 : 1,
    }}>
      {glyph}
    </View>
  );
}
