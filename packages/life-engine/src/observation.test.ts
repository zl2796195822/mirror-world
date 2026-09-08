import { describe, expect, it } from "vitest";
import type { ObservationQueryPort } from "./observation.js";

describe("Life Engine observation port", () => {
  it("requires an explicit world-scoped resident query", () => {
    const query: ObservationQueryPort = {
      async getResidentObservation(input) {
        return {
          policyVersion: "m3-observation-v1",
          worldId: input.worldId,
          subjectResidentId: input.residentId,
          worldSeed: "fixture",
          worldTime: "2026-09-08T08:00:00.000Z",
          worldStatus: "PAUSED",
          sourceWorldSeq: "0",
          self: {
            residentId: input.residentId,
            identityKind: "NATIVE",
            homeLocationId: "home",
            profileVersion: "first-street-v1",
            profile: {
              personality: { conscientiousness: 0.5, extraversion: 0.5 },
              routine: {
                sleepPhase: "STANDARD",
                mealPhase: "STANDARD",
                socialWindow: "AFTERNOON",
                flexibility: 0.5,
              },
            },
            employment: {
              status: "UNEMPLOYED",
              workplaceId: null,
              role: null,
            },
          },
          actorRef: {
            status: "UNAVAILABLE",
            reasonCode: "ACTOR_REF_PENDING",
          },
          location: {
            status: "UNAVAILABLE",
            reasonCode: "CURRENT_LOCATION_UNAVAILABLE",
          },
          activity: {
            status: "UNAVAILABLE",
            reasonCode: "CURRENT_ACTIVITY_UNAVAILABLE",
          },
          workObligation: {
            status: "UNAVAILABLE",
            reasonCode: "OBLIGATION_SOURCE_UNAVAILABLE",
          },
          resources: {
            status: "UNAVAILABLE",
            reasonCode: "RESOURCE_BRIDGE_PENDING",
          },
          localContext: {
            status: "UNAVAILABLE",
            reasonCode: "LOCAL_CONTEXT_UNAVAILABLE",
            entities: [],
          },
        };
      },
      async getResidentObservations(input) {
        return Promise.all(
          input.residentIds.map((residentId) =>
            this.getResidentObservation({ ...input, residentId }),
          ),
        );
      },
    };

    expect(query.getResidentObservation).toBeTypeOf("function");
    expect(query.getResidentObservations).toBeTypeOf("function");
  });
});
