// screens/LibraryScreen.tsx
import React, { useState, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from '../components/Icon';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FONTS } from '../theme/constants';
import { useLibraryStore, Book, BookParagraph, BookSection } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useDictionaryStore } from '../store/dictionaryStore';
import { useT } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { parseEpub } from '../services/epubParser';
import { parseFb2, parseFb2Text } from '../services/fb2Parser';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { extractSections } from '../utils/sections';
import { langName } from '../utils/languages';
import { buildBookDictionary } from '../services/bookDictionaryService';
import LanguagePicker from '../components/LanguagePicker';
import ProgressBar from '../components/ProgressBar';
import { neuRaised, neuInset, neuPrimary, neuCircle, neuShadowPad, screenBg } from '../theme/neu';
import OpenModeModal from '../components/OpenModeModal';
import SpeedVariantModal from '../components/SpeedVariantModal';
import AppSettingsModal from '../components/AppSettingsModal';
import SupportButton from '../components/SupportButton';

interface Draft {
  title: string;
  author?: string;
  format: 'epub' | 'txt' | 'fb2' | 'pdf';
  uri: string;
  pdfUri?: string;
  language: string;
  targetLang: string;
  paragraphs: BookParagraph[];
  sections: BookSection[];
}

function buildParagraphs(text: string): BookParagraph[] {
  return splitIntoSentences(text).map((sentence, index) => ({
    index,
    original: sentence,
  }));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function LibraryScreen({ onSelectBook }: { onSelectBook?: (bookId: string) => void }) {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const a = useAdaptive();
  const t = useT();
  const books = useLibraryStore((s) => s.books);
  const addBook = useLibraryStore((s) => s.addBook);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const importEntries = useDictionaryStore((s) => s.importEntries);
  const dictEntries = useDictionaryStore((s) => s.entries);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const styles = useMemo(() => makeStyles(a), [a]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [targetPickerVisible, setTargetPickerVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');
  const [modeBookId, setModeBookId] = useState<string | null>(null);
  const [speedVariantBookId, setSpeedVariantBookId] = useState<string | null>(null);
  const flatListRef = useRef<ScrollView>(null);
  const defaultTarget = useSettingsStore((s) => s.targetLang);
  const route = useRoute<any>();
  const openSearch = () => setSearchOpen(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      // В обычном режиме шапка скрыта: активный таб и так показывает раздел,
      // а кнопки поиска/настроек/поддержки уже есть в теле экрана (libHead).
      // В режиме выбора книги (onSelectBook) шапка нужна — с заголовком «Select book».
      headerShown: !!onSelectBook,
      title: onSelectBook ? t('Select book') : '',
      headerRight: undefined,
    });
  }, [navigation, searchOpen, theme.primaryText, onSelectBook]);

  useLayoutEffect(() => {
    if (route.params?.search) setSearchOpen(true);
  }, [route.params]);

  const processTxtText = (text: string, name: string) => {
    setProgress(0.95);
    const paragraphs = buildParagraphs(text);
    setProgress(1);
    if (paragraphs.length === 0) {
      Alert.alert(t('Empty'), t('Could not extract text from this file.'));
      return;
    }
    setDraft({
      title: cleanTitle(name),
      format: 'txt',
      uri: name,
      language: 'en',
      targetLang: defaultTarget,
      paragraphs,
      sections: extractSections(paragraphs),
    });
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/epub+zip',
          'application/x-fictionbook',
          'application/pdf',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const lower = asset.name.toLowerCase();
      const format: 'epub' | 'txt' | 'fb2' | 'pdf' = lower.endsWith('.txt')
        ? 'txt'
        : lower.endsWith('.fb2')
        ? 'fb2'
        : lower.endsWith('.pdf')
        ? 'pdf'
        : 'epub';

      setLoading(true);
      setProgress(0.02);

      // PDF: сохраняем как есть, без извлечения текста
      if (format === 'pdf') {
        setProgress(1);
        setDraft({
          title: cleanTitle(asset.name),
          format: 'pdf',
          uri: asset.uri,
          pdfUri: asset.uri,
          language: 'en',
          targetLang: defaultTarget,
          paragraphs: [],
          sections: [],
        });
        return;
      }
      let parsed: { text: string; title?: string; author?: string };
      if (format === 'epub') {
        parsed = await parseEpub(asset.uri, setProgress);
      } else if (format === 'fb2') {
        parsed = await parseFb2(asset.uri, setProgress);
      } else {
        parsed = await (async () => {
          const raw = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'utf8',
          });
          const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
          return { text, title: asset.name.replace(/\.txt$/i, '') };
        })();
      }
      setProgress(0.95);
      const paragraphs = buildParagraphs(parsed.text);
      const sections = extractSections(paragraphs);
      setProgress(1);
      if (paragraphs.length === 0) {
        Alert.alert(t('Empty'), t('Could not extract text from this file.'));
        return;
      }
      setDraft({
        title: cleanTitle(parsed.title || asset.name),
        author: parsed.author,
        format,
        uri: asset.uri,
        language: 'en',
        targetLang: defaultTarget,
        paragraphs,
        sections,
      });
    } catch (e: any) {
      Alert.alert(t('Error reading file'), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const onWebFile = async (e: any) => {
    const file: File | undefined = e.target?.files?.[0];
    if (!file) return;
    setLoading(true);
    setProgress(0.1);
    try {
      const lower = file.name.toLowerCase();
      // PDF в вебе: не парсим текст, сохраняем объект файла как blob-URL
      if (lower.endsWith('.pdf')) {
        const url = URL.createObjectURL(file);
        setProgress(1);
        setDraft({
          title: cleanTitle(file.name),
          format: 'pdf',
          uri: url,
          pdfUri: url,
          language: 'en',
          targetLang: defaultTarget,
          paragraphs: [],
          sections: [],
        });
        return;
      }
      const text = await readFileAsText(file);
      setProgress(0.6);
      if (lower.endsWith('.fb2')) {
        const parsed = parseFb2Text(text);
        const paragraphs = buildParagraphs(parsed.text);
        const sections = extractSections(paragraphs);
        setProgress(1);
        if (paragraphs.length === 0) {
          Alert.alert(t('Empty'), t('Could not extract text from this FB2 file.'));
          return;
        }
        setDraft({
          title: cleanTitle(parsed.title || file.name),
          author: parsed.author,
          format: 'fb2',
          uri: file.name,
          language: 'en',
          targetLang: defaultTarget,
          paragraphs,
          sections,
        });
        return;
      }
      processTxtText(text, file.name);
    } catch (err: any) {
      Alert.alert(t('Error reading file'), err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Отрезает trailing-метку времени из имени файла (напр. "-1786216559343", 10+ цифр),
  // чтобы повторный импорт того же файла не создавал дубль с новым id.
  const cleanTitle = (name: string) =>
    name.replace(/\.(txt|fb2|pdf|epub)$/i, '').replace(/[-_ ]\d{10,}$/, '');

  const makeBookId = (title: string) => `${title.replace(/[^\p{L}\p{N}]+/gu, '_')}_${Date.now().toString(36)}`;

  const onAddPress = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    pickDocument();
  };

  const saveDraft = () => {
    if (!draft) return;
    const book: Book = {
      id: makeBookId(cleanTitle(draft.title)),
      title: cleanTitle(draft.title),
      author: draft.author,
      format: draft.format,
      uri: draft.uri,
      pdfUri: draft.pdfUri,
      language: draft.language,
      targetLang: draft.targetLang,
      paragraphs: draft.paragraphs,
      sections: draft.sections,
      createdAt: Date.now(),
      progress: 0,
      lastPosition: 0,
      bookmarks: [],
    };
    addBook(book);
    setDraft(null);
  };

  const importBookDict = async () => {
    if (!draft) return;
    setImporting(true);
    setImportProgress(0);
    try {
      const list = await buildBookDictionary(
        draft.paragraphs,
        draft.language,
        draft.targetLang,
        { bookId: makeBookId(cleanTitle(draft.title)), onProgress: setImportProgress },
      );
      importEntries(list);
      Alert.alert(t('Done'), t('Dictionary added from «{title}»: {n} words.').replace(/\{title\}/g, draft.title).replace(/\{n\}/g, String(list.length)));
    } catch (e: any) {
      Alert.alert(t('Error importing dictionary'), e?.message ?? String(e));
    } finally {
      setImporting(false);
    }
  };

  const openReader = (bookId: string) => {
    if (onSelectBook) {
      onSelectBook(bookId);
      return;
    }
    // вместо прямого перехода — попап выбора режима
    setModeBookId(bookId);
  };

  const handleModeSelect = (mode: 'read' | 'dual' | 'speed') => {
    const id = modeBookId;
    setModeBookId(null);
    if (!id) return;
    if (mode === 'speed') {
      setSpeedVariantBookId(id); // второй попап выбора варианта
      return;
    }
    navigation.navigate('Reader', { bookId: id, mode });
  };

  const handleSpeedVariant = (variant: 'rsvp' | 'ticker') => {
    const id = speedVariantBookId;
    setSpeedVariantBookId(null);
    if (!id) return;
    navigation.navigate('SpeedReading', { bookId: id, variant });
  };

  const coverColor = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return `hsl(${h}, 45%, 38%)`;
  };

  const visibleBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = books.filter((b) =>
      q ? (b.title + ' ' + (b.author ?? '')).toLowerCase().includes(q) : true,
    );
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [books, search, sortBy]);

  return (
    <View style={[styles.container, { ...screenBg(theme), padding: a.pad }]}>
      {/* Хедер библиотеки: объёмные кнопки поиска и настроек */}
      <View style={styles.libHead}>
        <TouchableOpacity style={[neuCircle(theme, a.icon(40)), { padding: 0 }]} onPress={openSearch}>
          <Icon name="search" size={a.icon(20)} color={theme.primaryText} />
        </TouchableOpacity>
        {!onSelectBook && (
          <TouchableOpacity style={[neuCircle(theme, a.icon(40)), { padding: 0 }]} onPress={() => setSettingsOpen(true)}>
            <Icon name="settings" size={a.icon(20)} color={theme.primaryText} />
          </TouchableOpacity>
        )}
        <SupportButton size={a.icon(40)} iconSize={a.icon(20)} />
      </View>
      {loading && (
        <View style={[styles.progressCard, neuRaised(theme, a.radius)]}>
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>{t('Reading file…')} {Math.round(progress * 100)}%</Text>
          <ProgressBar progress={progress} />
        </View>
      )}

      <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)}>
        {draft && (
        <TouchableOpacity style={styles.draftBackdrop} activeOpacity={1} onPress={() => setDraft(null)}>
          <View style={styles.draftCenter}>
            <View style={[styles.draftCard, neuRaised(theme, a.radius)]}>
              <Text style={[styles.draftTitle, { color: theme.primaryText }]}>{draft.title}</Text>
          <Text style={[styles.draftMeta, { color: theme.secondaryText }]}>
            {draft.format.toUpperCase()} · {draft.paragraphs.length} {t('sentences')}
          </Text>

          <Text style={[styles.label, { color: theme.secondaryText }]}>{t('Original language:')}</Text>
          <TouchableOpacity style={[styles.langButton, neuInset(theme, a.radius), { borderWidth: 0 }]} onPress={() => setPickerVisible(true)}>
            <Text style={[styles.langButtonText, { color: theme.primaryText }]}>{langName(draft.language)}</Text>
            <Text style={[styles.langArrow, { color: theme.secondaryText }]}>▾</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.secondaryText, marginTop: a.gap }]}>{t('Translation language:')}</Text>
          <TouchableOpacity style={[styles.langButton, neuInset(theme, a.radius), { borderWidth: 0 }]} onPress={() => setTargetPickerVisible(true)}>
            <Text style={[styles.langButtonText, { color: theme.primaryText }]}>{langName(draft.targetLang)}</Text>
            <Text style={[styles.langArrow, { color: theme.secondaryText }]}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importBtn, neuInset(theme, a.radius), { borderWidth: 0 }]}
            disabled={importing}
            onPress={importBookDict}
          >
            <Text style={[styles.importText, { color: theme.primary }]}>
              {importing ? t('Importing dictionary…') : t('Import book dictionary (all words)')}
            </Text>
          </TouchableOpacity>
          {importing && (
            <View style={{ marginTop: 8 }}>
              <ProgressBar progress={importProgress} />
            </View>
          )}

          <View style={styles.draftActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDraft(null)}>
              <Text style={[styles.cancelText, { color: theme.secondaryText }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, neuPrimary(theme, a.radius)]} onPress={saveDraft}>
              <Text style={styles.saveText}>{t('Save')}</Text>
            </TouchableOpacity>
          </View>
            </View>
          </View>
        </TouchableOpacity>
        )}

        <LanguagePicker
          visible={pickerVisible}
          value={draft?.language ?? 'auto'}
          allowAuto
          onSelect={(code) => draft && setDraft({ ...draft, language: code })}
          onClose={() => setPickerVisible(false)}
        />

        <LanguagePicker
          visible={targetPickerVisible}
          value={draft?.targetLang ?? defaultTarget}
          allowAuto={false}
          onSelect={(code) => draft && setDraft({ ...draft, targetLang: code })}
          onClose={() => setTargetPickerVisible(false)}
        />
      </Modal>

      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSearchOpen(false)}>
          <View style={[styles.searchPop, neuInset(theme, a.radius)]}>
            <View style={[styles.searchBar, neuInset(theme, a.radius), { borderWidth: 0 }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.primaryText }]}
                value={search}
                onChangeText={setSearch}
                placeholder={t('Search library')}
                placeholderTextColor={theme.secondaryText}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setSearch(''); setSearchOpen(false); }}>
                <Text style={[styles.searchClose, { color: theme.secondaryText }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        ref={flatListRef as any}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.list,
          a.columns > 1 && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
        ]}
      >
        {visibleBooks.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>{t('Library is empty. Upload your first book.')}</Text>
        ) : (
          visibleBooks.map((item) => {
            const wordCount = dictEntries.filter((e) => e.bookId === item.id).length;
            const isPressed = pressedId === item.id;
            return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.bookRow,
              neuRaised(theme, a.radius),
              a.columns > 1 && { width: '48%' },
              { zIndex: isPressed ? 20 : 1 },
              isPressed && { elevation: 12 },
            ]}
            onPressIn={() => setPressedId(item.id)}
            onPressOut={() => setPressedId(null)}
            onPress={() => openReader(item.id)}
          >
            <View style={[styles.cover, { backgroundColor: coverColor(item.title) }]}>
              <Text style={styles.coverText}>{(item.title || '?').trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, flexShrink: 1, marginLeft: Math.round(12 * a.scale), minWidth: 0 }}>
              <Text style={[styles.bookTitle, { color: theme.primaryText }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.bookMeta, { color: theme.secondaryText }]} numberOfLines={2}>
                {item.author ? `${item.author} · ` : ''}
                {item.language.toUpperCase()} → {item.targetLang.toUpperCase()} · {item.paragraphs.length} {t('par.')}{wordCount ? ` · ${wordCount} ${t('words')}` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  removeBook(item.id);
                }}
                hitSlop={10}
                style={[neuCircle(theme, a.dim(0.05, 28, 38)), { padding: 0 }]}
              >
                <Icon name="close" size={a.dim(0.03, 16, 22)} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {!onSelectBook && Platform.OS !== 'web' && <NativeAdBanner />}

      {!onSelectBook && (
        <TouchableOpacity
          style={[styles.fab, neuCircle(theme, a.dim(0.12, 32, 62), true)]}
          onPress={onAddPress}
          hitSlop={10}
        >
          <Icon name="plus" size={a.dim(0.045, 20, 32)} color="#fff" emboss />
        </TouchableOpacity>
      )}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub,.fb2,.pdf,text/plain,application/epub+zip,application/x-fictionbook,application/pdf"
          style={{ display: 'none' }}
          onChange={onWebFile}
        />
      )}
      <OpenModeModal
        visible={modeBookId !== null}
        title={modeBookId ? books.find((b) => b.id === modeBookId)?.title ?? '' : ''}
        onSelect={handleModeSelect}
        onClose={() => setModeBookId(null)}
      />
      <SpeedVariantModal
        visible={speedVariantBookId !== null}
        title={speedVariantBookId ? books.find((b) => b.id === speedVariantBookId)?.title ?? '' : ''}
        onSelect={handleSpeedVariant}
        onClose={() => setSpeedVariantBookId(null)}
      />
      <AppSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

