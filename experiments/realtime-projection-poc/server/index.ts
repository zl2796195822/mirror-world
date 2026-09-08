/**
 * Realtime Projection Server Entrypoint
 * 
 * Sets up Colyseus Server with WebSocket transport and defines rooms.
 */

import http from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { WorldProjectionRoom } from './rooms/WorldProjectionRoom.js';
import { AoiProjectionRoom } from './rooms/AoiProjectionRoom.js';

export interface ServerInstance {
  server: Server;
  httpServer: http.Server;
  port: number;
  stop: () => Promise<void>;
}

export async function createColyseusServer(port: number = 2567): Promise<ServerInstance> {
  const httpServer = http.createServer();
  const server = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  server.define('world_projection', WorldProjectionRoom);
  server.define('aoi_projection', AoiProjectionRoom);

  await server.listen(port);

  return {
    server,
    httpServer,
    port,
    stop: async () => {
      await server.gracefullyShutdown();
    },
  };
}

// Direct execution entry
if (process.argv[1] && process.argv[1].endsWith('server/index.ts')) {
  const PORT = Number(process.env.PORT || 2567);
  createColyseusServer(PORT).then((instance) => {
    console.log(`[Colyseus Server] Running on http://127.0.0.1:${instance.port}`);
    console.log(`[Rooms Defined] 'world_projection', 'aoi_projection'`);
  });
}
