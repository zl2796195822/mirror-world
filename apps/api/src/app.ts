import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import swagger from "@fastify/swagger";
import { createDb, worlds } from "@mirror/db";

type Database = ReturnType<typeof createDb>;

export type ApiAppOptions = {
  database?: Database | null;
};

type WorldRecord = {
  id: string;
  name: string;
  timezone: string;
  timeScale: number;
  status: string;
  worldTime: string;
  createdAt: string;
  updatedAt: string;
};

const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "requestId"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" },
        details: { type: "object", additionalProperties: true },
      },
    },
  },
} as const;

const successResponseSchema = (data: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: ["data", "requestId"],
  properties: {
    data,
    requestId: { type: "string" },
  },
});

const statusDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string" },
    service: { type: "string" },
    dependencies: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
};

const worldSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "timezone",
    "timeScale",
    "status",
    "worldTime",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    timezone: { type: "string" },
    timeScale: { type: "integer" },
    status: { type: "string" },
    worldTime: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

function configuredDatabase(): Database | null {
  return process.env.DATABASE_URL ? createDb() : null;
}

function success(
  request: FastifyRequest,
  reply: FastifyReply,
  data: Record<string, unknown>,
) {
  return reply.send({ data, requestId: request.id });
}

function failure(
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return reply.code(statusCode).send({
    error: {
      code,
      message,
      requestId: request.id,
      ...(details ? { details } : {}),
    },
  });
}

function asIsoString(value: Date): string {
  return value.toISOString();
}

function serializeWorld(world: typeof worlds.$inferSelect): WorldRecord {
  return {
    id: world.id,
    name: world.name,
    timezone: world.timezone,
    timeScale: world.timeScale,
    status: world.status,
    worldTime: asIsoString(world.worldTime),
    createdAt: asIsoString(world.createdAt),
    updatedAt: asIsoString(world.updatedAt),
  };
}

export async function buildApp(
  options: ApiAppOptions = {},
): Promise<FastifyInstance> {
  const database =
    options.database === undefined ? configuredDatabase() : options.database;
  const app = Fastify({
    logger: false,
    requestIdHeader: "x-request-id",
  });

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.setNotFoundHandler((request, reply) =>
    failure(request, reply, 404, "NOT_FOUND", "Route not found"),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      const details = error.validation.map((item) => ({
        keyword: item.keyword,
        instancePath: item.instancePath,
        message: item.message,
      }));
      return failure(
        request,
        reply,
        400,
        "VALIDATION_ERROR",
        "Request validation failed",
        { validation: details },
      );
    }

    return failure(
      request,
      reply,
      error.statusCode && error.statusCode < 500 ? error.statusCode : 500,
      error.statusCode && error.statusCode < 500
        ? "REQUEST_ERROR"
        : "INTERNAL_ERROR",
      error.statusCode && error.statusCode < 500
        ? "Request could not be processed"
        : "Internal server error",
    );
  });

  const healthHandler = async (request: FastifyRequest, reply: FastifyReply) =>
    success(request, reply, { status: "ok", service: "mirror-api" });

  const readyHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!database) {
      return failure(
        request,
        reply,
        503,
        "DEPENDENCY_UNAVAILABLE",
        "Required dependencies are not configured",
      );
    }

    try {
      await database.client.unsafe("select 1");
      return success(request, reply, {
        status: "ready",
        dependencies: { database: "ready" },
      });
    } catch {
      return failure(
        request,
        reply,
        503,
        "DEPENDENCY_UNAVAILABLE",
        "Required dependencies are unavailable",
      );
    }
  };

  const worldsHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (!database) {
      return failure(
        request,
        reply,
        503,
        "WORLD_DATA_UNAVAILABLE",
        "World data is not available",
      );
    }

    try {
      const records = await database.db
        .select()
        .from(worlds)
        .orderBy(worlds.createdAt);
      return success(request, reply, {
        worlds: records.map(serializeWorld),
      });
    } catch {
      return failure(
        request,
        reply,
        503,
        "WORLD_DATA_UNAVAILABLE",
        "World data is unavailable",
      );
    }
  };

  const healthSchema = {
    tags: ["operations"],
    response: {
      200: successResponseSchema(statusDataSchema),
    },
  };
  const readySchema = {
    tags: ["operations"],
    response: {
      200: successResponseSchema(statusDataSchema),
      503: errorResponseSchema,
    },
  };
  const worldsSchema = {
    tags: ["worlds"],
    response: {
      200: successResponseSchema({
        type: "object",
        additionalProperties: false,
        required: ["worlds"],
        properties: {
          worlds: { type: "array", items: worldSchema },
        },
      }),
      503: errorResponseSchema,
    },
  };

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Mirror World API",
        version: "0.1.0",
        description:
          "Read-only M1 API skeleton for operational and world metadata access.",
      },
      tags: [
        { name: "operations", description: "Process and dependency status" },
        { name: "worlds", description: "Read-only world metadata" },
      ],
    },
  });

  app.get("/api/v1/health", { schema: healthSchema }, healthHandler);
  app.get("/api/v1/ready", { schema: readySchema }, readyHandler);
  app.get("/api/v1/worlds", { schema: worldsSchema }, worldsHandler);

  // Keep the task's short operational paths usable while the versioned contract is canonical.
  app.get(
    "/health",
    { schema: { ...healthSchema, hide: true } },
    healthHandler,
  );
  app.get("/ready", { schema: { ...readySchema, hide: true } }, readyHandler);
  app.get(
    "/worlds",
    { schema: { ...worldsSchema, hide: true } },
    worldsHandler,
  );

  app.get(
    "/openapi.json",
    {
      schema: {
        tags: ["operations"],
        response: { 200: { type: "object", additionalProperties: true } },
      },
    },
    async () => app.swagger(),
  );

  if (database) {
    app.addHook("onClose", async () => {
      await database.client.end();
    });
  }

  return app;
}
