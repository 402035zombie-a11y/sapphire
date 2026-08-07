// screens/LibraryScreen.tsx
// Загрузка книг с устройства (.epub/.txt), парсинг в предложения, сохранение в libraryStore.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES, FONTS } from '../theme/constants';
import { useLibraryStore, Book, BookParagraph } from '../store/libraryStore';
import { parseEpub } from '../services/epubParser';
import { parseTxt } from '../services/txtParser';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { langName } from '../utils/languages';
import LanguagePicker from '../components/LanguagePicker';
import ProgressBar from '../components/ProgressBar';

interface Draft {
  title: string;
  author?: string;
  format: 'epub' | 'txt';
  uri: string;
  language: string;
  paragraphs: BookParagraph[];
}

function buildParagraphs(text: string): BookParagraph[] {
  return splitIntoSentences(text).map((sentence, index) => ({
    index,
    original: sentence,
  }));
}

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const books = useLibraryStore((s) => s.books);
  const addBook = useLibraryStore((s) => s.addBook);
  const removeBook = useLibraryStore((s) => s.removeBook);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/x-fictionbook', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      const lower = asset.name.toLowerCase();
      const format: 'epub' | 'txt' = lower.endsWith('.txt') ? 'txt' : 'epub';

      setLoading(true);
      setProgress(0.02);
      let parsed: { text: string; title?: string; author?: string };
      if (format === 'epub') {
        parsed = await parseEpub(asset.uri, setProgress);
      } else {
        parsed = await parseTxt(asset.uri, asset.name.replace(/\.txt$/i, ''), setProgress);
      }
      // разбиение на предложения тоже отражаем как финальный штрих
      setProgress(0.95);
      const paragraphs = buildParagraphs(parsed.text);
      setProgress(1);
      if (paragraphs.length === 0) {
        Alert.alert('Пусто', 'Не удалось извлечь текст из этого файла.');
        return;
      }

      setDraft({
        title: parsed.title || asset.name,
        author: parsed.author,
        format,
        uri: asset.uri,
        language: 'en',
        paragraphs,
      });
    } catch (e: any) {
      Alert.alert('Ошибка чтения', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const book: Book = {
      id: `${draft.title}-${Date.now()}`,
      title: draft.title,
      author: draft.author,
      format: draft.format,
      uri: draft.uri,
      language: draft.language,
      paragraphs: draft.paragraphs,
      createdAt: Date.now(),
    };
    addBook(book);
    setDraft(null);
  };

  const openReader = (bookId: string) => navigation.navigate('Reader', { bookId });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={pickDocument} disabled={loading}>
        <Text style={styles.addButtonText}>Загрузить книгу</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            Читаем файл… {Math.round(progress * 100)}%
          </Text>
          <ProgressBar progress={progress} />
        </View>
      )}

      {draft && (
        <View style={styles.draftCard}>
          <Text style={styles.draftTitle}>{draft.title}</Text>
          <Text style={styles.draftMeta}>
            {draft.format.toUpperCase()} · {draft.paragraphs.length} предложений
          </Text>

          <Text style={styles.label}>Язык оригинала:</Text>
          <TouchableOpacity style={styles.langButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.langButtonText}>{langName(draft.language)}</Text>
            <Text style={styles.langArrow}>▾</Text>
          </TouchableOpacity>

          <View style={styles.draftActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDraft(null)}>
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveDraft}>
              <Text style={styles.saveText}>Сохранить</Text>
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

      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Библиотека пуста. Загрузите первую книгу.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.bookRow} onPress={() => openReader(item.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookMeta}>
                {item.author ? `${item.author} · ` : ''}
                {item.language.toUpperCase()} · {item.paragraphs.length} пр.
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeBook(item.id)} hitSlop={10}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.padding },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SIZES.gap,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontFamily: FONTS.bold },
  draftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.gap,
  },
  draftTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primaryText },
  draftMeta: { color: COLORS.secondaryText, marginTop: 4, marginBottom: SIZES.gap },
  label: { color: COLORS.secondaryText, marginBottom: 8 },
  progressCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.gap },
  progressText: { color: COLORS.secondaryText, marginBottom: 8 },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  langButtonText: { color: COLORS.primaryText, fontSize: 15 },
  langArrow: { color: COLORS.secondaryText },
  draftActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SIZES.gap, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: COLORS.secondaryText },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: SIZES.radius },
  saveText: { color: '#fff', fontFamily: FONTS.bold },
  list: { paddingBottom: 24 },
  empty: { color: COLORS.secondaryText, textAlign: 'center', marginTop: 40 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.gap,
  },
  bookTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.primaryText },
  bookMeta: { color: COLORS.secondaryText, marginTop: 4, fontSize: 13 },
  delete: { color: COLORS.danger, fontSize: 16, paddingHorizontal: 8 },
});
