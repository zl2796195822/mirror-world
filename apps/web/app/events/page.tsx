import { requireUser } from "../../lib/auth/require-user";
import {
  formatWorldClock,
  loadClientObserverBundle,
  shortId,
} from "../../lib/client-projection";

export default async function EventsPage() {
  await requireUser();
  const bundle = await loadClientObserverBundle();

  if (bundle.status !== "READY") {
    return (
      <section className="observer" aria-labelledby="events-title">
        <p className="eyebrow">TEMPORAL / EVENTS</p>
        <h1 id="events-title">世界事件</h1>
        <p className="observer__empty">事件流暂不可用。</p>
      </section>
    );
  }

  return (
    <section className="observer" aria-labelledby="events-title">
      <header className="observer__header">
        <div>
          <p className="eyebrow">TEMPORAL / EVENTS</p>
          <h1 id="events-title">世界事件</h1>
        </div>
        <span className="observer__badge observer__badge--live">LIVE</span>
      </header>

      {bundle.events.events.length === 0 ? (
        <p className="observer__empty">暂无正式世界事件。</p>
      ) : (
        <ol className="observer__events observer__events--full">
          {[...bundle.events.events].reverse().map((event) => (
            <li key={event.eventId}>
              <time>
                {formatWorldClock(event.occurredAtWorldTime).dayLabel}{" "}
                {formatWorldClock(event.occurredAtWorldTime).timeLabel}
              </time>
              <span>{shortId(event.residentId)}</span>
              <code>{event.eventType}</code>
              <small>seq {event.worldSeq}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
