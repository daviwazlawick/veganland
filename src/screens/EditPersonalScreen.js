import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

export default function EditPersonalScreen({ navigation }) {
  const { language, profile, saveProfile } = useApp();
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUri, setPhotoUri] = useState(profile?.photoUri || null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    await saveProfile({ ...profile, name: name.trim(), bio: bio.trim(), photoUri });
    navigation.goBack();
  }

  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'personal.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.85}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.tapHint}>{t(language, 'personal.tap_to_change')}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'personal.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t(language, 'personal.name_placeholder')}
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'personal.bio')}</Text>
            <TextInput
              style={[styles.input, styles.inputBio]}
              value={bio}
              onChangeText={setBio}
              placeholder={t(language, 'personal.bio_placeholder')}
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
              multiline
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveBtnText}>{t(language, 'personal.save')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  content: { padding: 24, alignItems: 'center', gap: 24, paddingBottom: 120 },
  avatarWrap: { position: 'relative', width: 110, height: 110, marginTop: 8 },
  avatarImage: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: Colors.primary + '60',
  },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.forest,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary + '40',
  },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: Colors.white, fontFamily: 'serif' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  tapHint: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginTop: -8 },
  fieldGroup: { width: '100%', gap: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontWeight: '600', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputBio: { height: 90, textAlignVertical: 'top', paddingTop: 14 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: 'rgba(250,248,244,0.94)',
  },
  saveBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  saveBtnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
});
