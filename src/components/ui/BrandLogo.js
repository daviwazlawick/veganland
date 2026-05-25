import React from 'react';
import { View } from 'react-native';
import Brand from '../../brand';
import { Colors } from '../../constants/colors';
import PremiumIcon from './PremiumIcon';
import NovaQILogo from './NovaQILogo';

const isNovaQI = Brand.id === 'novaqi';

// Renders the brand logo circle — NovaQI target on navy, VeganLand scan icon on primaryBg
export default function BrandLogo({ size = 104 }) {
  const iconSize = Math.round(size * 0.58);

  if (isNovaQI) {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: Colors.navy,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.navyMid,
        shadowColor: Colors.navy,
        shadowOpacity: 0.30,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}>
        <NovaQILogo size={iconSize} color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: Colors.primaryBg,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: Colors.primaryLight,
      shadowColor: Colors.navy,
      shadowOpacity: 0.10,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    }}>
      <PremiumIcon name="scan" size={Math.round(size * 0.52)} color={Colors.primary} />
    </View>
  );
}
