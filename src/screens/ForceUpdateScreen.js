import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { BrandName, BrandLogo } from '../components/ui';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';

const isNovaQI = Brand.id === 'novaqi';

export default function ForceUpdateScreen({ storeUrl }) {
  const { language } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <BrandLogo size={100} />
        <BrandName style={styles.appName} prefixColor={Colors.navy} suffixColor={Colors.primary} />

        <View style={styles.card}>
          <Text style={styles.title}>{t(language, 'update.required_title')}</Text>
          <Text style={styles.body}>{t(language, 'update.required_body')}</Text>

          {storeUrl && (
            <TouchableOpacity
              style={[styles.btn, !isNovaQI && styles.btnSkeuo]}
              onPress={() => Linking.openURL(storeUrl)}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText}>{t(language, 'update.go_to_store')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 24 },
  appName: { fontSize: 36, fontWeight: '800', fontFamily: BrandFonts.heading || undefined, letterSpacing: -1 },
  card: {
    width: '100%',
    backgroundColor: Colors.glass,
    borderRadius: 28, padding: 26, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    // elevation + a translucent backgroundColor breaks border-radius
    // clipping on Android — see ProfileSetupScreen.dietCard for detail.
    shadowColor: Colors.navy, shadowOpacity: 0.08, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', fontFamily: BrandFonts.headingMed || undefined },
  body: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  btnSkeuo: { borderBottomWidth: 4, borderBottomColor: Colors.primaryDark },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '900', fontFamily: BrandFonts.heading || undefined },
});
