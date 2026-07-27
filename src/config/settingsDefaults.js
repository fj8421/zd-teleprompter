export const SETTINGS_DEFAULTS = {
  // 手动阅读速度，单位 WPM。
  speed: 290,
  // 阅读速度模式：manual 为手动，mic 为麦克风自动。
  speedMode: 'manual',
  // 麦克风自动语速校准系数。
  micSpeedFactor: 1.0,
  // 播放页文字字号，单位 px。
  fontSize: 32,
  // 播放页文字行高倍数。
  lineHeight: 1.5,
  // 播放页文本区域宽度百分比。
  width: 40,
  // 播放页文本对齐方式：center 或 justify。
  align: 'center',
  // 是否水平镜像显示。
  mirrorH: false,
  // 是否垂直镜像显示。
  mirrorV: false,
  // 指示线模式预留字段。
  indicatorMode: 'free',
  // 指示线垂直位置百分比。
  indicatorPos: 50,
  // 是否开启辅助阅读框。
  focusGuideEnabled: true,
  // 辅助阅读框高度百分比。
  focusGuideHeight: 30,
  // 是否开启摄像头。
  cameraEnabled: false,
  // 摄像头朝向：'user' 前置 / 'environment' 后置。
  cameraFacing: 'user',
  // 指定摄像头设备 ID（桌面端多摄像头选择）。
  cameraDeviceId: null,
  // 录制分辨率：480 / 720 / 1080。
  cameraResolution: 720,
  // PiP 浮窗位置（用相对比例，0 在左/上，1 在右/下；不随屏幕旋转跳出可见区域）。
  pipPosition: { xRatio: 0.985, yRatio: 0.88 },
  // PiP 浮窗缩放倍数。
  pipScale: 1.0,
  // PiP 预览是否镜像。
  pipMirror: true
};

export const SETTINGS_LIMITS = {
  // 手动阅读速度范围和步进，单位 WPM。
  speed: { min: 60, max: 720, step: 5 },
  // 麦克风语速校准系数范围和步进。
  micSpeedFactor: { min: 0.5, max: 5.0, step: 0.1 },
  // 播放页字号范围和步进，单位 px。
  fontSize: { min: 16, max: 96, step: 2 },
  // 播放页行高范围和步进。
  lineHeight: { min: 1.0, max: 2.5, step: 0.1 },
  // 文本区域宽度百分比范围和步进。
  width: { min: 20, max: 100, step: 5 },
  // 指示线垂直位置百分比范围和步进。
  indicatorPos: { min: 10, max: 90, step: 1 },
  // 辅助阅读框高度百分比范围和步进。
  focusGuideHeight: { min: 6, max: 50, step: 1 },
  // PiP 浮窗缩放范围和步进。
  pipScale: { min: 0.25, max: 2.5, step: 0.05 }
};

export const APP_LIMITS = {
  // 浏览器本地最多保存的文本数量。
  maxTexts: 5
};
