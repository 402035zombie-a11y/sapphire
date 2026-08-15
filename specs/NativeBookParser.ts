/**
 * Codegen-спека TurboModule (JSI) для нативного парсингу книг.
 * RN Codegen генерує NativeBookParserSpec (Kotlin) + C++ JSI-біндінги.
 *
 * Повертає JSON-рядок (а не об'єкт) свідомо:
 *  - одна серіалізація в нативному потоці замість тисяч JSI-конвертацій на главу;
 *  - JSON.parse у JS дешевший за bridging великих вкладених структур.
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** Парсить EPUB за шляхом/URI. Повертає JSON ParsedBook. Виконується у нативному пулі потоків. */
  parseEpub(path: string): Promise<string>;
  /** Парсить FB2 (один XML). Повертає JSON ParsedBook. */
  parseFb2(path: string): Promise<string>;
  /** Чи доступний нативний парсер на цій платформі/збірці. */
  isAvailable(): boolean;
}

export default TurboModuleRegistry.get<Spec>('NativeBookParser');
