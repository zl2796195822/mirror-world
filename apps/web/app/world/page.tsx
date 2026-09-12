import { requireUser } from "../../lib/auth/require-user";
import {
  activityCounts,
  formatWorldClock,
  loadClientObserverBundle,
  shortId,
} from "../../lib/client-projection";

const ACTIVITY_ORDER = [
  ["MOVE", "MOVE"],
  ["SLEEP", "SLEEP"],
  ["EAT", "EAT"],
  ["WORK", "WORK"],
  ["TALK", "TALK"],
  ["IDLE", "IDLE"],
] as const;

export default async function WorldPage() {
  await requireUser();
  const bundle = await loadClientObserverBundle();

  if (bundle.status !== "READY") {
    return (
      <section className="observer" aria-labelledby="observer-title">
        <header className="observer__header">
          <div>
            <p className="eyebrow">MIRROR WORLD / FIRST STREET</p>
            <h1 id="observer-title">观察端未接入</h1>
          </div>
          <span className="observer__badge observer__badge--stale">
            {bundle.connection}
          </span>
        </header>
        <p className="body-copy" data-testid="observer-unavailable">
          {bundle.reason === "NO_WORLD"
            ? "当前没有可观察的正式世界。"
            : "Client Projection 暂不可用。世界仍在服务端存在，观察端不会伪造数据。"}
        </p>
      </section>
    );
  }

  const { snapshot, events, connection } = bundle;
  const clock = formatWorldClock(snapshot.worldTime);
  const counts = activityCounts(snapshot.residents);
  const livePlaces = [...snapshot.places]
    .filter((place) => place.placeType !== "HOME" || place.residentCount > 0)
    .sort((left, right) => right.residentCount - left.residentCount)
    .slice(0, 8);

  return (
    <section className="observer" aria-labelledby="observer-title">
      <header className="observer__header">
        <div>
          <p className="eyebrow">MIRROR WORLD / FIRST STREET</p>
          <h1 id="observer-title">镜界观察端</h1>
          <p className="observer__clock" data-testid="world-time">
            {clock.dayLabel} · {clock.timeLabel}
          </p>
        </div>
        <div className="observer__meta">
          <span className="observer__badge observer__badge--live">LIVE</span>
          <span className="observer__badge" data-testid="connection-state">
            {connection}
          </span>
          <span className="observer__seq">seq {snapshot.worldSeq}</span>
          <span data-testid="world-status">{snapshot.worldStatus}</span>
        </div>
      </header>

      <section className="observer__panel" aria-labelledby="status-title">
        <div className="observer__panel-heading">
          <h2 id="status-title">WORLD STATUS</h2>
          <p data-testid="resident-count">
            {snapshot.residents.length} residents
          </p>
        </div>
        <div className="observer__stat-grid">
          {ACTIVITY_ORDER.map(([key, label]) => (
            <div key={key} className="observer__stat">
              <span>{label}</span>
              <strong data-testid={`activity-${key.toLowerCase()}`}>
                {counts[key] ?? 0}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="observer__panel" aria-labelledby="places-title">
        <div className="observer__panel-heading">
          <h2 id="places-title">FIRST STREET LIVE</h2>
          <p>read-model visualization</p>
        </div>
        <ul className="observer__places">
          {livePlaces.map((place) => (
            <li key={place.placeId}>
              <span>{place.displayName}</span>
              <strong>{place.residentCount}</strong>
              <small>{place.placeType}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="observer__panel" aria-labelledby="events-title">
        <div className="observer__panel-heading">
          <h2 id="events-title">LIVE WORLD EVENTS</h2>
          <p data-testid="event-count">{events.events.length} recent</p>
        </div>
        {events.events.length === 0 ? (
          <p className="observer__empty">暂无正式世界事件。</p>
        ) : (
          <ol className="observer__events">
            {events.events
              .slice()
              .reverse()
              .slice(0, 12)
              .map((event) => (
                <li key={event.eventId}>
                  <time>
                    {formatWorldClock(event.occurredAtWorldTime).timeLabel}
                  </time>
                  <span data-testid="event-resident">
                    {event.residentId ? shortId(event.residentId) : "WORLD"}
                  </span>
                  <code>{event.eventType}</code>
                </li>
              ))}
          </ol>
        )}
      </section>
    </section>
  );
}
