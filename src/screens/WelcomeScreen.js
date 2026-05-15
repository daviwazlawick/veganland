import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const { language, setLanguage, profile } = useApp();

  function toggleLanguage() {
    setLanguage(language === 'pt' ? 'en' : 'pt');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
        <Text style={styles.langText}>{language === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}</Text>
      </TouchableOpacity>

      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </View>
        <Text style={styles.title}>{t(language, 'welcome.title')}</Text>
        <Text style={styles.tagline}>{t(language, 'welcome.tagline')}</Text>
      </View>

      <View style={styles.subtitleSection}>
        <Text style={styles.subtitle}>{t(language, 'welcome.subtitle')}</Text>
        <View style={styles.features}>
          <FeatureRow icon="📸" text={language === 'pt' ? 'Tire uma foto do produto' : 'Take a photo of the product'} />
          <FeatureRow icon="🤖" text={language === 'pt' ? 'IA analisa os ingredientes' : 'AI analyzes the ingredients'} />
          <FeatureRow icon="✅" text={language === 'pt' ? 'Saiba se é seguro para você' : 'Know if it\'s safe for you'} />
        </View>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <Text style={styles.primaryButtonText}>{t(language, 'welcome.start')}</Text>
        </TouchableOpacity>

        {profile && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.secondaryButtonText}>
              {t(language, 'welcome.already_have_profile')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  langButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  subtitleSection: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  buttonSection: {
    backgroundColor: Colors.white,
    padding: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
