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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import ModalSheet from '../components/ModalSheet';
import Screen from '../components/Screen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FONTS } from '../theme/constants';
import { useLibraryStore, Book, BookParagraph, BookSection } from '../store/libraryStore';
import { BookList } from '../components/BookList';
import { useSettingsStore } from '../store/settingsStore';
import { useDictionaryStore } from '../store/dictionaryStore';
import { useT } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { importBook } from '../services/bookImport';
import { parseEpub } from '../services/epubParser';
import { parseFb2, parseFb2Text } from '../services/fb2Parser';
import { parseDocx } from '../services/docxParser';
import { parseOdt } from '../services/odtParser';
import { parseRtf } from '../services/rtfParser';
import { parseHtml } from '../services/htmlParser';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { extractSections } from '../utils/sections';
import { langName } from '../utils/languages';
import { buildBookDictionary } from '../services/bookDictionaryService';
import LanguagePicker from '../components/LanguagePicker';
import ProgressBar from '../components/ProgressBar';
import IconButton from '../components/ui/IconButton';
import { neuShadowPad, screenBg, metal } from '../theme/neu';
import OpenModeModal from '../components/OpenModeModal';
import AppSettingsModal from '../components/AppSettingsModal';
import SupportButton from '../components/SupportButton';


interface Draft {
  title: string;
  author?: string;
  format: 'epub' | 'txt' | 'fb2' | 'docx' | 'odt' | 'rtf' | 'html';
  uri: string;
  language: string;
  targetLang: string;
  paragraphs: BookParagraph[];
  sections: BookSection[];
  cover?: string;
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
  // O(1) lookup вместо O(books × dictEntries) filter на каждом рендере (поиск/pressedId).
  const bookWordCount = useMemo(
    () => dictEntries.reduce((m, e) => { if (e.bookId) m.set(e.bookId, (m.get(e.bookId) || 0) + 1); return m; }, new Map<string, number>()),
    [dictEntries],
  );

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const styles = useMemo(() => makeStyles(a, theme), [a, theme]);
  // FAB «+» крупнее стандартных круглых кнопок хедера, чтобы тапалось уверенно.
  const fabSize = Math.round(a.fab() * 1.15);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [targetPickerVisible, setTargetPickerVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');
  const [modeBookId, setModeBookId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const flatListRef = useRef<ScrollView>(null);
  const defaultTarget = useSettingsStore((s) => s.targetLang);
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
  }, [navigation, theme.primaryText, onSelectBook]);

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
      language: 'auto',
      targetLang: 'uk',
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
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const lower = asset.name.toLowerCase();
      const format: 'epub' | 'txt' | 'fb2' | 'docx' | 'odt' | 'rtf' | 'html' = lower.endsWith('.txt')
        ? 'txt'
        : lower.endsWith('.fb2')
        ? 'fb2'
        : lower.endsWith('.docx')
        ? 'docx'
        : lower.endsWith('.odt')
        ? 'odt'
        : lower.endsWith('.rtf')
        ? 'rtf'
        : lower.endsWith('.html') || lower.endsWith('.htm')
        ? 'html'
        : 'epub';

      setLoading(true);
      setProgress(0.02);

