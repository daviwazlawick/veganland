import React from 'react';
import { View, Image } from 'react-native';
import Brand from '../../brand';
import { Colors } from '../../constants/colors';
import PremiumIcon from './PremiumIcon';

const isNovaQI = Brand.id === 'novaqi';

export default function BrandLogo({ size = 104 }) {
  if (isNovaQI) {
    return (
      <Image
        source={require('../../../assets/novaqi/novaqi-icon.svg')}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
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
