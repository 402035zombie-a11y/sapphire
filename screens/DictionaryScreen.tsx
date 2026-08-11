// screens/DictionaryScreen.tsx
// Локальный словарь: список сохранённых слов, поиск, сортировка, удаление, экспорт.
// На карточке каждого слова — бейдж прогресса (ур. + ✓/✗) из trainingStore.
// Общий счётчик = entries.length (дедуплицированы в store/createStore).
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAdaptive } from '../theme/useAdaptive';
import { useNavigation } from '@react-navigation/native';
import { FONTS } from '../theme/constants';
import { useDictionaryStore } from '../store/dictionaryStore';
import { DictionaryEntry } from '../store/dictionaryStore';
import { useTrainingStore } from '../store/trainingStore';
import { useLibraryStore } from '../store/libraryStore';
import { langName } from '../utils/languages';
import { extractBookWords } from '../utils/bookWords';
import Icon from '../components/Icon';
import { neuRaised, neuInset, neuPrimary, neuCircle, neuShadowPad, screenBg } from '../theme/neu';
import SupportButton from '../components/SupportButton';
import { useT } from '../i18n';

const speakWord = (text: string, lang: string) => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};

type SortMode = 'az' | 'date' | 'lang';

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? scopedEntries.filter(
          (e: DictionaryEntry) => e.word.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q),
        )
      : [...scopedEntries];
    if (levelFilter !== 'all') {
      list = list.filter((e: DictionaryEntry) => levelOf(e.word, e.lang) === levelFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'az') return a.word.localeCompare(b.word);
      if (sortBy === 'lang') return a.lang.localeCompare(b.lang) || a.word.localeCompare(b.word);
      // date — новые сверху
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }, [entries, query, sortBy, levelFilter, levelOf]);

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
      Alert.alert(t('Export'), t('On this platform export is available in the web version.'));
    }
  };

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'az', label: t('A–Z') },
    { id: 'date', label: t('Date') },
    { id: 'lang', label: t('Language') },
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
    const lang = book.language === 'auto' ? 'en' : book.language;
    // extractBookWords нормализует (только буквы) и считает частоту вхождений
    const freqs = extractBookWords(book.paragraphs);
    let added = 0;
    for (const { word, frequency } of freqs) {
      addEntry({ word, surfaceForm: word, translation: '', context: '', lang, bookId, frequency });
      added++;
    }
    // переключаемся на вид «по книге», чтобы пользователь сразу увидел добавленные слова
    setSource({ type: 'book', bookId });
    Alert.alert(t('Import from book'), t('Unique words added: {n}').replace(/\{n\}/g, String(added)));
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

  // заголовок + иконки → в нативный хедер (убираем дублирующий кастомный headerRow)
  useEffect(() => {
    navigation.setOptions({
      // Название экрана убрано — освобождаем ширину под иконки действий.
      title: '',
      headerRight: () => {
        // все иконки тулбара — выпуклые круги (raised снаружи + внутренняя окантовка внутри)
        const tbSize = a.dim(0.06, 30, 40);
        const tb = neuCircle(theme, tbSize);
        const isz = a.dim(0.028, 16, 24);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
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
              <Icon name="close" size={isz} color="#DC2626" />
            </TouchableOpacity>
          </View>
        );
      },
    });
  }, [navigation, headerTitle, theme.primaryText, exportAll, setImportOpen, handleDeleteAll]);

  return (
    <View style={[styles.container, { ...screenBg(theme), padding: a.pad }]}>
      <View style={[styles.counterRow, neuInset(theme, a.radius)]}>
        <Text style={[styles.counterText, { color: theme.primaryText }]}>
          {t('Total words:')} <Text style={styles.counterNum}>{scopedEntries.length}</Text>
          {'  '}·{'  '}{t('Answers:')} <Text style={styles.counterNum}>{scopedEntries.reduce((sum, e) => {
            const tp = progress[`${e.word}|${e.lang}`];
            return sum + (tp?.correctCount ?? 0) + (tp?.wrongCount ?? 0);
          }, 0)}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: a.tiny ? 6 : 10 }}>
          <View style={styles.sortBar}>
            {sortOptions.map((o) => {
              const active = sortBy === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.sortTab, active && { ...neuInset(theme, a.radius), margin: 3, backgroundColor: theme.selected }]}
                  onPress={() => setSortBy(o.id)}
                >
                  <Text style={[styles.sortTabText, { color: active ? theme.primaryText : theme.secondaryText }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <SupportButton />
        </View>
      </View>

      {source?.type === 'book' ? (
        <View style={[styles.bookBar, neuInset(theme, a.radius)]}>
          <TouchableOpacity
            style={[styles.bookChip, selectedBookId === null && { backgroundColor: theme.primary }]}
            onPress={() => setSource({ type: 'book', bookId: selectedBookId! })}
          >
            <Text style={[styles.bookChipText, { color: theme.primaryText }]}>{t('Change book')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookChip, { backgroundColor: theme.primary }]}
            onPress={() => setSource({ type: 'general' })}
          >
            <Text style={[styles.bookChipText, { color: '#fff' }]}>{t('General dictionary')}</Text>
          </TouchableOpacity>
        </View>
      ) : source?.type === 'general' ? (
        <View style={[styles.bookBar, neuInset(theme, a.radius)]}>
          <TouchableOpacity
            style={[styles.bookChip, { backgroundColor: theme.primary }]}
            onPress={() => setSource({ type: 'book', bookId: selectedBookId! })}
          >
            <Text style={[styles.bookChipText, { color: '#fff' }]}>{t('Change book')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {source?.type === 'book' && (
        <View style={[styles.bookBar, neuInset(theme, a.radius)]}>
          {bookSources.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.bookChip, selectedBookId === b.id && { backgroundColor: theme.primary }]}
              onPress={() => setSource({ type: 'book', bookId: b.id })}
            >
              <Text style={[styles.bookChipText, { color: selectedBookId === b.id ? '#fff' : theme.primaryText }]} numberOfLines={1}>
                {b.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.levelBar, neuInset(theme, a.radius)]}>
        {levelOptions.map((o) => {
          const active = levelFilter === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.levelTab, active && { ...neuInset(theme, a.radius), margin: 3, backgroundColor: theme.selected }]}
              onPress={() => setLevelFilter(o.id)}
            >
              <Text style={[styles.levelTabText, { color: active ? theme.primaryText : theme.secondaryText }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        key={`dcols-${a.columns}`}
        numColumns={a.columns}
        columnWrapperStyle={a.columns > 1 ? { gap: a.gap } : undefined}
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[styles.list, { padding: neuShadowPad() }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            {entries.length === 0
              ? t('Dictionary is empty. Tap words while reading to save them.')
              : t('Nothing found.')}
          </Text>
        }
        renderItem={({ item }) => {
          const isEditing = editing?.id === item.id;
          const tp = progress[`${item.word}|${item.lang}`];
          const box = tp?.box ?? 1;
          const c = tp?.correctCount ?? 0;
          const w = tp?.wrongCount ?? 0;
          return (
            <View style={[styles.row, neuRaised(theme, a.radius)]}>
              <TouchableOpacity style={styles.speakInline} onPress={() => speakWord(item.word, item.lang)} hitSlop={6}>
                <Text style={styles.speakInlineIcon}>▶</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: a.gap }}>
                <View style={styles.wordLine}>
                  <Text style={[styles.word, { color: theme.primaryText }]}>
                    {item.surfaceForm} <Text style={[styles.lang, { color: theme.secondaryText }]}>{langName(item.lang)}</Text>
                  </Text>
                  {(c > 0 || w > 0) && (
                    <View style={[styles.badge, neuInset(theme, 8)]}>
                      <Text style={[styles.badgeBox, { color: theme.primary }]}>{t('Lvl')} {box}</Text>
                      <Text style={{ color: '#16A34A' }}>✓{c}</Text>
                      <Text style={{ color: '#DC2626' }}>✗{w}</Text>
                    </View>
                  )}
                  {item.frequency && item.frequency > 1 && (
                    <View style={[styles.freqBadge, neuInset(theme, 8)]}>
                      <Text style={[styles.freqText, { color: theme.secondaryText }]}>×{item.frequency}</Text>
                    </View>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, neuInset(theme, 8), { borderWidth: 0, color: theme.primaryText }]}
                    value={editing?.value}
                    autoFocus
                    onChangeText={(t) => setEditing({ id: item.id, value: t })}
                    onSubmitEditing={() => { updateEntry(item.id, { translation: editing!.value.trim() }); setEditing(null); }}
                    onBlur={() => { updateEntry(item.id, { translation: editing!.value.trim() }); setEditing(null); }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditing({ id: item.id, value: item.translation })}>
                    <Text style={[styles.translation, { color: theme.primary }]}>{item.translation}</Text>
                  </TouchableOpacity>
                )}
                {item.context ? <Text style={[styles.context, { color: theme.secondaryText }]}>«{item.context}»</Text> : null}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEntry(item.id)} hitSlop={10}>
                <Icon name="close" size={a.dim(0.03, 16, 22)} color={theme.danger} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Попап выбора источника при входе в Словарь */}
      <Modal visible={source === null} transparent animationType="fade" onRequestClose={() => setSource({ type: 'general' })}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSource({ type: 'general' })}>
          <View style={[styles.pickCard, neuInset(theme, a.radius)]}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Which dictionary to open?')}</Text>
            <TouchableOpacity style={[styles.pickItem]} onPress={() => setSource({ type: 'general' })}>
              <Text style={[styles.pickText, { color: theme.primaryText }]}>{t('General dictionary')}</Text>
            </TouchableOpacity>
            {bookSources.length > 0 ? (
              bookSources.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.pickItem]}
                  onPress={() => setSource({ type: 'book', bookId: b.id })}
                >
                  <Text style={[styles.pickText, { color: theme.primaryText }]} numberOfLines={1}>{t('Dictionary for “{title}”').replace(/\{title\}/g, b.title)}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.pickHint, { color: theme.secondaryText }]}>{t('No books with saved words.')}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Попап выбора источника импорта */}
      <Modal visible={importOpen} transparent animationType="fade" onRequestClose={() => setImportOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setImportOpen(false)}>
          <View style={[styles.pickCard, neuInset(theme, a.radius)]}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Import dictionary from…')}</Text>
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
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Попап выбора книги для извлечения слов */}
      <Modal visible={bookPickOpen} transparent animationType="fade" onRequestClose={() => setBookPickOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBookPickOpen(false)}>
          <View style={[styles.pickCard, neuInset(theme, a.radius)]}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Select a book')}</Text>
            {books.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.pickItem]}
                onPress={() => { importWordsFromBook(b.id); setBookPickOpen(false); }}
              >
                <Text style={[styles.pickText, { color: theme.primaryText }]} numberOfLines={1}>{b.title}</Text>
              </TouchableOpacity>
            ))}
            {books.length === 0 && <Text style={[styles.pickHint, { color: theme.secondaryText }]}>{t('No books.')}</Text>}
          </View>
        </TouchableOpacity>
      </Modal>

      {Platform.OS === 'web' ? (
        <input id="dict-import" type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onWebFile} />
      ) : null}

      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSearchOpen(false)}>
          <View style={[styles.searchPop, neuInset(theme, a.radius)]}>
            <TextInput
              style={[styles.searchInline, neuInset(theme, 10), { borderWidth: 0, color: theme.primaryText }]}
              placeholder={t('Search…')}
              placeholderTextColor={theme.secondaryText}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setConfirmDelete(false)}>
          <View style={[styles.searchPop, neuInset(theme, a.radius)]}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Delete all words?')}</Text>
            <Text style={[styles.pickHint, { color: theme.secondaryText }]}>
              {source?.type === 'book'
                ? t('All words from “{title}” ({n}) will be deleted. This action is irreversible.').replace(/\{title\}/g, headerTitle).replace(/\{n\}/g, String(scopedEntries.length))
                : t('The entire dictionary ({n} words) will be deleted. This action is irreversible.').replace(/\{n\}/g, String(scopedEntries.length))}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.confirmBtn, neuInset(theme, a.radius)]} onPress={() => setConfirmDelete(false)}>
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, neuPrimary(theme, a.radius)]} onPress={confirmDeleteAction}>
                <Text style={[styles.sortTabText, { color: '#fff' }]}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
          <Icon name="plus" size={a.dim(0.05, 22, 28)} color="#fff" />
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

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAddOpen(false)}>
          <View style={[styles.searchPop, neuInset(theme, a.radius)]}>
            <Text style={[styles.pickTitle, { color: theme.primaryText }]}>{t('Add word')}</Text>
            <TextInput
              style={[styles.searchInline, neuInset(theme, 10), { borderWidth: 0, color: theme.primaryText, marginTop: 12 }]}
              placeholder={t('Word')}
              placeholderTextColor={theme.secondaryText}
              value={addWord}
              onChangeText={setAddWord}
              autoFocus
            />
            <TextInput
              style={[styles.searchInline, neuInset(theme, 10), { borderWidth: 0, color: theme.primaryText, marginTop: 10 }]}
              placeholder={t('Translation')}
              placeholderTextColor={theme.secondaryText}
              value={addTrans}
              onChangeText={setAddTrans}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.confirmBtn, neuInset(theme, a.radius)]} onPress={() => setAddOpen(false)}>
                <Text style={[styles.sortTabText, { color: theme.primaryText }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, neuPrimary(theme, a.radius)]}
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
                <Text style={[styles.sortTabText, { color: '#fff' }]}>{t('Add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(a: ReturnType<typeof useAdaptive>, theme: ReturnType<typeof useTheme>) {
  const iconBtn = Math.round(Math.max(32, Math.min(44, 38 * a.scale)));
  const m = a.modal();
  return StyleSheet.create({
    container: { flex: 1, padding: a.pad, width: '100%', maxWidth: a.contentMaxW, alignSelf: 'center' },
    screenTitle: { fontSize: a.title, fontFamily: FONTS.bold, marginBottom: a.gap },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: a.gap, flexWrap: 'wrap' },
    headerActions: { flexDirection: 'row', gap: 8 },
    confirmBtn: { flex: 1, paddingVertical: Math.max(10, Math.round(13 * a.scale)), paddingHorizontal: 16, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    iconBtn: { ...neuCircle(theme, iconBtn), width: iconBtn, height: iconBtn, borderRadius: a.radius, alignItems: 'center', justifyContent: 'center' },
    searchInline: { flex: 1, minWidth: 120, height: iconBtn, ...neuInset(theme, a.radius), paddingHorizontal: 10, fontSize: a.small_fs },
    modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: m.backdropPad },
    searchPop: { width: '100%', maxWidth: Math.min(a.width - 24, 520), borderRadius: a.radius, padding: 12 },
    pickCard: { width: '100%', maxWidth: m.maxWidth, maxHeight: m.maxHeight, borderRadius: a.radius, padding: m.padding },
    pickTitle: { fontSize: a.h2, fontFamily: FONTS.bold, color: theme.secondaryText, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: a.gap, marginBottom: a.gap },
    pickItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: a.tiny ? 12 : 16, paddingHorizontal: a.pad, borderRadius: a.radius, ...neuRaised(theme, a.radius), marginBottom: a.tiny ? 8 : 12 },
    pickText: { fontSize: a.body, fontFamily: FONTS.bold, flexShrink: 1 },
    pickHint: { fontSize: a.small_fs, marginTop: 8, fontStyle: 'italic' },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: a.tiny ? 4 : 6, gap: a.tiny ? 6 : 10, flexWrap: 'wrap', paddingVertical: a.tiny ? 6 : 9, paddingHorizontal: a.tiny ? 10 : 14 },
    counterText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    counterNum: { fontSize: a.body },
    sortBar: { ...neuInset(theme, a.radius), flexDirection: 'row', borderRadius: a.radius, padding: 2, flexWrap: 'wrap' },
    sortTab: { paddingVertical: a.tiny ? 3 : 5, paddingHorizontal: a.tiny ? 7 : 11, borderRadius: Math.max(4, a.radius - 4) },
    sortTabText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    levelBar: { ...neuInset(theme, a.radius), flexDirection: 'row', borderRadius: a.radius, padding: 2, marginBottom: a.tiny ? 4 : 6 },
    levelTab: { flex: 1, paddingVertical: a.tiny ? 3 : 5, borderRadius: Math.max(4, a.radius - 4), alignItems: 'center' },
    levelTabText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    viewBar: { ...neuInset(theme, a.radius), flexDirection: 'row', borderRadius: a.radius, padding: 2, marginBottom: a.gap },
    viewTab: { flex: 1, paddingVertical: a.tiny ? 6 : 8, borderRadius: Math.max(4, a.radius - 4), alignItems: 'center' },
    viewTabText: { fontSize: a.small_fs, fontFamily: FONTS.bold },
    bookBar: { flexDirection: 'row', gap: 6, marginBottom: a.tiny ? 4 : 6, flexWrap: 'wrap' },
    bookChip: { ...neuInset(theme, a.radius), paddingVertical: a.tiny ? 4 : 6, paddingHorizontal: a.tiny ? 9 : 12, borderRadius: a.radius, maxWidth: Math.min(200, a.width * 0.5) },
    bookChipText: { fontSize: a.fs(12), fontFamily: FONTS.bold, flexShrink: 1 },
    fabGroup: { position: 'absolute', right: a.pad, bottom: a.pad + a.tabBarH, flexDirection: 'column', gap: a.gap, alignItems: 'center', zIndex: 50 },
    fab: { width: a.dim(0.06, 46, 56), height: a.dim(0.06, 46, 56), borderRadius: a.dim(0.06, 46, 56) / 2, alignItems: 'center', justifyContent: 'center', ...neuRaised(theme, a.radius) },
    toolbar: { flexDirection: 'row', gap: 8, marginBottom: a.gap },
    search: { flex: 1, ...neuInset(theme, a.radius), paddingHorizontal: 12, paddingVertical: a.tiny ? 7 : 10, fontSize: a.body },
    exportBtn: { borderRadius: a.radius, paddingHorizontal: a.pad, justifyContent: 'center' },
    exportText: { color: '#fff', fontFamily: FONTS.bold, fontSize: a.small_fs },
    list: { paddingBottom: a.pad * 2, gap: a.columns > 1 ? a.gap : 0 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: a.body },
    row: {
      ...neuRaised(theme, a.radius),
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: a.radius,
      padding: a.pad,
      marginBottom: a.columns > 1 ? 0 : a.gap,
      flex: a.columns > 1 ? 1 : undefined,
      minWidth: 0,
    },
    wordLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    word: { fontSize: a.body, fontFamily: FONTS.bold, flexShrink: 1, maxWidth: '70%', wordBreak: 'break-word', overflow: 'hidden' } as any,
    speakInline: { ...neuInset(theme, a.dim(0.05, 28, 34)), alignItems: 'center', justifyContent: 'center' },
    speakInlineIcon: { fontSize: a.fs(14), color: theme.primary },
    lang: { fontSize: a.fs(12), fontFamily: FONTS.regular },
    badge: { ...neuInset(theme, 8), flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeBox: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    freqBadge: { ...neuInset(theme, 8), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    freqText: { fontSize: a.fs(12), fontFamily: FONTS.bold },
    translation: { fontSize: a.body, marginTop: 2 },
    context: { fontSize: a.small_fs, marginTop: 6, fontStyle: 'italic' },
    editInput: { ...neuInset(theme, 8), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: a.body, marginTop: 4 },
    deleteBtn: { ...neuCircle(theme, a.dim(0.05, 28, 38)), alignItems: 'center', justifyContent: 'center' },
  });
}
