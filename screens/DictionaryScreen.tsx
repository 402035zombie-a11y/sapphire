// screens/DictionaryScreen.tsx
// Локальный словарь: список сохранённых слов, поиск, сортировка, удаление, экспорт.
// На карточке каждого слова — бейдж прогресса (ур. + ✓/✗) из trainingStore.
// Общий счётчик = entries.length (дедуплицированы в store/createStore).
import ModalSheet from '../components/ModalSheet';
import Card from '../components/ui/Card';
import Screen from '../components/Screen';
import TextField from '../components/ui/TextField';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useNavigation } from '@react-navigation/native';
import { FONTS } from '../theme/constants';
import { useDictionaryStore } from '../store/dictionaryStore';
import { translateCached } from '../services/translationService';
import { DictionaryEntry } from '../store/dictionaryStore';
import { useTrainingStore } from '../store/trainingStore';
import { useLibraryStore } from '../store/libraryStore';
import * as Speech from 'expo-speech';
import { langName } from '../utils/languages';
import { extractBookWords } from '../utils/bookWords';
import { effectiveLang } from '../utils/lang';
import Icon from '../components/Icon';
import { neuShadowPad, screenBg, metal } from '../theme/neu';
import SupportButton from '../components/SupportButton';
import SupportAuthorModal from '../components/SupportAuthorModal';
import { useSupportAutoOpen } from '../hooks/useSupportAutoOpen';
import { useSupportStore } from '../store/supportStore';
import { showSupportAd } from '../services/monetization';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from '../i18n';

const speakWord = (text: string, lang: string) => {
  if (!text) return;
  Speech.speak(text, { language: lang || 'en', rate: 0.95 });
};

type SortMode = 'az' | 'date' | 'lang' | 'freq' | 'hard';

