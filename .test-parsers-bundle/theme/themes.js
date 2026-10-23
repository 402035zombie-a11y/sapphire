Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.THEME_ORDER = exports.THEME_LABELS = exports.THEMES = void 0;
var THEMES = exports.THEMES = {
  day: {
    background: '#EAD9BE',
    surface: '#EAD9BE',
    primary: '#B0651F',
    onPrimary: '#FBF4E4',
    primaryText: '#3F3526',
    secondaryText: '#96805B',
    border: '#CBB891',
    selected: '#DFCDAC',
    success: '#16A34A',
    danger: '#DC2626',
    backdrop: 'rgba(0,0,0,0.45)',
    readerBg: '#F2E6CE',
    readerText: '#4A3F2E',
    readerDim: '#B7A684',
    highlight: '#D99A3E',
    popupBg: '#EAD9BE',
    popupBorder: '#D8C7A6',
    posColor: '#B5742E',
    bgTop: '#F2E6CE',
    bgBot: '#E0CFA8',
    neu: {
      base: '#EAD9BE',
      light: '#FCF3DF',
      dark: '#B5A179',
      shadowDark: 'rgba(150,130,95,0.6)',
      shadowLight: 'rgba(210,195,165,0.7)',
      soft: 'rgba(248,238,217,0.5)',
      hi: 'rgba(255,255,255,0.4)',
      glow: 'rgba(255,250,238,0.3)'
    },
    neuScale: {
      depth: 0.9,
      spread: 0.8,
      lightCut: 1.0
    }
  },
  night: {
    background: '#16171A',
    surface: '#1C1D21',
    primary: '#5C7288',
    onPrimary: '#E8EDF2',
    primaryText: '#E4E7EB',
    secondaryText: '#8B929B',
    border: '#2A2C31',
    selected: '#2E3844',
    success: '#22C55E',
    danger: '#EF4444',
    backdrop: 'rgba(0,0,0,0.6)',
    readerBg: '#16171A',
    readerText: '#DFE3E8',
    readerDim: '#6A6E75',
    highlight: '#7E93A8',
    popupBg: '#1C1D21',
    popupBorder: '#2E3844',
    posColor: '#AFC2D6',
    bgTop: '#212229',
    bgBot: '#0C0D0F',
    neu: {
      base: '#1A1B1F',
      light: '#2D353F',
      dark: '#0B0C0E',
      shadowDark: 'rgba(0,0,0,0.65)',
      shadowLight: 'rgba(140,165,190,0.14)',
      soft: 'rgba(65,78,92,0.42)',
      hi: 'rgba(180,200,220,0.12)',
      glow: 'rgba(100,120,140,0.22)'
    },
    neuScale: {
      depth: 0.85,
      spread: 0.85,
      lightCut: 0.65
    }
  },
  blackout: {
    flat: true,
    background: '#000000',
    surface: '#050505',
    primary: '#232427',
    onPrimary: '#B8B2A6',
    primaryText: '#787468',
    secondaryText: '#56524C',
    border: '#161616',
    selected: '#0E0E0E',
    success: '#22C55E',
    danger: '#EF4444',
    backdrop: 'rgba(0,0,0,0.75)',
    readerBg: '#000000',
    readerText: '#726E64',
    readerDim: '#3C3C40',
    highlight: '#787468',
    popupBg: '#0A0A0A',
    popupBorder: '#161616',
    posColor: '#787468',
    bgTop: '#050505',
    bgBot: '#000000',
    neu: {
      base: '#1A1A1C',
      light: '#242427',
      dark: '#000000',
      shadowDark: 'rgba(0,0,0,0.9)',
      shadowLight: 'rgba(255,255,255,0.04)',
      soft: 'rgba(60,58,54,0.5)',
      hi: 'rgba(255,245,220,0.04)',
      glow: 'rgba(100,92,68,0.25)'
    },
    neuScale: {
      depth: 1,
      spread: 1
    }
  }
};
var THEME_ORDER = exports.THEME_ORDER = ['day', 'night', 'blackout'];
var THEME_LABELS = exports.THEME_LABELS = {
  day: 'Day',
  night: 'Night',
  blackout: 'Blackout'
};