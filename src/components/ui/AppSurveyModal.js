import React, { useState, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, ScrollView,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { t } from '../../i18n';
import { Ionicons } from '@expo/vector-icons';

export default function AppSurveyModal({ visible, language, token, onDone, onSkip, onSubmit }) {
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState('form'); // 'form' | 'sending' | 'thanks'
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    setError(null);
    setPhase('sending');
    try {
      await onSubmit(trimmed);
      setPhase('thanks');
    } catch (e) {
      setError(e?.message || 'Error');
      setPhase('form');
    }
  }

  function handleClose() {
    setMessage('');
    setPhase('form');
    setError(null);
  }

  function handleSkip() {
    handleClose();
    onSkip();
  }

  function handleDone() {
    handleClose();
    onDone();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kav}
          >
            <View style={styles.card}>
              {phase === 'thanks' ? (
                <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                  <Ionicons name="heart" size={44} color={Colors.primary} style={styles.emoji} />
                  <Text style={styles.title}>{t(language, 'app_survey.thanks_title')}</Text>
                  <Text style={styles.bodyText}>{t(language, 'app_survey.thanks_body')}</Text>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleDone} activeOpacity={0.85}>
                    <Text style={styles.submitLabel}>OK</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.emoji}>🙏</Text>
                  <Text style={styles.title}>{t(language, 'app_survey.title')}</Text>
                  <Text style={styles.bodyText}>{t(language, 'app_survey.body')}</Text>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t(language, 'app_survey.placeholder')}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={2000}
                    editable={phase === 'form'}
                    returnKeyType="default"
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <TouchableOpacity
                    style={[styles.submitBtn, !message.trim() && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={phase === 'sending'}
                  >
                    {phase === 'sending'
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.submitLabel}>{t(language, 'app_survey.submit')}</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                    <Text style={styles.skipLabel}>{t(language, 'app_survey.skip')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  kav: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  body: {
    padding: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryDark,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 26,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.dangerDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