      let parsed: { text: string; title?: string; author?: string; cover?: string };
      if (format === 'epub') {
        parsed = await parseEpub(asset.uri, setProgress);
      } else if (format === 'fb2') {
        parsed = await parseFb2(asset.uri, setProgress);
      } else if (format === 'docx') {
        parsed = await parseDocx(asset.uri, setProgress);
      } else if (format === 'odt') {
        parsed = await parseOdt(asset.uri, setProgress);
      } else if (format === 'rtf') {
        parsed = await parseRtf(asset.uri, setProgress);
      } else if (format === 'html') {
        parsed = await parseHtml(asset.uri, setProgress);
      } else {
        parsed = await (async () => {
          const res = await fetch(asset.uri);
          const raw = await res.text();
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
        language: 'auto',
        targetLang: 'uk',
        paragraphs,
        sections,
        cover: parsed.cover,
      });
      // E3: parse-once → books.db.chapters (для миттєвого повторного відкриття).
      importBook(asset.uri, format).catch((e) => {
        console.warn('[bookImport] failed (non-fatal):', e);
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
          language: 'auto',
          targetLang: 'uk',
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
      language: draft.language,
      targetLang: draft.targetLang,
      paragraphs: draft.paragraphs,
      sections: draft.sections,
      coverImage: draft.cover,
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
    setDraft(null);
    setModeBookId(bookId);
  };

  const handleModeSelect = (mode: 'read' | 'dual' | 'speed', variant?: 'rsvp' | 'ticker') => {
    const id = modeBookId;
    setModeBookId(null);
    if (!id) return;
    if (mode === 'speed') {
      navigation.navigate('SpeedReading', { bookId: id, variant: variant ?? 'rsvp' });
      return;
    }
    navigation.navigate('Reader', { bookId: id, mode });
  };


  const coverColor = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return `hsl(${h}, 45%, 38%)`;
  };

  const visibleBooks = useMemo(() => {
    let list = books;
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [books, sortBy]);

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <View style={styles.container}>
      <View style={styles.libHead}>
        {!onSelectBook && (
          <IconButton icon="settings" onPress={() => setSettingsOpen(true)} variant="circle" size={a.fab()} hitSlop={8} />
        )}
        <SupportButton size={a.fab()} iconSize={Math.round(a.fab()*0.5)} />
      </View>
      {loading && (
        <View style={[styles.progressCard, metal(theme, 'raised', { radius: a.radius })]}>
          <Text style={[styles.progressText, { color: theme.secondaryText }]}>{t('Reading file…')} {Math.round(progress * 100)}%</Text>
          <ProgressBar progress={progress} />
        </View>
      )}

      <ModalSheet visible={!!draft} onClose={() => setDraft(null)} panelStyle={{ backgroundColor: theme.popupBg ?? theme.neu.base }}>
        {draft && (
          <View style={[styles.draftCard, { width: '100%', maxWidth: Math.min(520, a.contentMaxW - a.pad * 2) }]}>
              <Text style={[styles.draftTitle, { color: theme.primaryText }]}>{draft.title}</Text>
          <Text style={[styles.draftMeta, { color: theme.secondaryText }]}>
            {draft.format.toUpperCase()} · {draft.paragraphs.length} {t('sentences')}
          </Text>

          <Text style={[styles.label, { color: theme.secondaryText }]}>{t('Original language:')}</Text>
          <TouchableOpacity style={[styles.langButton, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 0 }]} onPress={() => setPickerVisible(true)}>
            <Text style={[styles.langButtonText, { color: theme.primaryText }]}>{langName(draft.language)}</Text>
            <Text style={[styles.langArrow, { color: theme.secondaryText }]}>▾</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: theme.secondaryText, marginTop: a.gap }]}>{t('Translation language:')}</Text>
          <TouchableOpacity style={[styles.langButton, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 0 }]} onPress={() => setTargetPickerVisible(true)}>
            <Text style={[styles.langButtonText, { color: theme.primaryText }]}>{langName(draft.targetLang)}</Text>
            <Text style={[styles.langArrow, { color: theme.secondaryText }]}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importBtn, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 0 }]}
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
            <TouchableOpacity style={[styles.actionBtn, metal(theme, 'inset', { radius: a.radius }), { borderWidth: 0 }]} onPress={() => setDraft(null)}>
              <Text style={[styles.actionText, { color: theme.secondaryText }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, metal(theme, 'primary'), { borderWidth: 0 }]} onPress={saveDraft}>
              <Text style={[styles.saveText]}>{t('Save')}</Text>
            </TouchableOpacity>
          </View>
          </View>
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
          exclude={['ru']}
          onSelect={(code) => draft && setDraft({ ...draft, targetLang: code })}
          onClose={() => setTargetPickerVisible(false)}
        />
      </ModalSheet>

      <BookList
        books={visibleBooks}
        bookWordCount={bookWordCount}
        onOpen={openReader}
        onRemove={removeBook}
      />

      {!onSelectBook && Platform.OS !== 'web' && <NativeAdBanner />}

      {!onSelectBook && (
        <TouchableOpacity
          style={[styles.fab, metal(theme, 'primary', { size: fabSize })]}
          onPress={onAddPress}
          hitSlop={12}
        >
          <Icon name="plus" size={a.dim(0.06, 26, 40)} color={theme.primaryText} />
        </TouchableOpacity>
      )}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub,.fb2,text/plain,application/epub+zip,application/x-fictionbook"
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
      <AppSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </View>
    </Screen>
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

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  const cover = { w: a.dim(0.065, 34, 54), h: a.dim(0.087, 46, 72) };
  return StyleSheet.create({
    container: { flex: 1, paddingTop: 0, paddingBottom: 0, width: '100%', maxWidth: a.gridMaxW, alignSelf: 'center' },
    libHead: { position: 'absolute', top: a.insetTop + a.pad, right: a.pad, zIndex: 100, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
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
    draftActions: { flexDirection: 'row', marginTop: a.gap * 1.5, gap: 12 },
    importBtn: { marginTop: a.gap, borderRadius: a.radius, paddingVertical: a.tiny ? 9 : 12, paddingHorizontal: 14, alignItems: 'center' },
    importText: { fontSize: a.small_fs, fontFamily: FONTS.bold, textAlign: 'center' },
    actionBtn: { flex: 1, height: Math.round(Math.max(44, 48 * a.scale)), paddingVertical: 10, paddingHorizontal: 16, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontSize: a.body },
    saveText: { color: theme.primaryText, fontFamily: FONTS.bold, fontSize: a.body },
    empty: { textAlign: 'center', marginTop: 40, fontSize: a.body },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: a.radius,
      padding: a.pad,
      marginBottom: a.gap,
      minWidth: 0,
    },
    cover: { width: cover.w, height: cover.h, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    coverText: { color: theme.primaryText, fontSize: a.fs(24), fontFamily: FONTS.bold },
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
    sortBar: { flexDirection: 'row', borderRadius: a.radius, padding: 3, marginBottom: a.gap },
    sortTab: { flex: 1, paddingVertical: a.tiny ? 6 : 8, borderRadius: Math.max(4, a.radius - 4), alignItems: 'center' },
    sortTabText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    fab: {
      position: 'absolute',
      right: 52,
      bottom: 85,
      alignItems: 'center',
      justifyContent: 'center',
      // гарантируем, что кнопка не вылазит за правый край контента
      // (container центрируется maxWidth:contentMaxW, поэтому right считается от него)
      marginRight: 0,
    },
  });
}