// Список выбора в попапе (дедуплицирует 3× ScrollView maxHeight:a.height*0.6 в DictionaryScreen)
function PickerList({ items, emptyHint, styles }: { items: { key: string; label: string; onPress: () => void }[]; emptyHint?: string; styles: any }) {
  const theme = useTheme();
  const a = useAdaptive();
  if (items.length === 0 && emptyHint) return <Text style={[styles.pickHint, { color: theme.secondaryText }]}>{emptyHint}</Text>;
  return (
    <ScrollView style={{ maxHeight: Math.round(a.height * 0.6) }} contentContainerStyle={{ paddingBottom: 4 }}>
      {items.map((it) => (
        <TouchableOpacity key={it.key} style={[styles.pickItem]} onPress={it.onPress}>
          <Text style={[styles.pickText, { color: theme.primaryText }]} numberOfLines={1}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// B9: віртуалізована картка слова (renderItem для FlashList).
// Контекст-речення НЕ рендериться (вага при 1000+ слів). SurfaceForm+переклад+бейджі.
type WordCardProps = {
  item: DictionaryEntry;
  theme: any;
  a: any;
  styles: any;
  progress: Record<string, any>;
  editing: { id: string; value: string } | null;
  setEditing: (v: { id: string; value: string } | null) => void;
  updateEntry: (id: string, patch: any) => void;
  removeEntry: (id: string) => void;
  speakWord: (text: string, lang: string) => void;
  ensureTranslation: (e: DictionaryEntry) => void;
  t: (key: string) => string;
};

function WordCard({ item, theme, a, styles, progress, editing, setEditing, updateEntry, removeEntry, speakWord, ensureTranslation, t }: WordCardProps) {
  const isEditing = editing?.id === item.id;
  const tp = progress[`${item.word}|${item.lang}`];
  const box = tp?.box ?? 1;
  const c = tp?.correctCount ?? 0;
  const w = tp?.wrongCount ?? 0;
  // B9/HWUI: memoize metal()-стилі бейджів — НЕ перераховувати тіні при скролі FlatList.
  const badgeStyle = React.useMemo(() => metal(theme, 'inset', { radius: 8 }), [theme]);
  const freqBadgeStyle = React.useMemo(() => metal(theme, 'inset', { radius: 8 }), [theme]);
  return (
    <Card radius={a.radius} style={styles.row}>
      <TouchableOpacity style={styles.speakInline} onPress={() => speakWord(item.word, item.lang)} hitSlop={6}>
        <Text style={styles.speakInlineIcon}>▶</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: a.gap }}>
        <View style={styles.wordLine}>
          <Text style={[styles.word, { color: theme.primaryText }]}>
            {item.surfaceForm} <Text style={[styles.lang, { color: theme.secondaryText }]}>{langName(item.lang)}</Text>
          </Text>
          {(c > 0 || w > 0) && (
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeBox, { color: theme.primary }]}>{t('Lvl')} {box}</Text>
              <Text style={{ color: theme.success }}>✓{c}</Text>
              <Text style={{ color: theme.danger }}>✗{w}</Text>
            </View>
          )}
          {item.frequency && item.frequency > 1 && (
            <View style={[styles.freqBadge, freqBadgeStyle]}>
              <Text style={[styles.freqText, { color: theme.secondaryText }]}>×{item.frequency}</Text>
            </View>
          )}
        </View>
        {isEditing ? (
          <TextField
            radius={8}
            style={[styles.editInput, { borderWidth: 0, color: theme.primaryText }]}
            value={editing?.value}
            autoFocus
            onChangeText={(t2) => setEditing({ id: item.id, value: t2 })}
            onSubmitEditing={() => { updateEntry(item.id, { translation: editing!.value.trim() }); setEditing(null); }}
            onBlur={() => { updateEntry(item.id, { translation: editing!.value.trim() }); setEditing(null); }}
          />
        ) : (
          <TouchableOpacity onPress={() => { ensureTranslation(item); setEditing({ id: item.id, value: item.translation }); }}>
            <Text style={[styles.translation, { color: theme.secondaryText }]}>{item.translation}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEntry(item.id)} hitSlop={10}>
        <Icon name="close" size={a.dim(0.03, 16, 22)} color={theme.danger} />
      </TouchableOpacity>
    </Card>
  );
}

export default function DictionaryScreen() {
  const theme = useTheme();
  const t = useT();
  const a = useAdaptive();
  const styles = useMemo(() => makeStyles(a, theme), [a, theme]);
  const entries = useDictionaryStore((s) => s.entries);
  const removeEntry = useDictionaryStore((s) => s.removeEntry);
  const importEntries = useDictionaryStore((s) => s.importEntries);
  const updateEntry = useDictionaryStore((s) => s.updateEntry);
  const books = useLibraryStore((s) => s.books);
  const addEntry = useDictionaryStore((s) => s.addEntry);
  const clearAll = useDictionaryStore((s) => s.clearAll);
  const clearByBook = useDictionaryStore((s) => s.clearByBook);
  const progress = useTrainingStore((s) => s.progress) as Record<string, any>;
  const trainingProgress = progress; // FSRS-прогрес для due-фільтру/сортування
  const levelOf = useTrainingStore((s) => s.levelOf);

  // верхний выбор источника: null = показать попап выбора; 'general' | {bookId}
  type Source = { type: 'general' } | { type: 'book'; bookId: string } | null;
  const [source, setSource] = useState<Source>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bookPickOpen, setBookPickOpen] = useState(false);

  // книги, от которых уже есть сохранённые слова
  const bookSources = useMemo(() => {
    const ids = Array.from(new Set(entries.map((e) => e.bookId).filter(Boolean) as string[]));
    return ids
      .map((id) => {
        const book = books.find((b) => b.id === id) ?? books.find((b) => b.id === id.replace(/[-_ ]\d{10,}$/, ''));
        return { id, title: book?.title ?? id };
      })
  }, [entries, books]);

  const selectedBookId = source?.type === 'book' ? source.bookId : null;
  const scopedEntries = useMemo(() => {
    if (source?.type === 'book') return entries.filter((e) => e.bookId === source.bookId);
    return entries; // 'general' и null — все слова (общие + из книг)
  }, [entries, source]);

  const headerTitle =
    source?.type === 'book'
      ? books.find((b) => b.id === source.bookId)?.title ?? source.bookId
      : '';

  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [addTrans, setAddTrans] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('date');
  const [levelFilter, setLevelFilter] = useState<'all' | 'new' | 'learning' | 'learned'>('all');
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  // Due-фільтр: коли слово чекати (по nextReviewAt з FSRS)
  const [dueFilter, setDueFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [duePickerOpen, setDuePickerOpen] = useState(false);

  const filtered = useMemo(() => {
    const src = scopedEntries ?? [];
    const q = query.trim().toLowerCase();
    let list = q
      ? src.filter(
          (e: DictionaryEntry) => (e.word || '').toLowerCase().includes(q) || (e.translation || '').toLowerCase().includes(q),
        )
      : [...src];
    if (levelFilter !== 'all') {
      list = list.filter((e: DictionaryEntry) => levelOf(e.word || '', e.lang || '') === levelFilter);
    }
    // Due-фільтр (FSRS nextReviewAt): overdue — час вже прийшов; today — протягом доби; week — тижня
    if (dueFilter !== 'all') {
      const now = Date.now();
      const dayMs = 86_400_000;
      list = list.filter((e: DictionaryEntry) => {
        const p = trainingProgress[`${e.word}|${e.lang}`];
        if (!p) return false; // без прогресу немає запланованого повторення
        if (dueFilter === 'overdue') return p.nextReviewAt <= now;
        if (dueFilter === 'today') return p.nextReviewAt > now && p.nextReviewAt <= now + dayMs;
        return p.nextReviewAt > now + dayMs && p.nextReviewAt <= now + 7 * dayMs;
      });
    }
    list.sort((a, b) => {
      if (sortBy === 'az') return a.word.localeCompare(b.word);
      if (sortBy === 'lang') return a.lang.localeCompare(b.lang) || a.word.localeCompare(b.word);
      if (sortBy === 'freq') return (b.frequency ?? 1) - (a.frequency ?? 1); // D5: за частотою (топ повторюваних)
      if (sortBy === 'hard') {
        // Найскладніші: більше wrongCount і менша stability — першими
        const pa = trainingProgress[`${a.word}|${a.lang}`];
        const pb = trainingProgress[`${b.word}|${b.lang}`];
        const scoreA = (pa?.wrongCount ?? 0) * 10 - (pa?.stability ?? 0);
        const scoreB = (pb?.wrongCount ?? 0) * 10 - (pb?.stability ?? 0);
        return scoreB - scoreA;
      }
      // date — новые сверху
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [scopedEntries, query, sortBy, levelFilter, dueFilter, levelOf, trainingProgress]);

  const [supportOpen, setSupportOpen] = useState(false);
  useSupportAutoOpen(() => setSupportOpen(true));

  const onSupportConfirm = async () => {
    setSupportOpen(false);
    const ok = await showSupportAd();
    if (ok) useSupportStore.getState().markAdWatched();
  };
  const onDonate = () => {
    setSupportOpen(false);
    useSupportStore.getState().setDontShowSupport(true);
  };

  const importFromFile = (text: string) => {
    try {
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : data?.dictionary;
      if (!Array.isArray(list)) throw new Error(t('Invalid file format'));
      const cleaned = list
        .filter((e: any) => e && e.word && e.translation)
        .map((e: any) => ({
          word: String(e.word),
          surfaceForm: String(e.surfaceForm ?? e.word),
          translation: String(e.translation),
          context: String(e.context ?? ''),
          lang: String(e.lang ?? 'en'),
        }));
      importEntries(cleaned);
      Alert.alert(t('Import'), t('Words added: {n}').replace(/\{n\}/g, String(cleaned.length)));
    } catch (err: any) {
      Alert.alert(t('Import error'), err?.message ?? String(err));
    }
  };

  const onWebFile = (e: any) => {
    const file: File | undefined = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importFromFile(String(reader.result || ''));
    reader.readAsText(file);
  };

  const exportAll = async () => {
    if (scopedEntries.length === 0) {
      Alert.alert(t('Empty'), t('No words to export.'));
      return;
    }
    const json = JSON.stringify(scopedEntries, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookreader-dictionary.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        // @ts-ignore — legacy API типи конфліктують з tsc node_modules
        const FileSystem = require('expo-file-system/legacy');
        const path = `${FileSystem.cacheDirectory}bookreader-dictionary.json`;
        await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });
        const can = await Sharing.isAvailableAsync();
        if (can) {
          await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: t('Export dictionary') });
        } else {
          Alert.alert(t('Export'), t('Sharing not available on this device.'));
        }
      } catch (err: any) {
        Alert.alert(t('Export error'), err?.message ?? String(err));
      }
    }
  };

  // Експорт у Anki (.apkg): сумісний формат, юзер відкриває в Anki через "Імпорт"
  const exportAnki = async () => {
    if (scopedEntries.length === 0) {
      Alert.alert(t('Empty'), t('No words to export.'));
      return;
    }
    try {
      const { buildApkgBase64 } = await import('../services/ankiExport');
      const cards = scopedEntries
        .filter((e) => e.word && e.translation)
        .map((e) => ({ front: e.word, back: e.translation }));
      if (cards.length === 0) {
        Alert.alert(t('Empty'), t('No words to export.'));
        return;
      }
      const deckName = source?.type === 'book'
        ? `Sapphire::${headerTitle || 'Book'}`
        : 'Sapphire::Dictionary';
      const b64 = await buildApkgBase64(cards, deckName);
      if (Platform.OS === 'web') {
        const blob = new Blob([b64], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deckName.replace(/[:/\\]/g, '-')}.apkg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // @ts-ignore — legacy API
        const FileSystem = require('expo-file-system/legacy');
        const path = `${FileSystem.cacheDirectory}sapphire-export.apkg`;
        await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        const can = await Sharing.isAvailableAsync();
        if (can) {
          await Sharing.shareAsync(path, { mimeType: 'application/apkg', dialogTitle: t('Export to Anki') });
        } else {
          Alert.alert(t('Export'), t('Sharing not available on this device.'));
        }
      }
      Alert.alert(t('Export'), t('Exported {n} cards to Anki deck.').replace('{n}', String(cards.length)));
    } catch (err: any) {
      Alert.alert(t('Export error'), err?.message ?? String(err));
    }
  };

  // Імпорт Anki-колоди (.apkg): DocumentPicker → parseApkgBase64 → importEntries
  const importAnkiApkg = async () => {
    setImportOpen(false);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', 'application/apkg', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      if (!file.name?.toLowerCase().endsWith('.apkg')) {
        Alert.alert(t('Import error'), t('Please select an .apkg file (Anki deck).'));
        return;
      }
      // @ts-ignore — legacy API
      const FileSystem = require('expo-file-system/legacy');
      const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });

      const { parseApkgBase64, toDictionaryEntries } = await import('../services/ankiImport');
      const { cards, deckName } = await parseApkgBase64(b64);
      if (cards.length === 0) {
        Alert.alert(t('Import error'), t('No cards found in this deck.'));
        return;
      }
      const lang = 'en'; // Anki-колоди зазвичай front=англ; юзер може змінити мову редагуванням
      const entries = toDictionaryEntries(cards, lang);
      useDictionaryStore.getState().importEntries(entries);
      Alert.alert(
        t('Import'),
        t('Imported {n} cards from “{deck}”.').replace('{n}', String(cards.length)).replace('{deck}', deckName),
      );
    } catch (err: any) {
      Alert.alert(t('Import error'), err?.message ?? String(err));
    }
  };

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'az', label: t('A–Z') },
    { id: 'date', label: t('Date') },
    { id: 'lang', label: t('Language') },
    { id: 'freq', label: t('Frequency') },
    { id: 'hard', label: t('Hardest first') },
  ];

  const levelOptions: { id: 'all' | 'new' | 'learning' | 'learned'; label: string }[] = [
    { id: 'all', label: t('All') },
    { id: 'new', label: t('New') },
    { id: 'learning', label: t('Learning') },
    { id: 'learned', label: t('Learned') },
  ];

  const importWordsFromBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    const lang = effectiveLang(book.language);
    // T1: не блокуємо UI — важка робота (парсинг усієї книги) у асинхронному мікротасці.
    // Одразу повідомляємо юзера, що команда прийнята (фідбек без затримки).
    Alert.alert(t('Import from book'), t('Book queued for processing…'));
    setBookPickOpen(false);
    // відкладаємо важку синхронну роботу, щоб UI розблокувався й показав Alert
    Promise.resolve().then(() => {
      const freqs = extractBookWords(book.paragraphs);
      // БАТЧ: один importEntries замість 1000+ addEntry
      const toAdd = freqs.map(({ word, frequency }) => ({
        word,
        surfaceForm: word,
        translation: '',
        context: '',
        lang,
        bookId,
        frequency,
      }));
      importEntries(toAdd);
      // перемикаємося на вид «по книзі», щоб юзер одразу побачив додані слова
      setSource({ type: 'book', bookId });
      Alert.alert(t('Import from book'), t('Unique words added: {n}').replace(/\{n\}/g, String(toAdd.length)));
    });
  };

  const handleDeleteAll = () => {
    if (scopedEntries.length === 0) return;
    setConfirmDelete(true);
  };

  const confirmDeleteAction = () => {
    const byBook = source?.type === 'book';
    if (byBook && selectedBookId) clearByBook(selectedBookId);
    else clearAll();
    setConfirmDelete(false);
  };

  // Lazy-переклад: запитуємо переклад ТІЛЬКИ коли юзер тапнув слово (не при імпорті).
  // Це усуває лаг при імпорті великої книги (раніше backfill гнав 1000+ мережевих запитів).
  const ensureTranslation = useCallback((e: DictionaryEntry) => {
    if (e.translation && e.translation.trim()) return;
    const from = e.lang || 'en';
    const book = e.bookId ? (books || []).find((b) => b.id === e.bookId) : null;
    const to = effectiveLang(book?.targetLang || useSettingsStore.getState().targetLang) || 'uk';
    translateCached(e.word, from, to)
      .then((r) => {
        if (r?.text && r.text.trim().toLowerCase() !== e.word.trim().toLowerCase()) {
          updateEntry(e.id, { translation: r.text });
        }
      })
      .catch(() => {});
  }, [books, updateEntry]);

  // заголовок + иконки → в нативный хедер (убираем дублирующий кастомный headerRow)
  useEffect(() => {
    navigation.setOptions({
      // Название экрана убрано — освобождаем ширину под иконки действий.
      title: '',
      headerRight: () => {
        // все иконки тулбара — выпуклые круги (raised снаружи + внутренняя окантовка внутри)
        const tbSize = a.dim(0.06, 30, 40);
        const tb = metal(theme, 'circle', { size: tbSize });
        const isz = a.dim(0.028, 16, 24);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8, paddingTop: a.insetTop }}>
            <TouchableOpacity onPress={() => setSearchOpen(true)} hitSlop={6} style={tb}>
              <Icon name="search" size={isz} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={exportAll} hitSlop={6} style={tb}>
              <Icon name="copy" size={isz} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setImportOpen(true)} hitSlop={6} style={tb}>
              <Icon name="scan" size={isz} color={theme.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteAll} hitSlop={6} style={tb}>
              <Icon name="close" size={isz} color={theme.danger} />
            </TouchableOpacity>
            <SupportButton />
          </View>
        );
      },
    });
  }, [navigation, headerTitle, theme.primaryText, exportAll, exportAnki, setImportOpen, handleDeleteAll]);

  return (
    <Screen contentStyle={{ padding: a.pad }}>
      <View style={[styles.counterRow, metal(theme, 'inset', { radius: a.radius })]}>
        <Text style={[styles.counterText, { color: theme.primaryText }]}>
          {t('Total words:')} <Text style={styles.counterNum}>{scopedEntries.length}</Text>
          {'  '}·{'  '}{t('Answers:')} <Text style={styles.counterNum}>{scopedEntries.reduce((sum, e) => {
            const tp = progress[`${e.word}|${e.lang}`];
            return sum + (tp?.correctCount ?? 0) + (tp?.wrongCount ?? 0);
          }, 0)}</Text>
        </Text>
        <Card radius={a.radius} style={styles.filterBlock}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 6 : 10, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[styles.sortTab, sortBy !== 'date' && { backgroundColor: theme.selected }]}
            onPress={() => setSortPickerOpen(true)}
          >
            <Text style={[styles.sortTabText, { color: theme.primaryText }]}>
              {t('Sort')}: {sortOptions.find((o) => o.id === sortBy)?.label ?? t('Date')}
            </Text>
            <Icon name="chevron-down" size={a.fs(12)} color={theme.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortTab, levelFilter !== 'all' && { backgroundColor: theme.selected }]}
            onPress={() => setLevelPickerOpen(true)}
          >
            <Text style={[styles.sortTabText, { color: levelFilter !== 'all' ? theme.primaryText : theme.secondaryText }]}>
              {t('Type')}: {levelOptions.find((o) => o.id === levelFilter)?.label ?? t('All')}
            </Text>
            <Icon name="chevron-down" size={a.fs(12)} color={theme.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortTab, dueFilter !== 'all' && { backgroundColor: theme.selected }]}
            onPress={() => setDuePickerOpen(true)}
          >
            <Text style={[styles.sortTabText, { color: dueFilter !== 'all' ? theme.primaryText : theme.secondaryText }]}>
              {t('Due')}: {dueFilter === 'all' ? t('All') : dueFilter === 'overdue' ? t('Overdue') : dueFilter === 'today' ? t('Today') : t('This week')}
            </Text>
            <Icon name="chevron-down" size={a.fs(12)} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>
      </Card>
      </View>

      {/* B9: FlatList замість ScrollView — віртуалізація (не рендерить 1000+ карток одразу).
          numColumns={a.columns} — адаптивна сітка (1-6 колонок). Context прибрано зі списку. */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        key={`dict-cols-${a.columns}`}
        numColumns={a.columns}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={10}
        contentContainerStyle={{
          paddingHorizontal: neuShadowPad(),
          // Хедер (лічильник+фільтри) у потоці ВИЩЕ списку — додатковий paddingTop тут
          // створював мертвий відступ і слова обрізались не досягаючи межі хедера.
          paddingTop: 0,
          paddingBottom: Math.round(a.height / 2),
        }}
        columnWrapperStyle={a.columns > 1 ? { gap: 4 } : undefined}
        ListEmptyComponent={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: a.pad, marginTop: a.height * 0.2 }}>
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              {entries.length === 0
                ? t('Dictionary is empty. Tap words while reading to save them.')
                : t('Nothing found.')}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <WordCard
            item={item}
            theme={theme}
            a={a}
            styles={styles}
            progress={progress}
            editing={editing}
            setEditing={setEditing}
            updateEntry={updateEntry}
            removeEntry={removeEntry}
            speakWord={speakWord}
            ensureTranslation={ensureTranslation}
            t={t}
          />
        )}
      />

      {/* Попап выбора источника при входе в Словарь */}
      <ModalSheet visible={source === null} onClose={() => setSource({ type: 'general' })}>
        <View style={styles.pickCard}>
        <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Which dictionary to open?')}</Text>
            <TouchableOpacity style={[styles.pickItem]} onPress={() => setSource({ type: 'general' })}>
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('General dictionary')}</Text>
            </TouchableOpacity>
            {bookSources.length > 0 ? (
              <PickerList
                items={bookSources.map((b) => ({
                  key: b.id,
                  label: t('Dictionary for “{title}”').replace(/\{title\}/g, b.title),
                  onPress: () => setSource({ type: 'book', bookId: b.id }),
                }))}
                styles={styles}
              />
            ) : (
              <Text style={[styles.pickHint, { color: theme.secondaryText }]}>{t('No books with saved words.')}</Text>
            )}
        </View>
      </ModalSheet>

      {/* Попап выбора источника импорта */}
      <ModalSheet visible={importOpen} onClose={() => setImportOpen(false)}>
        <View style={styles.pickCard}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Import / Export (Anki)')}</Text>
            <TouchableOpacity
              style={[styles.pickItem]}
              onPress={() => { setImportOpen(false); setBookPickOpen(true); }}
            >
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('From book (extract words)')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickItem]}
              onPress={() => { setImportOpen(false); document.getElementById('dict-import')?.click(); }}
            >
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('From system file (JSON)')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickItem]}
              onPress={importAnkiApkg}
            >
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('From Anki deck (.apkg)')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickItem]}
              onPress={() => { setImportOpen(false); exportAnki(); }}
            >
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('To Anki deck (.apkg) — export')}</Text>
            </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* Попап выбора книги для извлечения слов */}
      <ModalSheet visible={bookPickOpen} onClose={() => setBookPickOpen(false)}>
        <View style={styles.pickCard}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Select a book')}</Text>
            <PickerList
              items={books.map((b) => ({
                key: b.id,
                label: b.title,
                onPress: () => { importWordsFromBook(b.id); setBookPickOpen(false); },
              }))}
              emptyHint={t('No books.')}
              styles={styles}
            />
        </View>
      </ModalSheet>

      {Platform.OS === 'web' ? (
        <input id="dict-import" type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onWebFile} />
      ) : null}

      <ModalSheet visible={searchOpen} onClose={() => setSearchOpen(false)}>
        <View style={styles.searchPop}>
            <TextField
              radius={10}
              style={[styles.searchInline, { borderWidth: 0, color: theme.primaryText }]}
              placeholder={t('Search…')}
              placeholderTextColor={theme.secondaryText}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
        </View>
      </ModalSheet>

      <ModalSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={styles.searchPop}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Delete all words?')}</Text>
            <Text style={[styles.pickHint, { color: theme.secondaryText }]}>
              {source?.type === 'book'
                ? t('All words from “{title}” ({n}) will be deleted. This action is irreversible.').replace(/\{title\}/g, headerTitle).replace(/\{n\}/g, String(scopedEntries.length))
                : t('The entire dictionary ({n} words) will be deleted. This action is irreversible.').replace(/\{n\}/g, String(scopedEntries.length))}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.surface }]} onPress={() => setConfirmDelete(false)}>
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={confirmDeleteAction}>
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
        </View>
      </ModalSheet>

      {/* FAB-группа: плюсик (добавить слово) + swap (сменить источник) */}
      <View style={[styles.fabGroup]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => {
            setAddWord('');
            setAddTrans('');
            setAddOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={a.dim(0.05, 22, 28)} color={theme.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.surface }]}
          onPress={() => {
            if (source?.type === 'book') setSource({ type: 'general' });
            else if (books.length > 0) setBookPickOpen(true);
            else setSource({ type: 'general' });
          }}
          activeOpacity={0.85}
        >
          <Icon name="swap" size={a.dim(0.05, 22, 28)} color={theme.primaryText} />
        </TouchableOpacity>
      </View>

      <ModalSheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <View style={styles.searchPop}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Add word')}</Text>
            <TextField
              radius={10}
              style={[styles.searchInline, { borderWidth: 0, color: theme.primaryText, marginTop: 12 }]}
              placeholder={t('Word')}
              placeholderTextColor={theme.secondaryText}
              value={addWord}
              onChangeText={setAddWord}
              autoFocus
            />
            <TextField
              radius={10}
              style={[styles.searchInline, { borderWidth: 0, color: theme.primaryText, marginTop: 10 }]}
              placeholder={t('Translation')}
              placeholderTextColor={theme.secondaryText}
              value={addTrans}
              onChangeText={setAddTrans}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.surface }]} onPress={() => setAddOpen(false)}>
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  const w = addWord.trim();
                  if (!w) return;
                  addEntry({
                    word: w,
                    surfaceForm: w,
                    translation: addTrans.trim(),
                    context: '',
                    lang: source?.type === 'book' ? (books.find((b) => b.id === source.bookId)?.language ?? 'en') : 'en',
                    bookId: source?.type === 'book' ? source.bookId : undefined,
                  });
                  setAddOpen(false);
                }}
              >
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Add')}</Text>
              </TouchableOpacity>
            </View>
        </View>
      </ModalSheet>
      <ModalSheet visible={sortPickerOpen} onClose={() => setSortPickerOpen(false)}>
        <View style={styles.pickCard}>
          <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Sort by')}</Text>
          <ScrollView style={{ maxHeight: Math.round(a.height * 0.6) }} contentContainerStyle={{ paddingBottom: 4 }}>
          {sortOptions.map((o) => {
            const active = sortBy === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.pickItem, active && { backgroundColor: theme.selected }]}
                onPress={() => { setSortBy(o.id); setSortPickerOpen(false); }}
              >
                <Text style={[styles.pickText, { color: active ? theme.primary : theme.primaryText }]}>{o.label}</Text>
                {active && <Text style={{ color: theme.primary }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
      </ModalSheet>
      <ModalSheet visible={levelPickerOpen} onClose={() => setLevelPickerOpen(false)}>
        <View style={styles.pickCard}>
          <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Word type')}</Text>
          <ScrollView style={{ maxHeight: Math.round(a.height * 0.6) }} contentContainerStyle={{ paddingBottom: 4 }}>
          {levelOptions.map((o) => {
            const active = levelFilter === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.pickItem, active && { backgroundColor: theme.selected }]}
                onPress={() => { setLevelFilter(o.id); setLevelPickerOpen(false); }}
              >
                <Text style={[styles.pickText, { color: active ? theme.primary : theme.primaryText }]}>{o.label}</Text>
                {active && <Text style={{ color: theme.primary }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
      </ModalSheet>
      <ModalSheet visible={duePickerOpen} onClose={() => setDuePickerOpen(false)}>
        <View style={styles.pickCard}>
          <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Due')}</Text>
          <ScrollView style={{ maxHeight: Math.round(a.height * 0.6) }} contentContainerStyle={{ paddingBottom: 4 }}>
          {([
            { id: 'all', label: t('All') },
            { id: 'overdue', label: t('Overdue') },
            { id: 'today', label: t('Today') },
            { id: 'week', label: t('This week') },
          ] as const).map((o) => {
            const active = dueFilter === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.pickItem, active && { backgroundColor: theme.selected }]}
                onPress={() => { setDueFilter(o.id); setDuePickerOpen(false); }}
              >
                <Text style={[styles.pickText, { color: active ? theme.primary : theme.primaryText }]}>{o.label}</Text>
                {active && <Text style={{ color: theme.primary }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
      </ModalSheet>
      <SupportAuthorModal
        visible={supportOpen}
        onSupport={onSupportConfirm}
        onDonate={onDonate}
        onDismiss={() => setSupportOpen(false)}
      />
    </Screen>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  const iconBtn = Math.round(Math.max(32, Math.min(44, 38 * a.scale)));
  const m = a.modal();
  return StyleSheet.create({
    screenTitle: { fontSize: a.title, fontFamily: FONTS.bold, marginBottom: a.gap },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: a.gap, flexWrap: 'wrap' },
    headerActions: { flexDirection: 'row', gap: 8 },
    confirmBtn: { flex: 1, paddingVertical: Math.max(10, Math.round(13 * a.scale)), paddingHorizontal: 16, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center', ...metal(theme, 'inset', { radius: a.radius }) },
    iconBtn: { ...metal(theme, 'circle', { size: iconBtn }), width: iconBtn, height: iconBtn, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    searchInline: { width: '100%', minWidth: 200, height: iconBtn, ...metal(theme, 'inset', { radius: a.radius }), backgroundColor: theme.surface ?? theme.neu?.base ?? '#ffffff', paddingHorizontal: 12, fontSize: a.body, color: theme.primaryText },
    modalBackdrop: { flex: 1 },
    searchPop: { width: '100%', maxWidth: Math.min(a.width - 24, 520), borderRadius: a.radius, padding: 12 },
    pickCard: { width: '100%', maxWidth: m.maxWidth, maxHeight: m.maxHeight, borderRadius: a.radius, padding: m.padding },
    pickTitle: { fontSize: a.h2, fontFamily: FONTS.bold, color: theme.secondaryText, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: a.gap, marginBottom: a.gap },
    pickItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: a.tiny ? 12 : 16, paddingHorizontal: a.pad, borderRadius: a.radius, ...metal(theme, 'raised', { radius: a.radius }), marginBottom: a.tiny ? 8 : 12 },
    pickText: { fontSize: a.body, fontFamily: FONTS.bold, flexShrink: 1 },
    pickHint: { fontSize: a.small_fs, marginTop: 8, fontStyle: 'italic' },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: a.tiny ? 4 : 6, flexWrap: 'wrap', paddingVertical: a.tiny ? 2 : 3, paddingHorizontal: a.tiny ? 8 : 10, marginBottom: 0 },
    counterText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    counterNum: { fontSize: a.body },
    // Единый объёмный блок: сегменты статуса/уровня слиты внутрь, плоские (тень только у родителя filterBlock)
    filterBlock: { padding: a.tiny ? 5 : 7, borderRadius: a.radius, gap: a.tiny ? 5 : 7 },
    sortBar: { flexDirection: 'row', borderRadius: a.radius, padding: 2, flexWrap: 'wrap' },
    sortTab: { paddingVertical: a.tiny ? 3 : 5, paddingHorizontal: a.tiny ? 7 : 10, ...metal(theme, 'inset', { radius: a.radius }) },
    sortTabText: { fontSize: a.fs(11), fontFamily: FONTS.bold },
    levelBar: { flexDirection: 'row', borderRadius: a.radius, padding: 3 },
    levelTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: a.tiny ? 6 : 9, paddingHorizontal: a.pad, borderRadius: a.radius },
    levelTabText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    viewBar: { ...metal(theme, 'inset', { radius: a.radius }), flexDirection: 'row', borderRadius: a.radius, padding: 2, marginBottom: a.gap },
    viewTab: { flex: 1, paddingVertical: a.tiny ? 6 : 8, borderRadius: Math.max(4, a.radius - 4), alignItems: 'center' },
    viewTabText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    fabGroup: { position: 'absolute', right: a.pad, bottom: a.tabBarH + a.pad + 10, flexDirection: 'column', gap: a.gap, alignItems: 'center', zIndex: 50 },
    fab: { width: a.dim(0.06, 46, 56), height: a.dim(0.06, 46, 56), borderRadius: a.dim(0.06, 46, 56) / 2, alignItems: 'center', justifyContent: 'center', ...metal(theme, 'raised', { radius: a.radius }) },
    toolbar: { flexDirection: 'row', gap: 8, marginBottom: a.gap },
    search: { flex: 1, ...metal(theme, 'inset', { radius: a.radius }), paddingHorizontal: 12, paddingVertical: a.tiny ? 7 : 10, fontSize: a.body },
    exportBtn: { borderRadius: a.radius, paddingHorizontal: a.pad, justifyContent: 'center' },
    exportText: { color: theme.primaryText, fontFamily: FONTS.bold, fontSize: a.small_fs },
    list: { paddingTop: a.headerH + a.insetTop + a.pad + 20, paddingBottom: a.tabBarH + a.pad + a.dim(0.06, 46, 56) + a.gap, gap: a.gap, justifyContent: 'flex-start' },
    empty: { textAlign: 'center', fontSize: a.body },
    row: {
      backgroundColor: theme.surface,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: a.radius,
      padding: a.pad,
      marginBottom: 4,
      width: a.columns > 1 ? '48%' : undefined,
      minWidth: 0,
    },
    wordLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    word: { fontSize: a.body, fontFamily: FONTS.bold, flexShrink: 1, maxWidth: '70%', wordBreak: 'break-word', overflow: 'hidden' } as any,
    speakInline: { ...metal(theme, 'circle', { size: a.dim(0.05, 28, 34) }), alignItems: 'center', justifyContent: 'center' },
    speakInlineIcon: { fontSize: a.fs(14), color: theme.primaryText },
    lang: { fontSize: a.fs(12), fontFamily: FONTS.regular },
    badge: { ...metal(theme, 'inset', { radius: 8 }), flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeBox: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    freqBadge: { ...metal(theme, 'inset', { radius: 8 }), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    freqText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    translation: { fontSize: a.body, marginTop: 2 },
    context: { fontSize: a.small_fs, marginTop: 6, fontStyle: 'italic' },
    editInput: { ...metal(theme, 'inset', { radius: 8 }), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: a.body, marginTop: 4 },
    deleteBtn: { ...metal(theme, 'circleInset', { size: a.dim(0.05, 28, 38) }), alignItems: 'center', justifyContent: 'center' },
  });
}
