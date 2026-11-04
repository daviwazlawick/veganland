import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import { font } from '../theme/type';
import { effectiveStatus, STATUS_CONFIG } from '../utils/scanStatus';

const FILTERS = ['ALL', 'NOT_SAFE', 'CAUTION', 'SAFE'];

function dayKey(date) {
  const d = new Date(date);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

export default function HistoryScreen({ navigation }) {
  const { language, profile, scanHistory } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const rows = useMemo(
    () => scanHistory.map(scan => ({ scan, status: effectiveStatus(scan, profile) })),
    [scanHistory, profile],
  );

  const counts = useMemo(() => {
    const c = { ALL: rows.length, SAFE: 0, CAUTION: 0, NOT_SAFE: 0 };
    rows.forEach(r => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = dayKey(Date.now());
    const yesterday = dayKey(Date.now() - 86400000);
    const fmt = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'long' });
    const rel = (n) => { const w = new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' }).format(n, 'day'); return w.charAt(0).toUpperCase() + w.slice(1); };
    const groups = new Map();
    rows
      .filter(r => filter === 'ALL' || r.status === filter)
      .filter(r => !q || String(r.scan.title || r.scan.product_name || '').toLowerCase().includes(q))
      .forEach(r => {
        const k = dayKey(r.scan.date);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      });
    return [...groups.entries()].map(([k, data]) => ({
      title: k === today ? rel(0)
        : k === yesterday ? rel(-1)
        : k ? fmt.format(new Date(`${k}T12:00:00`)) : '',
      data,
    }));
  }, [rows, query, filter, language]);

  const filterLabel = (f) => {
    const w = f === 'ALL' ? t(language, 'home.filter_all') : t(language, STATUS_CONFIG[f].labelKey);
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.head}>
        <Text style={s.title}>{t(language, 'home.history_title')}</Text>

        {rows.length > 0 && (
          <>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t(language, 'home.history_search')}
                placeholderTextColor={Colors.textMuted}
                style={s.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button">
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.filters} accessibilityRole="tablist">
              {FILTERS.map(f => {
                const active = filter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[s.filter, active && s.filterActive]}
                    activeOpacity={0.75}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    {f !== 'ALL' && <View style={[s.dot, { backgroundColor: STATUS_CONFIG[f].strip }]} />}
                    <Text style={[s.filterText, active && s.filterTextActive]} numberOfLines={1}>
                      {filterLabel(f)} {counts[f]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{t(language, 'home.empty_title')}</Text>
          <Text style={s.emptyText}>{t(language, 'home.no_scans')}</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={s.emptyBtnText}>{t(language, 'nutrition.plate_scan_btn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => String(item.scan.id || item.scan.date || i) + i}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={s.noMatch}>{t(language, 'home.history_empty_filter')}</Text>}
          renderSectionHeader={({ section }) => <Text style={s.day}>{section.title}</Text>}
          renderItem={({ item, index, section }) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <TouchableOpacity
                style={[s.row, index === 0 && s.rowFirst, index === section.data.length - 1 && s.rowLast]}
                onPress={() => navigation.navigate('Result', { result: item.scan })}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={[s.mark, { backgroundColor: cfg.strip }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.scan.title || item.scan.product_name}</Text>
                  <Text style={[s.rowStatus, { color: cfg.color }]}>{t(language, cfg.labelKey)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  head: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  title: { fontSize: 34, lineHeight: 38, letterSpacing: -1, color: Colors.text, ...font('display') },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, outlineStyle: 'none', ...font('body') },
  filters: { flexDirection: 'row', gap: 4, backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 4 },
  filter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 4, height: 36, borderRadius: 9,
  },
  filterActive: { backgroundColor: Colors.text },
  filterText: { fontSize: 13, color: Colors.textLight, ...font('bodyBold') },
  filterTextActive: { color: Colors.white },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  day: { fontSize: 14, color: Colors.textMuted, marginTop: 22, marginBottom: 8, ...font('bodyBold') },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingRight: 14, backgroundColor: Colors.card, overflow: 'hidden', borderTopWidth: 1, borderTopColor: Colors.rule || Colors.border },
  rowFirst: { borderTopWidth: 0, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  mark: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  rowTitle: { fontSize: 16, color: Colors.text, ...font('bold') },
  rowStatus: { fontSize: 13, marginTop: 3, ...font('bodyBold') },
  noMatch: { fontSize: 15, color: Colors.textMuted, marginTop: 28, ...font('body') },
  empty: { paddingHorizontal: 20, paddingTop: 28, gap: 8, alignItems: 'flex-start' },
  emptyTitle: { fontSize: 22, color: Colors.text, ...font('heading') },
  emptyText: { fontSize: 15, lineHeight: 22, color: Colors.textLight, ...font('body') },
  emptyBtn: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.forest || Colors.primaryDark, borderRadius: 14, paddingHorizontal: 20, height: 52,
  },
  emptyBtnText: { color: Colors.white, fontSize: 16, ...font('heading') },
});
