import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function BetaRibbon({ top = 52 }) {
  return (
    <View style={[styles.corner, { top }]} pointerEvents="none">
      <View style={styles.strip}>
        <Text style={styles.label}>BETA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    left: 0,
    width: 82,
    height: 82,
    overflow: 'hidden',
    zIndex: 999,
  },
  strip: {
    position: 'absolute',
    top: 18,
    left: -28,
    width: 100,
    backgroundColor: Colors.accent,
    paddingVertical: 6,
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
