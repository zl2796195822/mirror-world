import { requireUser } from "../../lib/auth/require-user";

export default async function WorldPage() {
  await requireUser();

  return (
    <section className="world-overview" aria-labelledby="world-overview-title">
      <div className="world-overview__surface">
        <div className="world-overview__grid" aria-hidden="true" />
        <div className="world-overview__surface-copy">
          <p className="eyebrow">WORLD / OVERVIEW</p>
          <h1 id="world-overview-title">
            先看见
            <br />
            世界。
          </h1>
          <p className="body-copy">
            观察台已就绪。当前没有世界事实可供展示，未接入的数据保持为空，不用静态内容代替真实世界。
          </p>
        </div>
        <p className="surface-note" aria-label="当前世界层级">
          <span className="note-label">当前层级</span>
          <strong>WORLD</strong>
          <span>overview / unavailable</span>
        </p>
      </div>

      <aside className="world-overview__rail" aria-label="世界摘要">
        <span className="rail-index">01 / 05</span>
        <dl className="world-overview__facts">
          <div className="world-overview__fact">
            <dt>世界时间</dt>
            <dd data-testid="world-time">未接入</dd>
            <p>World Clock 尚未提供</p>
          </div>
          <div className="world-overview__fact">
            <dt>运行状态</dt>
            <dd data-testid="world-status">未连接</dd>
            <p>没有运行中的世界进程</p>
          </div>
          <div className="world-overview__fact">
            <dt>居民规模</dt>
            <dd data-testid="resident-count">30 个占位</dd>
            <p>居民事实尚未接入</p>
          </div>
        </dl>
        <p className="status-line">
          <span className="status-dot" aria-hidden="true" />
          等待世界快照
        </p>
      </aside>

      <section
        className="world-overview__events"
        aria-labelledby="recent-events-title"
      >
        <div className="world-overview__events-heading">
          <div>
            <p className="eyebrow">TEMPORAL / RECENT EVENTS</p>
            <h2 id="recent-events-title">最近事件</h2>
          </div>
          <span className="rail-hint">EVENTS / 00</span>
        </div>
        <div className="world-overview__events-empty" role="status">
          <span className="world-overview__events-index">—</span>
          <p>事件流尚未接入。没有真实事件时，这里保持空白。</p>
        </div>
      </section>
    </section>
  );
}
