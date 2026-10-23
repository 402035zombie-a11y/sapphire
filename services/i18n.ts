// TEST SHORTCUT — resolves the bare directory import "../i18n" used by services/*.ts in Node.
// Node ESM cannot load a directory-name module; re-export the real i18n layer so parser code
// (which does `import { tStatic } from '../i18n'`) runs unchanged.
export {
  resolveAppLang,
  translateUi,
  useT,
  tStatic,
} from '../i18n/index';
