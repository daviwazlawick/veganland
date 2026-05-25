import React from 'react';
import { View } from 'react-native';

// Target/radar icon per design spec section 2
// Outer ring r=16, inner ring r=7, center dot r=3, crosshairs with 2px gap from outer ring
export default function NovaQILogo({ size = 52, color = '#E8A020' }) {
  const scale = size / 52;
  const outerD = 32 * scale;
  const innerD = 14 * scale;
  const dotD = 6 * scale;
  const sw = 2.8 * scale;

  // Crosshair: from inner ring edge (r=7) to outer ring edge minus 2px gap (r=14)
  const lineStart = 7 * scale;
  const lineEnd = 14 * scale;
  const lineLen = lineEnd - lineStart;
  const half = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: outerD, height: outerD,
        borderRadius: outerD / 2, borderWidth: sw, borderColor: color,
      }} />
      <View style={{
        position: 'absolute', width: innerD, height: innerD,
        borderRadius: innerD / 2, borderWidth: sw, borderColor: color,
      }} />
      <View style={{
        position: 'absolute', width: dotD, height: dotD,
        borderRadius: dotD / 2, backgroundColor: color,
      }} />
      {/* top */}
      <View style={{
        position: 'absolute', width: sw, height: lineLen,
        backgroundColor: color, borderRadius: sw / 2,
        top: half - lineEnd,
      }} />
      {/* bottom */}
      <View style={{
        position: 'absolute', width: sw, height: lineLen,
        backgroundColor: color, borderRadius: sw / 2,
        top: half + lineStart,
      }} />
      {/* left */}
      <View style={{
        position: 'absolute', height: sw, width: lineLen,
        backgroundColor: color, borderRadius: sw / 2,
        left: half - lineEnd,
      }} />
      {/* right */}
      <View style={{
        position: 'absolute', height: sw, width: lineLen,
        backgroundColor: color, borderRadius: sw / 2,
        left: half + lineStart,
      }} />
    </View>
  );
}
