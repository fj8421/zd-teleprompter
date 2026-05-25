import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { useSettings } from '../store/SettingsContext';
import { SETTINGS_LIMITS } from '../config/settingsDefaults';

const SegmentButton = ({ active, children, onClick }) => (
  <button
    className={`btn ${active ? 'btn-primary' : 'btn-text'}`}
    onClick={onClick}
    style={{ padding: '6px 14px', fontSize: '14px', minWidth: '72px' }}
  >
    {children}
  </button>
);

const inlineDividerStyle = {
  width: '1px',
  alignSelf: 'stretch',
  background: 'var(--divider)',
};

export const SettingsSheet = ({
  isOpen,
  onClose,
  textUnits,
  onSpeedPreviewStart,
  onSpeedPreviewEnd,
  cameraDevices = []
}) => {
  const { settings, dispatch } = useSettings();
  const focusGuideEnabled = settings.focusGuideEnabled !== false;
  const speedLabel = settings.speedMode === 'mic' ? '麦克风自动' : `${settings.speed} wpm`;
  const resolutionOptions = [480, 720, 1080];
  const namedDevices = cameraDevices.filter((d) => d.deviceId);

  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="settings-sheet-content" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              设置
              {Number.isFinite(textUnits) && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '500' }}>
                  （{textUnits}字）
                </span>
              )}
            </h2>
            <button onClick={onClose} style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
              ×
            </button>
          </div>

          <div className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', fontSize: '15px' }}>
                <span>阅读速度({speedLabel})</span>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <SegmentButton
                    active={settings.speedMode === 'manual'}
                    onClick={() => dispatch({ type: 'SET_SPEED_MODE', value: 'manual' })}
                  >
                    手动
                  </SegmentButton>
                  <SegmentButton
                    active={settings.speedMode === 'mic'}
                    onClick={() => dispatch({ type: 'SET_SPEED_MODE', value: 'mic' })}
                  >
                    麦克风
                  </SegmentButton>
                </div>
              </div>

              {settings.speedMode === 'manual' ? (
                <Slider
                  value={settings.speed}
                  min={SETTINGS_LIMITS.speed.min}
                  max={SETTINGS_LIMITS.speed.max}
                  step={SETTINGS_LIMITS.speed.step}
                  onChange={(value) => dispatch({ type: 'SET_SPEED', value })}
                  onDragStart={onSpeedPreviewStart}
                  onDragEnd={onSpeedPreviewEnd}
                />
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', fontSize: '14px' }}>
                    <span>麦克风校准</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {settings.micSpeedFactor.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={settings.micSpeedFactor}
                    min={SETTINGS_LIMITS.micSpeedFactor.min}
                    max={SETTINGS_LIMITS.micSpeedFactor.max}
                    step={SETTINGS_LIMITS.micSpeedFactor.step}
                    onChange={(value) => dispatch({ type: 'SET_MIC_SPEED_FACTOR', value: Math.round(value * 10) / 10 })}
                  />
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 'var(--space-sm)' }}>
                    麦克风模式会自动估算语速，左右方向键可按 0.1x 调整校准系数。
                  </div>
                </div>
              )}
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', fontSize: '15px' }}>
                  <span>字号</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{settings.fontSize} px</span>
                </div>
                <Slider
                  value={settings.fontSize}
                  min={SETTINGS_LIMITS.fontSize.min}
                  max={SETTINGS_LIMITS.fontSize.max}
                  step={SETTINGS_LIMITS.fontSize.step}
                  onChange={(value) => dispatch({ type: 'SET_FONT_SIZE', value })}
                />
              </div>

              <div style={inlineDividerStyle} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', fontSize: '15px' }}>
                  <span>行距</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{settings.lineHeight.toFixed(1)}</span>
                </div>
                <Slider
                  value={settings.lineHeight}
                  min={SETTINGS_LIMITS.lineHeight.min}
                  max={SETTINGS_LIMITS.lineHeight.max}
                  step={SETTINGS_LIMITS.lineHeight.step}
                  onChange={(value) => dispatch({ type: 'SET_LINE_HEIGHT', value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)', gap: 'var(--space-md)', alignItems: 'center' }}>
              <div
                onClick={() => dispatch({ type: 'SET_FOCUS_GUIDE_ENABLED', value: !focusGuideEnabled })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '15px' }}>辅助阅读框</span>
                <Toggle
                  value={focusGuideEnabled}
                  onChange={(value) => dispatch({ type: 'SET_FOCUS_GUIDE_ENABLED', value })}
                />
              </div>

              <div style={inlineDividerStyle} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                <span style={{ fontSize: '15px' }}>对齐方式</span>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flex: 1, justifyContent: 'flex-end' }}>
                  <SegmentButton
                    active={settings.align === 'center'}
                    onClick={() => dispatch({ type: 'SET_ALIGN', value: 'center' })}
                  >
                    居中
                  </SegmentButton>
                  <SegmentButton
                    active={settings.align === 'justify'}
                    onClick={() => dispatch({ type: 'SET_ALIGN', value: 'justify' })}
                  >
                    两端
                  </SegmentButton>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>录像</span>
                <Toggle
                  value={!!settings.cameraEnabled}
                  onChange={(value) => dispatch({ type: 'SET_CAMERA_ENABLED', value })}
                />
              </div>

              {settings.cameraEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>画质</span>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {resolutionOptions.map((value) => (
                        <SegmentButton
                          key={value}
                          active={settings.cameraResolution === value}
                          onClick={() => dispatch({ type: 'SET_CAMERA_RESOLUTION', value })}
                        >
                          {value}p
                        </SegmentButton>
                      ))}
                    </div>
                  </div>

                  {namedDevices.length > 1 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>设备</span>
                      <select
                        value={settings.cameraDeviceId || ''}
                        onChange={(event) => dispatch({ type: 'SET_CAMERA_DEVICE_ID', value: event.target.value || null })}
                        className="input"
                        style={{ maxWidth: '60%', padding: '6px 10px', fontSize: '14px' }}
                      >
                        <option value="">自动（{settings.cameraFacing === 'environment' ? '后置' : '前置'}）</option>
                        {namedDevices.map((d, idx) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `摄像头 ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>朝向</span>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <SegmentButton
                          active={settings.cameraFacing !== 'environment'}
                          onClick={() => { dispatch({ type: 'SET_CAMERA_DEVICE_ID', value: null }); dispatch({ type: 'SET_CAMERA_FACING', value: 'user' }); }}
                        >
                          前置
                        </SegmentButton>
                        <SegmentButton
                          active={settings.cameraFacing === 'environment'}
                          onClick={() => { dispatch({ type: 'SET_CAMERA_DEVICE_ID', value: null }); dispatch({ type: 'SET_CAMERA_FACING', value: 'environment' }); }}
                        >
                          后置
                        </SegmentButton>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() => dispatch({ type: 'SET_PIP_MIRROR', value: !settings.pipMirror })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>预览镜像</span>
                    <Toggle
                      value={!!settings.pipMirror}
                      onChange={(value) => dispatch({ type: 'SET_PIP_MIRROR', value })}
                    />
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    录制停止后可先预览再下载，视频不会上传或保存到云端。预览镜像仅影响画中画显示，录制画面始终为真实方向。
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'nowrap', overflowX: 'auto' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>快捷键</span>
              <span>空格:播放/暂停 | ←/→:调整速度 | ↑/↓:调整指示线 | M:水平镜像 | V:垂直镜像 | F:全屏 | R:重播 | C:摄像头 | O:录制</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
