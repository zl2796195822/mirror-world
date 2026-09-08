import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Client, Room } from 'colyseus.js';
import { WorldStateSchema, ProjectionEntitySchema } from '../server/schema/WorldState.js';
import './styles.css';

interface EntityRenderData {
  entityId: string;
  x: number;
  y: number;
  heading: number;
  activityState: string;
  version: number;
}

const ACTIVITY_COLORS: Record<string, string> = {
  walking: '#38bdf8',
  observing: '#a855f7',
  conversing: '#f59e0b',
  resting: '#10b981',
  idle: '#64748b',
};

function EntityMesh({ entity }: { entity: EntityRenderData }) {
  const color = ACTIVITY_COLORS[entity.activityState] || '#94a3b8';

  return (
    <group position={[entity.x, 0.8, entity.y]} rotation={[0, -entity.heading + Math.PI / 2, 0]}>
      {/* Capsule body */}
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      {/* Heading Pointer cone */}
      <mesh position={[0, 0.4, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.4, 8]} />
        <meshStandardMaterial color="#f43f5e" />
      </mesh>
      {/* 3D Label */}
      <Text
        position={[0, 1.6, 0]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${entity.entityId.replace('dummy-', '#')}`}
      </Text>
    </group>
  );
}

export function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [entities, setEntities] = useState<EntityRenderData[]>([]);
  const [tick, setTick] = useState<number>(0);
  const [ping, setPing] = useState<number>(0);
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);
  const roomRef = useRef<Room<WorldStateSchema> | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:2567`;
    const colyseusClient = new Client(wsUrl);
    clientRef.current = colyseusClient;

    let pingTimer: any = null;

    async function connect() {
      try {
        setConnectionStatus('reconnecting');
        const room = await colyseusClient.joinOrCreate('world_projection', {}, WorldStateSchema);
        roomRef.current = room;
        setConnectionStatus('connected');

        room.onMessage('welcome', () => {});

        room.onMessage('pong', (data: { clientTime: number }) => {
          const rtt = Math.round(performance.now() - data.clientTime);
          setPing(rtt);
        });

        room.onMessage('action_response', (data: { accepted: boolean; status: string; message: string }) => {
          setLastActionStatus(`${data.status}: ${data.message}`);
        });

        room.onStateChange((state) => {
          setTick(state.tick);
          const list: EntityRenderData[] = [];
          state.entities.forEach((e: ProjectionEntitySchema) => {
            list.push({
              entityId: e.entityId,
              x: e.x,
              y: e.y,
              heading: e.heading,
              activityState: e.activityState,
              version: e.version,
            });
          });
          setEntities(list);
        });

        // Ping loop
        pingTimer = setInterval(() => {
          if (room && room.connection && room.connection.isOpen) {
            room.send('ping', { clientTime: performance.now() });
          }
        }, 1000);
      } catch {
        setConnectionStatus('disconnected');
      }
    }

    connect();

    return () => {
      if (pingTimer) clearInterval(pingTimer);
      if (roomRef.current) {
        roomRef.current.leave(true);
      }
    };
  }, []);

  const handleReconnectTest = async () => {
    if (!roomRef.current || !clientRef.current) return;
    const token = roomRef.current.reconnectionToken;
    setConnectionStatus('disconnected');
    await roomRef.current.leave(false); // unconsented leave to trigger server reconnect reservation

    setLastActionStatus('Disconnected. Waiting 5s while world simulator progresses...');
    setTimeout(async () => {
      try {
        setConnectionStatus('reconnecting');
        const reconnected = await clientRef.current!.reconnect(token, WorldStateSchema);
        roomRef.current = reconnected;
        setConnectionStatus('connected');
        setLastActionStatus('Reconnected successfully with updated projection snapshot.');
      } catch (err: any) {
        setConnectionStatus('disconnected');
        setLastActionStatus(`Reconnect failed: ${err.message}`);
      }
    }, 5000);
  };

  const handleActionStub = () => {
    if (!roomRef.current) return;
    roomRef.current.send('request_action', {
      requestId: `req-${Date.now()}`,
      actionType: 'CLIENT_INTERACTION_INTENT',
      actorId: 'viewer-client',
      payload: { message: 'Hello Mirror World' },
      submittedAt: Date.now(),
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 3D Viewport */}
      <Canvas
        camera={{ position: [0, 45, 60], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[30, 50, 30]} intensity={1.2} castShadow />
        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={10} maxDistance={150} />

        {/* Grid & ground plane */}
        <gridHelper args={[200, 40, '#334155', '#1e293b']} position={[0, 0, 0]} />

        {/* Render 30 Entities */}
        {entities.map((e) => (
          <EntityMesh key={e.entityId} entity={e} />
        ))}
      </Canvas>

      {/* HUD Overlay */}
      <div className="hud-overlay">
        <div className="hud-panel">
          <div className="hud-title">
            <span>EXP-REALTIME-001 | REALTIME PROJECTION</span>
            <span
              className={`badge ${
                connectionStatus === 'connected'
                  ? 'badge-green'
                  : connectionStatus === 'reconnecting'
                  ? 'badge-yellow'
                  : 'badge-red'
              }`}
            >
              {connectionStatus}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Colyseus Binary Delta Sync · Read-Only Projection
          </div>

          <div className="hud-metrics">
            <div className="metric-item">
              <span className="metric-label">Entities In View</span>
              <span className="metric-value">{entities.length} / 30</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Simulated Tick</span>
              <span className="metric-value">{tick}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">RTT / Ping</span>
              <span className="metric-value">{ping} ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Update Rate</span>
              <span className="metric-value">20 Hz (50ms)</span>
            </div>
          </div>

          <div className="hud-actions">
            <button className="hud-btn hud-btn-primary" onClick={handleReconnectTest}>
              Disconnect 5s & Reconnect
            </button>
            <button className="hud-btn" onClick={handleActionStub}>
              Submit Stub Action
            </button>
          </div>

          {lastActionStatus && (
            <div
              style={{
                marginTop: '10px',
                padding: '6px 8px',
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#bae6fd',
                wordBreak: 'break-word',
              }}
            >
              {lastActionStatus}
            </div>
          )}
        </div>
      </div>

      {/* Activity State Legend */}
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: ACTIVITY_COLORS.walking }} />
          <span>Walking</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: ACTIVITY_COLORS.observing }} />
          <span>Observing</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: ACTIVITY_COLORS.conversing }} />
          <span>Conversing</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: ACTIVITY_COLORS.resting }} />
          <span>Resting</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: ACTIVITY_COLORS.idle }} />
          <span>Idle</span>
        </div>
      </div>
    </div>
  );
}
export default App;
