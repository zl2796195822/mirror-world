import { type PointerEvent as ReactPointerEvent, type MutableRefObject } from 'react';
import type { WeatherType, RuntimeMetrics, CompressionSampleResult } from '../types';
import type { EcctrlHandle } from 'ecctrl';

type DebugUIProps = {
  metrics: RuntimeMetrics;
  onWeatherChange: (w: WeatherType) => void;
  onActorCountChange: (c: number) => void;
  onToggleInstancing: () => void;
  onToggleLOD: () => void;
  onRunCompression: () => void;
  compressionResults: CompressionSampleResult[] | null;
  controller: MutableRefObject<EcctrlHandle | null>;
};

export function DebugUI({
  metrics,
  onWeatherChange,
  onActorCountChange,
  onToggleInstancing,
  onToggleLOD,
  onRunCompression,
  compressionResults,
  controller,
}: DebugUIProps) {
  const press = (movement: Parameters<EcctrlHandle['setMovement']>[0]) => (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    controller.current?.setMovement(movement);
  };

  const release = () => {
    controller.current?.setMovement({
      forward: false,
      backward: false,
      leftward: false,
      rightward: false,
      run: false,
      jump: false,
      joystick: { x: 0, y: 0 },
    });
  };

  const weatherLabel =
    metrics.weather === 'night'
      ? '21:20 / 夜 · 22°C'
      : metrics.weather === 'rain'
      ? '17:10 / 暴雨 · 20°C'
      : '17:36 / 阴 · 24°C';

  return (
    <>
      {/* Ambient Top Bar */}
      <header className="ambient-header" data-testid="ambient-header">
        <div className="location">临江市 · 青禾街区</div>
        <div className="time-weather" data-testid="weather-status">
          {weatherLabel}
        </div>
      </header>

      {/* Debug Metrics Panel */}
      <aside className="metrics" data-testid="metrics-panel">
        <div className="metric-heading">EXP-3D-002 · DEBUG TELEMETRY</div>

        <div className="metric-row">
          <span>FPS / Frame</span>
          <strong data-testid="metric-fps">
            {metrics.fps.toFixed(0)} FPS / {metrics.frameTimeMs.toFixed(1)}ms
          </strong>
        </div>

        <div className="metric-row">
          <span>P95 Frame Time</span>
          <strong data-testid="metric-p95">{metrics.p95FrameTimeMs.toFixed(1)}ms</strong>
        </div>

        <div className="metric-row">
          <span>Draw Calls / Tris</span>
          <strong data-testid="metric-draw-calls">
            {metrics.drawCalls} calls / {metrics.triangles.toLocaleString()} tris
          </strong>
        </div>

        <div className="metric-row">
          <span>GPU Textures / Geo</span>
          <strong data-testid="metric-gpu-res">
            {metrics.textures} tex / {metrics.geometries} geo
          </strong>
        </div>

        <div className="metric-row">
          <span>JS Heap Memory</span>
          <strong data-testid="metric-memory">
            {metrics.memoryMb ? `${metrics.memoryMb.toFixed(1)} MB` : 'browser n/a'}
          </strong>
        </div>

        <div className="metric-row">
          <span>Active Zones</span>
          <strong data-testid="metric-zones">
            {metrics.activeZones.join(', ') || 'none'}
          </strong>
        </div>

        <div className="metric-row">
          <span>VRM Actors</span>
          <strong data-testid="metric-actors">
            {metrics.vrmCount} total (L0: {metrics.lodCounts.lod0}, L1: {metrics.lodCounts.lod1}, L2: {metrics.lodCounts.lod2})
          </strong>
        </div>

        <div className="metric-row">
          <span>Load / First Scene</span>
          <strong data-testid="metric-timing">
            {metrics.loadTimeMs ? `${metrics.loadTimeMs.toFixed(0)}ms` : '--'} /{' '}
            {metrics.firstSceneMs ? `${metrics.firstSceneMs.toFixed(0)}ms` : '--'}
          </strong>
        </div>

        {/* Interactive Controls */}
        <div className="debug-controls-section">
          <div className="control-label">WEATHER</div>
          <div className="btn-group">
            <button
              className={metrics.weather === 'day' ? 'active' : ''}
              onClick={() => onWeatherChange('day')}
            >
              Day
            </button>
            <button
              className={metrics.weather === 'night' ? 'active' : ''}
              onClick={() => onWeatherChange('night')}
            >
              Night
            </button>
            <button
              className={metrics.weather === 'rain' ? 'active' : ''}
              onClick={() => onWeatherChange('rain')}
            >
              Rain
            </button>
          </div>

          <div className="control-label">ACTORS (VRM)</div>
          <div className="btn-group">
            {[0, 5, 15, 30].map((num) => (
              <button
                key={num}
                className={metrics.vrmCount === num ? 'active' : ''}
                onClick={() => onActorCountChange(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="control-label">OPTIMIZATIONS</div>
          <div className="btn-group">
            <button
              className={metrics.instancingEnabled ? 'active' : ''}
              onClick={onToggleInstancing}
            >
              Instancing: {metrics.instancingEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              className={metrics.lodEnabled ? 'active' : ''}
              onClick={onToggleLOD}
            >
              LOD: {metrics.lodEnabled ? 'Dynamic' : 'Force L0'}
            </button>
          </div>

          <button className="benchmark-btn" onClick={onRunCompression}>
            Run Compression Benchmark
          </button>
        </div>

        {compressionResults && (
          <div className="compression-results">
            <div className="control-label">COMPRESSION RESULTS</div>
            {compressionResults.map((r, i) => (
              <div key={i} className="comp-row">
                <span className="comp-name">{r.name}:</span>
                <span className="comp-val">
                  {r.rawBytes ? `${(r.rawBytes / 1024).toFixed(1)}KB` : ''}{' '}
                  {r.loadTimeMs ? `(${r.loadTimeMs.toFixed(0)}ms)` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="metric-note">DEBUG ONLY · 非镜界产品 UI · 视觉参考 A01</div>
      </aside>

      {/* Controls Hint */}
      <div className="controls-hint">
        WASD / 方向键移动 · Shift 跑步 · 鼠标拖拽旋转镜头
      </div>

      {/* Mobile Touch Controls */}
      <div className="touch-controls" aria-label="移动端实验性触控操作">
        <div className="touch-pad">
          <button
            aria-label="向前"
            onPointerDown={press({ forward: true })}
            onPointerUp={release}
            onPointerCancel={release}
          >
            ↑
          </button>
          <div>
            <button
              aria-label="向左"
              onPointerDown={press({ leftward: true })}
              onPointerUp={release}
              onPointerCancel={release}
            >
              ←
            </button>
            <button
              aria-label="向右"
              onPointerDown={press({ rightward: true })}
              onPointerUp={release}
              onPointerCancel={release}
            >
              →
            </button>
          </div>
          <button
            aria-label="向后"
            onPointerDown={press({ backward: true })}
            onPointerUp={release}
            onPointerCancel={release}
          >
            ↓
          </button>
        </div>
        <button
          className="touch-run"
          aria-label="跑步"
          onPointerDown={press({ forward: true, run: true })}
          onPointerUp={release}
          onPointerCancel={release}
        >
          跑
        </button>
      </div>
    </>
  );
}
