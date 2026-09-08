/**
 * Client Concurrency Stress Benchmark
 * 
 * Benchmarks Colyseus World Projection under 1, 10, 30, 100, and 200 clients.
 * Collects:
 * - Server CPU %
 * - Heap used (MB)
 * - Event Loop Delay (ms)
 * - Message Count & Outbound Throughput (KB/s, msg/s)
 * - Average, P50, P95, P99 Latency
 */

import { monitorEventLoopDelay } from 'perf_hooks';
import { Client } from 'colyseus.js';
import { createColyseusServer, ServerInstance } from '../server/index.js';
import { WorldStateSchema } from '../server/schema/WorldState.js';

export interface BenchmarkResult {
  clients: number;
  durationMs: number;
  totalMessagesReceived: number;
  messagesPerSec: number;
  throughputKbPerSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  eventLoopDelayMeanMs: number;
  eventLoopDelayMaxMs: number;
  heapUsedMb: number;
  cpuPercent: number;
}

async function runTierBenchmark(
  port: number,
  clientCount: number,
  durationSec: number = 3
): Promise<BenchmarkResult> {
  const clients: Client[] = [];
  const rooms: any[] = [];
  let totalMessagesReceived = 0;
  let totalBytesEstimated = 0;
  const latencies: number[] = [];

  // Start event loop delay monitor
  const elHistogram = monitorEventLoopDelay({ resolution: 10 });
  elHistogram.enable();

  const startCpu = process.cpuUsage();
  const startTime = performance.now();

  // Connect clients
  for (let i = 0; i < clientCount; i++) {
    const c = new Client(`ws://127.0.0.1:${port}`);
    clients.push(c);
  }

  // Join rooms
  await Promise.all(
    clients.map(async (c) => {
      const room = await c.joinOrCreate('world_projection', {}, WorldStateSchema);
      rooms.push(room);

      room.onMessage('welcome', () => {});

      room.onMessage('pong', (data: { clientTime: number; serverTime: number }) => {
        const rtt = performance.now() - data.clientTime;
        latencies.push(rtt);
      });

      // Track state patches
      room.onStateChange((state) => {
        totalMessagesReceived++;
        // Rough estimate of binary frame size (header + entity patches)
        totalBytesEstimated += 20 + state.entities.size * 18;
      });
    })
  );

  // Ping interval during measurement
  const pingTimer = setInterval(() => {
    const now = performance.now();
    for (const r of rooms) {
      r.send('ping', { clientTime: now });
    }
  }, 200);

  // Wait for measurement duration
  await new Promise((r) => setTimeout(r, durationSec * 1000));

  clearInterval(pingTimer);
  const elapsedSec = (performance.now() - startTime) / 1000;
  const cpuDelta = process.cpuUsage(startCpu);
  elHistogram.disable();

  // Calculate metrics
  const totalCpuMicro = cpuDelta.user + cpuDelta.system;
  const cpuPercent = Number(((totalCpuMicro / (elapsedSec * 1_000_000)) * 100).toFixed(1));
  const mem = process.memoryUsage();
  const heapUsedMb = Number((mem.heapUsed / (1024 * 1024)).toFixed(2));

  latencies.sort((a, b) => a - b);
  const avgLatency =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;

  const eventLoopMean = Number((elHistogram.mean / 1_000_000).toFixed(2));
  const eventLoopMax = Number((elHistogram.max / 1_000_000).toFixed(2));

  // Disconnect all
  await Promise.all(rooms.map((r) => r.leave(true)));

  return {
    clients: clientCount,
    durationMs: Math.round(elapsedSec * 1000),
    totalMessagesReceived,
    messagesPerSec: Math.round(totalMessagesReceived / elapsedSec),
    throughputKbPerSec: Number((totalBytesEstimated / (elapsedSec * 1024)).toFixed(1)),
    avgLatencyMs: Number(avgLatency.toFixed(2)),
    p50LatencyMs: Number(p50.toFixed(2)),
    p95LatencyMs: Number(p95.toFixed(2)),
    p99LatencyMs: Number(p99.toFixed(2)),
    eventLoopDelayMeanMs: eventLoopMean,
    eventLoopDelayMaxMs: eventLoopMax,
    heapUsedMb,
    cpuPercent,
  };
}

export async function runStressBenchmark(
  tiers: number[] = [1, 10, 30, 100, 200]
): Promise<BenchmarkResult[]> {
  console.log('========================================================================');
  console.log('EXP-REALTIME-001: CLIENT STRESS BENCHMARK (Colyseus World Projection)');
  console.log('========================================================================\n');

  const BENCH_PORT = 2570;
  const serverInstance = await createColyseusServer(BENCH_PORT);
  const results: BenchmarkResult[] = [];

  try {
    for (const clientCount of tiers) {
      console.log(`[Benchmarking ${clientCount} Clients] running for 3.5s...`);
      const res = await runTierBenchmark(BENCH_PORT, clientCount, 3.5);
      results.push(res);
      console.log(
        `  -> CPU: ${res.cpuPercent}% | Heap: ${res.heapUsedMb}MB | LoopDelay: ${res.eventLoopDelayMeanMs}ms | Throughput: ${res.throughputKbPerSec} KB/s (${res.messagesPerSec} msg/s) | Latency: Avg ${res.avgLatencyMs}ms, P95 ${res.p95LatencyMs}ms`
      );
      // Cooldown between tiers
      await new Promise((r) => setTimeout(r, 1000));
    }
  } finally {
    await serverInstance.stop();
  }

  console.log('\n-----------------------------------------------------------------------------------------------------------------------------');
  console.log('| Clients | Messages/s | Outbound (KB/s) | Avg Latency | P95 Latency | P99 Latency | Loop Delay (avg) | CPU % | Heap (MB) |');
  console.log('-----------------------------------------------------------------------------------------------------------------------------');
  for (const r of results) {
    console.log(
      `| ${String(r.clients).padEnd(7)} | ${String(r.messagesPerSec).padEnd(10)} | ${String(r.throughputKbPerSec).padEnd(15)} | ${String(r.avgLatencyMs + 'ms').padEnd(11)} | ${String(r.p95LatencyMs + 'ms').padEnd(11)} | ${String(r.p99LatencyMs + 'ms').padEnd(11)} | ${String(r.eventLoopDelayMeanMs + 'ms').padEnd(16)} | ${String(r.cpuPercent + '%').padEnd(5)} | ${String(r.heapUsedMb).padEnd(9)} |`
    );
  }
  console.log('-----------------------------------------------------------------------------------------------------------------------------\n');

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('scripts/stress-benchmark.ts')) {
  runStressBenchmark().then(() => {
    process.exit(0);
  });
}
