import { createContext, useContext, useReducer, useEffect } from 'react';
import { SETTINGS_DEFAULTS, SETTINGS_LIMITS } from '../config/settingsDefaults';

const SettingsContext = createContext();

const normalizeLoadedSettings = (value) => {
  const normalized = value && typeof value === 'object'
    ? { ...SETTINGS_DEFAULTS, ...value }
    : { ...SETTINGS_DEFAULTS };

  if (normalized.speedMode !== 'manual' && normalized.speedMode !== 'mic') {
    normalized.speedMode = normalized.micEnabled ? 'mic' : 'manual';
  }

  normalized.micSpeedFactor = Math.max(
    SETTINGS_LIMITS.micSpeedFactor.min,
    Math.min(SETTINGS_LIMITS.micSpeedFactor.max, Number(normalized.micSpeedFactor) || SETTINGS_DEFAULTS.micSpeedFactor)
  );

  delete normalized.micEnabled;

  normalized.indicatorMode = 'free';

  return normalized;
};

const settingsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SPEED':
      return { ...state, speed: action.value };
    case 'SET_MIC_SPEED_FACTOR':
      return {
        ...state,
        micSpeedFactor: Math.max(
          SETTINGS_LIMITS.micSpeedFactor.min,
          Math.min(SETTINGS_LIMITS.micSpeedFactor.max, action.value)
        )
      };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.value };
    case 'SET_LINE_HEIGHT':
      return { ...state, lineHeight: action.value };
    case 'SET_WIDTH':
      return { ...state, width: action.value };
    case 'SET_ALIGN':
      return { ...state, align: action.value };
    case 'TOGGLE_MIRROR_H':
      return { ...state, mirrorH: !state.mirrorH };
    case 'TOGGLE_MIRROR_V':
      return { ...state, mirrorV: !state.mirrorV };
    case 'SET_INDICATOR_POS':
      return { ...state, indicatorPos: action.value };
    case 'SET_FOCUS_GUIDE_ENABLED':
      return { ...state, focusGuideEnabled: action.value };
    case 'SET_FOCUS_GUIDE_HEIGHT':
      return { ...state, focusGuideHeight: action.value };
    case 'SET_SPEED_MODE':
      return { ...state, speedMode: action.value };
    case 'LOAD':
      return { ...state, ...normalizeLoadedSettings(action.value) };
    case 'SET_CAMERA_ENABLED':
      return { ...state, cameraEnabled: !!action.value };
    case 'SET_CAMERA_FACING':
      return { ...state, cameraFacing: action.value === 'environment' ? 'environment' : 'user' };
    case 'SET_CAMERA_DEVICE_ID':
      return { ...state, cameraDeviceId: action.value || null };
    case 'SET_CAMERA_RESOLUTION':
      return { ...state, cameraResolution: action.value };
    case 'SET_PIP_POSITION':
      return { ...state, pipPosition: action.value };
    case 'SET_PIP_SCALE':
      return {
        ...state,
        pipScale: Math.max(
          SETTINGS_LIMITS.pipScale.min,
          Math.min(SETTINGS_LIMITS.pipScale.max, Number(action.value) || 1)
        )
      };
    case 'SET_PIP_MIRROR':
      return { ...state, pipMirror: !!action.value };
    default:
      return state;
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(settingsReducer, SETTINGS_DEFAULTS);

  // 加载持久化设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tp.settings');
      if (saved) {
        dispatch({ type: 'LOAD', value: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  // 保存设置（防抖，避免拖动滑块时高频写入）
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('tp.settings', JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, dispatch }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
