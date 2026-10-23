var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.persist = persist;
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _asyncStorage = _interopRequireDefault(require("@react-native-async-storage/async-storage"));
var _react = _interopRequireDefault(require("react"));
function buildStore(creator) {
  var state = {};
  var listeners = new Set();
  var setState = function setState(partial) {
    var next = typeof partial === 'function' ? partial(state) : partial;
    var prev = state;
    state = Object.assign({}, state, next);
    listeners.forEach(function (l) {
      return l(state, prev);
    });
  };
  var getState = function getState() {
    return state;
  };
  var subscribe = function subscribe(l) {
    listeners.add(l);
    return function () {
      listeners.delete(l);
    };
  };
  state = creator(setState, getState);
  var useStore = function useStore(selector) {
    var getSnapshot = _react.default.useCallback(function () {
      return selector ? selector(state) : state;
    }, [selector]);
    return _react.default.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  };
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}
function persist(creator, options) {
  var _options$name;
  var useStore = buildStore(creator);
  var key = 'persist:' + ((_options$name = options == null ? void 0 : options.name) != null ? _options$name : 'store');
  var load = function () {
    var _ref = (0, _asyncToGenerator2.default)(function* () {
      try {
        var raw = yield _asyncStorage.default.getItem(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed.entries)) {
            var seen = new Set();
            parsed.entries = parsed.entries.filter(function (e) {
              if (!e || !e.word) return false;
              var k = `${String(e.word).trim().toLowerCase()}|${e.lang || ''}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
          }
          if (typeof (options == null ? void 0 : options.onRehydrateStorage) === 'function') {
            var cb = options.onRehydrateStorage();
            if (typeof cb === 'function') cb(parsed);
          }
          useStore.setState(parsed);
        }
      } catch (e) {
        console.warn('[createStore] rehydrate failed for key=' + key, e);
      }
    });
    return function load() {
      return _ref.apply(this, arguments);
    };
  }();
  var saveTimer = null;
  useStore.subscribe(function (state) {
    var toSave = options != null && options.partialize ? options.partialize(state) : state;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      _asyncStorage.default.setItem(key, JSON.stringify(toSave)).catch(function (e) {
        return console.warn('[createStore] persist save failed for key=' + key, e);
      });
    }, 600);
  });
  load();
  return useStore;
}
function create(creator) {
  return buildStore(creator);
}