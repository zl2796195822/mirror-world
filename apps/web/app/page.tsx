import Link from "next/link";
import { requireUser } from "../lib/auth/require-user";

export default async function HomePage() {
  await requireUser();

  return (
    <section
      className="world-context world-context--home"
      aria-labelledby="home-title"
    >
      <div className="world-surface">
        <div className="surface-orbit surface-orbit--one" aria-hidden="true" />
        <div className="surface-orbit surface-orbit--two" aria-hidden="true" />
        <div className="surface-content">
          <p className="eyebrow">回归 / WORLD</p>
          <h1 id="home-title">
            先看见世界，
            <br />
            再理解它。
          </h1>
          <p className="body-copy">
            镜界是一个持续存在的数字社会。当前产品壳已就绪，世界快照尚未接入。
          </p>
          <Link className="quiet-action" href="/world">
            进入世界观察 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="surface-note" aria-label="当前产品状态">
          <span className="note-label">当前层级</span>
          <strong>WORLD</strong>
          <span>最低信息密度</span>
        </div>
      </div>
      <aside className="context-rail" aria-label="当前状态">
        <span className="rail-index">01 / 05</span>
        <p>
          这里不是任务列表。
          <br />
          这是一个尚待接入事实的观察入口。
        </p>
        <span className="rail-hint">M1-T01 · SHELL READY</span>
      </aside>
    </section>
  );
}