// Баннер монтируется только на нативе; нативный модуль грузится динамически,
// чтобы web-сборка (metro/web) не резолвила react-native-google-mobile-ads.
function NativeAdBanner() {
  const [Banner, setBanner] = React.useState<React.ComponentType | null>(null);
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    import('../components/AdBanner').then((m) => {
      if (alive) setBanner(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!Banner) return null;
  return <Banner />;
}

function makeStyles(a: ReturnType<typeof useAdaptive>) {
  const cover = { w: a.dim(0.065, 34, 54), h: a.dim(0.087, 46, 72) };
  return StyleSheet.create({
    container: { flex: 1, paddingTop: a.pad, paddingBottom: 0, width: '100%', maxWidth: a.contentMaxW, alignSelf: 'center' },
    libHead: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginHorizontal: a.pad, marginBottom: a.gap },
    progressCard: { borderRadius: a.radius, padding: a.pad, marginHorizontal: a.pad, marginBottom: a.gap },
    progressText: { marginBottom: 8, fontSize: a.small_fs },
    draftCard: { width: '100%', maxWidth: 420, borderRadius: a.radius, padding: a.pad },
    draftBackdrop: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center', padding: a.pad },
    draftCenter: { width: '100%', maxWidth: 420, alignItems: 'stretch' },
    draftTitle: { fontSize: a.h2, fontFamily: FONTS.bold },
    draftMeta: { marginTop: 4, marginBottom: a.gap, fontSize: a.small_fs },
    label: { marginTop: a.gap * 1.5, marginBottom: a.gap, fontSize: a.small_fs },
    langButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: a.radius,
      paddingVertical: a.tiny ? 8 : 12,
      paddingHorizontal: 14,
      minHeight: a.hit,
    },
    langButtonText: { fontSize: a.body, flexShrink: 1 },
    langArrow: {},
    draftActions: { flexDirection: 'row', marginTop: a.gap * 1.5, gap: 12, flexWrap: 'wrap' },
    importBtn: { marginTop: a.gap, borderRadius: a.radius, paddingVertical: a.tiny ? 9 : 12, paddingHorizontal: 14, alignItems: 'center' },
    importText: { fontSize: a.small_fs, fontFamily: FONTS.bold, textAlign: 'center' },
    cancelBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: a.body },
    saveBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 20, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    saveText: { color: '#fff', fontFamily: FONTS.bold, fontSize: a.body },
    list: { paddingHorizontal: neuShadowPad(), paddingTop: neuShadowPad(), paddingBottom: a.tabBarH + a.pad * 2 + 70 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: a.body },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: a.radius,
      padding: a.pad,
      marginHorizontal: a.pad + 4,
      marginBottom: a.columns > 1 ? 0 : a.gap,
      minWidth: 0,
    },
    cover: { width: cover.w, height: cover.h, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    coverText: { color: '#fff', fontSize: a.fs(24), fontFamily: FONTS.bold },
    bookTitle: { fontSize: a.body, fontFamily: FONTS.bold },
    bookMeta: { marginTop: 4, fontSize: a.small_fs },
    delete: { fontSize: a.h2, paddingHorizontal: 8 },
    rowActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: a.gap },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: a.radius,
      paddingHorizontal: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: '#00000066',
      justifyContent: 'center',
      alignItems: 'center',
      padding: a.modal().backdropPad,
    },
    searchPop: { width: '100%', maxWidth: Math.min(a.width - 24, 520), borderRadius: a.radius, padding: 12 },
    searchInput: { flex: 1, paddingVertical: a.tiny ? 7 : 10, fontSize: a.body, minWidth: 0 },
    searchClose: { fontSize: a.h2, paddingLeft: 8 },
    sortBar: { flexDirection: 'row', borderRadius: a.radius, padding: 3, marginBottom: a.gap },
    sortTab: { flex: 1, paddingVertical: a.tiny ? 6 : 8, borderRadius: Math.max(4, a.radius - 4), alignItems: 'center' },
    sortTabText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    fab: {
      position: 'absolute',
      right: a.pad,
      bottom: a.pad + a.tabBarH,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
