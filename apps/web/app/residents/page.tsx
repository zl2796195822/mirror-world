import { requireUser } from "../../lib/auth/require-user";
import { loadClientObserverBundle, shortId } from "../../lib/client-projection";

export default async function ResidentsPage() {
  await requireUser();
  const bundle = await loadClientObserverBundle();

  if (bundle.status !== "READY") {
    return (
      <section className="observer" aria-labelledby="residents-title">
        <p className="eyebrow">CONTEXT / RESIDENTS</p>
        <h1 id="residents-title">居民观察</h1>
        <p className="observer__empty">
          居民投影暂不可用。不会用占位人生填充。
        </p>
      </section>
    );
  }

  const placeById = new Map(
    bundle.snapshot.places.map((place) => [place.placeId, place]),
  );

  return (
    <section className="observer" aria-labelledby="residents-title">
      <header className="observer__header">
        <div>
          <p className="eyebrow">CONTEXT / RESIDENTS</p>
          <h1 id="residents-title">居民观察</h1>
        </div>
        <span className="observer__badge observer__badge--live">LIVE</span>
      </header>

      <div className="observer__table-wrap">
        <table className="observer__table">
          <thead>
            <tr>
              <th>Resident</th>
              <th>Place</th>
              <th>Activity</th>
              <th>Started</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {bundle.snapshot.residents.map((resident) => {
              const place = placeById.get(resident.placeId);
              return (
                <tr key={resident.residentId}>
                  <td data-testid="resident-row">
                    <strong>{resident.displayName}</strong>
                    <small>{shortId(resident.residentId)}</small>
                  </td>
                  <td>{place?.displayName ?? "UNKNOWN_PLACE"}</td>
                  <td>
                    <code>{resident.activity}</code>
                  </td>
                  <td>
                    {resident.activityStartedAtWorldTime
                      ? new Date(
                          resident.activityStartedAtWorldTime,
                        ).toISOString()
                      : "—"}
                  </td>
                  <td>
                    {resident.targetPlaceId
                      ? (placeById.get(resident.targetPlaceId)?.displayName ??
                        shortId(resident.targetPlaceId))
                      : resident.participantId
                        ? shortId(resident.participantId)
                        : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
