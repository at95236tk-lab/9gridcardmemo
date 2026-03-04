const BASE_MIN_PX = 50;
const PANEL_AUTO_SCALE_PADDING = 56;
const MOTION_FAST_MS = 100;
const MOTION_BASE_MS = 200;

export const UI_TOKENS = {
  typography: {
    titleMaxLength: 80,
    memoNameMaxLength: 40,
  },
  sizing: {
    customPxMin: BASE_MIN_PX,
    customMmMin: 5,
    customMmStep: 0.5,
    gridCount: 3,
  },
  slider: {
    zoom: { min: BASE_MIN_PX, max: 300, step: 5, default: 100 },
    fontPt: { min: 3, max: 24, step: 0.5 },
  },
  panel: {
    mobileBreakpoint: 900,
    autoScalePaddingX: PANEL_AUTO_SCALE_PADDING,
    autoScalePaddingY: PANEL_AUTO_SCALE_PADDING,
  },
  history: {
    limit: 200,
  },
  export: {
    delayMs: 80,
    printMm: { width: 210, height: 297 },
    webDpi: 72,
    printDpi: 300,
    webRenderScale: 4,
    printRenderScale: 1,
    canvas: {
      backgroundColor: '#fff',
      borderColor: '#333',
      textColor: '#1a1a1a',
      webLineWidth: 0.5,
      printLineWidth: 2,
      lineHeightMultiplier: 2.0,
      charSpacingRatio: 0.18,
    },
  },
  motion: {
    transitionMsFast: MOTION_FAST_MS,
    transitionMsBase: MOTION_BASE_MS,
  },
} as const;
