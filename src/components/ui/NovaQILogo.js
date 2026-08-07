import React from 'react';
import { View } from 'react-native';
import { Colors } from '../../brand';

// Icon C — a scan ring merging into a leaf tail (ring: brand green, tail: amber accent).
// Geometry mirrors the 100x100 reference viewBox from the design handoff:
//   <circle cx="46" cy="46" r="30" stroke-width="9" />
//   <path d="M62 66 C74 72 82 82 84 90" stroke-width="9" stroke-linecap="round" />
// The curved tail is approximated as two rounded bars sampled from that bezier
// (View-based, no react-native-svg dependency, so this ships via OTA).
export default function NovaQILogo({ size = 52, color = Colors.primary }) {
  const scale = size / 100;
  const sw = 9 * scale;

  const ringD = 69 * scale;
  const ringPos = 11.5 * scale;

  const tailSegments = [
    { x1: 62, y1: 66, x2: 76.75, y2: 77.25 },
    { x1: 76.75, y1: 77.25, x2: 84, y2: 90 },
  ];

  const renderBar = ({ x1, y1, x2, y2 }, key) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) * scale;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const midX = ((x1 + x2) / 2) * scale;
    const midY = ((y1 + y2) / 2) * scale;
    return (
      <View
        key={key}
        style={{
          position: 'absolute',
          width: len,
          height: sw,
          borderRadius: sw / 2,
          backgroundColor: Colors.accent,
          left: midX - len / 2,
          top: midY - sw / 2,
          transform: [{ rotate: `${angle}deg` }],
        }}
      />
    );
  };

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: ringD,
          height: ringD,
          left: ringPos,
          top: ringPos,
          borderRadius: ringD / 2,
          borderWidth: sw,
          borderColor: color,
        }}
      />
      {tailSegments.map((seg, i) => renderBar(seg, `tail${i}`))}
    </View>
  );
}
