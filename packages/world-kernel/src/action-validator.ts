import { safeParseActionRequest, type ActionRequest } from "@mirror/contracts";
import type { WorldClockStatus } from "./world-clock.js";

export type KernelReasonCode =
  | "KERNEL_INVALID_ACTION"
  | "KERNEL_ACTOR_NOT_FOUND"
  | "KERNEL_PERMISSION_DENIED"
  | "KERNEL_INVALID_LOCATION"
  | "KERNEL_INSUFFICIENT_FUNDS"
  | "KERNEL_INSUFFICIENT_RESOURCE"
  | "KERNEL_CONFLICT"
  | "KERNEL_DUPLICATE_REQUEST"
  | "WORLD_NOT_RUNNING";

export type KernelLocationCapability = "SLEEP" | "WORK" | "EAT" | "SHOP";

export type KernelLocationSnapshot = {
  id: string;
  worldId: string;
  reachableFrom: readonly string[];
  capabilities: readonly KernelLocationCapability[];
};

export type KernelActorSnapshot = {
  id: string;
  worldId: string;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  locationId: string;
  allowedRequesters: readonly ActionRequest["requestedBy"][];
  inventory: Readonly<Record<string, number>>;
  balanceCents: number;
  employmentWorkplaceId?: string;
};

export type KernelItemSnapshot = {
  id: string;
  worldId: string;
  locationId: string;
  isFood: boolean;
  priceCents: number;
  stockQuantity: number;
};

export type ActionValidationContext = {
  world: {
    id: string;
    status: WorldClockStatus;
    worldTime: Date;
  };
  actors: readonly KernelActorSnapshot[];
  locations: readonly KernelLocationSnapshot[];
  items: readonly KernelItemSnapshot[];
};

export type ActionValidationFailure = {
  accepted: false;
  reasonCode: KernelReasonCode;
};

export type ActionValidationSuccess = {
  accepted: true;
  request: ActionRequest;
  actorVersion: number;
  worldTime: Date;
};

export type ActionValidationResult =
  | ActionValidationFailure
  | ActionValidationSuccess;

function reject(reasonCode: KernelReasonCode): ActionValidationFailure {
  return { accepted: false, reasonCode };
}

function hasCapability(
  location: KernelLocationSnapshot,
  capability: KernelLocationCapability,
): boolean {
  return location.capabilities.includes(capability);
}

function validDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function validateActionRequest(
  input: unknown,
  context: ActionValidationContext,
): ActionValidationResult {
  const parsed = safeParseActionRequest(input);
  if (!parsed.success) {
    return reject("KERNEL_INVALID_ACTION");
  }

  const request = parsed.data;
  const { world } = context;
  if (world.id !== request.worldId || !validDate(world.worldTime)) {
    return reject("KERNEL_INVALID_ACTION");
  }

  const actor = context.actors.find(
    (candidate) =>
      candidate.id === request.actorId && candidate.worldId === world.id,
  );
  if (!actor || actor.status !== "ACTIVE") {
    return reject("KERNEL_ACTOR_NOT_FOUND");
  }

  if (!actor.allowedRequesters.includes(request.requestedBy)) {
    return reject("KERNEL_PERMISSION_DENIED");
  }

  if (world.status !== "RUNNING") {
    return reject("WORLD_NOT_RUNNING");
  }

  const requestedAtWorldTime = new Date(request.requestedAtWorldTime);
  if (
    !validDate(requestedAtWorldTime) ||
    requestedAtWorldTime.getTime() > world.worldTime.getTime()
  ) {
    return reject("KERNEL_INVALID_ACTION");
  }

  if (
    request.expectedActorVersion !== undefined &&
    request.expectedActorVersion !== actor.version
  ) {
    return reject("KERNEL_CONFLICT");
  }

  const currentLocation = context.locations.find(
    (location) =>
      location.id === actor.locationId && location.worldId === world.id,
  );

  switch (request.actionType) {
    case "MOVE": {
      const destination = context.locations.find(
        (location) =>
          location.id === request.parameters.destinationId &&
          location.worldId === world.id,
      );
      if (
        !destination ||
        !currentLocation ||
        destination.id === currentLocation.id ||
        !destination.reachableFrom.includes(currentLocation.id)
      ) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      break;
    }
    case "EAT": {
      const item = context.items.find(
        (candidate) =>
          candidate.id === request.parameters.itemId &&
          candidate.worldId === world.id,
      );
      const quantity = request.parameters.quantity;
      if (
        !item ||
        !item.isFood ||
        !currentLocation ||
        !hasCapability(currentLocation, "EAT") ||
        item.locationId !== currentLocation.id
      ) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      if ((actor.inventory[item.id] ?? 0) < quantity) {
        return reject("KERNEL_INSUFFICIENT_RESOURCE");
      }
      break;
    }
    case "SLEEP": {
      if (!currentLocation || !hasCapability(currentLocation, "SLEEP")) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      break;
    }
    case "WORK": {
      const workplace = context.locations.find(
        (location) =>
          location.id === request.parameters.workplaceId &&
          location.worldId === world.id,
      );
      if (
        !workplace ||
        !currentLocation ||
        currentLocation.id !== workplace.id ||
        !hasCapability(workplace, "WORK")
      ) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      if (actor.employmentWorkplaceId !== workplace.id) {
        return reject("KERNEL_INSUFFICIENT_RESOURCE");
      }
      break;
    }
    case "TALK": {
      const participant = context.actors.find(
        (candidate) =>
          candidate.id === request.parameters.participantId &&
          candidate.worldId === world.id,
      );
      if (!participant || participant.status !== "ACTIVE") {
        return reject("KERNEL_ACTOR_NOT_FOUND");
      }
      if (!currentLocation || participant.locationId !== actor.locationId) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      break;
    }
    case "BUY": {
      const item = context.items.find(
        (candidate) =>
          candidate.id === request.parameters.itemId &&
          candidate.worldId === world.id,
      );
      const quantity = request.parameters.quantity;
      if (
        !item ||
        !currentLocation ||
        !hasCapability(currentLocation, "SHOP") ||
        item.locationId !== currentLocation.id
      ) {
        return reject("KERNEL_INVALID_LOCATION");
      }
      if (item.stockQuantity < quantity) {
        return reject("KERNEL_INSUFFICIENT_RESOURCE");
      }
      if (
        !Number.isSafeInteger(item.priceCents) ||
        item.priceCents < 0 ||
        !Number.isSafeInteger(actor.balanceCents) ||
        actor.balanceCents < 0
      ) {
        return reject("KERNEL_INVALID_ACTION");
      }
      if (
        item.priceCents > 0 &&
        quantity > Math.floor(actor.balanceCents / item.priceCents)
      ) {
        return reject("KERNEL_INSUFFICIENT_FUNDS");
      }
      break;
    }
  }

  return {
    accepted: true,
    request,
    actorVersion: actor.version,
    worldTime: new Date(world.worldTime.getTime()),
  };
}
