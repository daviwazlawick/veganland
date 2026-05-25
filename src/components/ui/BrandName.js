import React from 'react';
import { Text } from 'react-native';
import Brand from '../../brand';
import { Colors } from '../../constants/colors';

export default function BrandName({ style, prefixColor, suffixColor }) {
  const pre = prefixColor ?? Colors.white;
  const suf = suffixColor ?? Colors.primary;

  if (!Brand.nameSuffix) {
    return <Text style={[style, { color: pre }]}>{Brand.namePrefix}</Text>;
  }

  return (
    <Text style={style}>
      <Text style={{ color: pre }}>{Brand.namePrefix}</Text>
      <Text style={{ color: suf }}>{Brand.nameSuffix}</Text>
    </Text>
  );
}
