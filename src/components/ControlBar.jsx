import { IconButton } from './IconButton';

const ControlIcon = ({ children }) => (
  <svg
    className="control-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const PlayIcon = () => (
  <ControlIcon>
    <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
  </ControlIcon>
);

const PauseIcon = () => (
  <ControlIcon>
    <path d="M8 5v14" />
    <path d="M16 5v14" />
  </ControlIcon>
);

const MirrorHorizontalIcon = () => (
  <ControlIcon>
    <path d="M12 4v16" />
    <path d="M5 8l-3 4 3 4" />
    <path d="M19 8l3 4-3 4" />
    <path d="M9 7H5v10h4" />
    <path d="M15 7h4v10h-4" />
  </ControlIcon>
);

const MirrorVerticalIcon = () => (
  <ControlIcon>
    <path d="M4 12h16" />
    <path d="M8 5l4-3 4 3" />
    <path d="M8 19l4 3 4-3" />
    <path d="M7 9V5h10v4" />
    <path d="M7 15v4h10v-4" />
  </ControlIcon>
);

const FullscreenIcon = () => (
  <ControlIcon>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </ControlIcon>
);

const ExitFullscreenIcon = () => (
  <ControlIcon>
    <path d="M9 3v4a2 2 0 0 1-2 2H3" />
    <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    <path d="M9 21v-4a2 2 0 0 0-2-2H3" />
    <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
  </ControlIcon>
);

const MenuIcon = () => (
  <ControlIcon>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </ControlIcon>
);

const CamcorderIcon = () => (
  <ControlIcon>
    <rect x="2" y="7" width="14" height="10" rx="2" />
    <path d="M16 10l5-3v10l-5-3z" fill="currentColor" stroke="currentColor" />
  </ControlIcon>
);

const StopIcon = () => (
  <ControlIcon>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </ControlIcon>
);

const formatRecDuration = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

export const ControlBar = ({
  isPlaying,
  onTogglePlay,
  onToggleMirrorH,
  onToggleMirrorV,
  onToggleFullscreen,
  onOpenSettings,
  onToggleCamera,
  cameraEnabled,
  isRecording,
  recordingDurationMs,
  isFullscreen,
  mirrorH,
  mirrorV
}) => {
  const cameraLabel = isRecording
    ? `停止录制 ${formatRecDuration(recordingDurationMs || 0)}`
    : cameraEnabled
      ? '开始录制'
      : '开启摄像头';
  return (
    <div
      data-no-scrub="true"
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 var(--space-lg)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
        zIndex: 230
      }}
    >
      <IconButton
        icon={isPlaying ? <PauseIcon /> : <PlayIcon />}
        label={isPlaying ? '暂停' : '播放'}
        onClick={onTogglePlay}
      />

      <IconButton
        icon={<MirrorHorizontalIcon />}
        label="水平镜像"
        onClick={onToggleMirrorH}
        className={mirrorH ? 'active' : ''}
      />

      <IconButton
        icon={<MirrorVerticalIcon />}
        label="垂直镜像"
        onClick={onToggleMirrorV}
        className={mirrorV ? 'active' : ''}
      />

      <IconButton
        icon={isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        label={isFullscreen ? '退出全屏' : '全屏'}
        onClick={onToggleFullscreen}
      />

      <IconButton
        icon={isRecording ? <StopIcon /> : <CamcorderIcon />}
        label={cameraLabel}
        onClick={onToggleCamera}
        className={isRecording ? 'icon-btn-recording' : cameraEnabled ? 'icon-btn-camera-on' : ''}
      />

      <IconButton
        icon={<MenuIcon />}
        label="设置"
        onClick={onOpenSettings}
      />
    </div>
  );
};
