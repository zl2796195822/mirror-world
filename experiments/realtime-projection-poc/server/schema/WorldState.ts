/**
 * Colyseus Schema Definitions for World Projection
 * 
 * BOUNDARY:
 * This schema represents the ephemeral realtime projection state.
 * It is serialized and diffed via @colyseus/schema binary protocol.
 * It is NOT the persistent database schema.
 */

import { Schema, type, MapSchema } from "@colyseus/schema";

export class ProjectionEntitySchema extends Schema {
  @type("string") entityId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") heading: number = 0;
  @type("string") activityState: string = "idle";
  @type("number") version: number = 0;
}

export class WorldStateSchema extends Schema {
  @type("number") tick: number = 0;
  @type("number") worldTime: number = 0;
  @type({ map: ProjectionEntitySchema }) entities = new MapSchema<ProjectionEntitySchema>();
}
