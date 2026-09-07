export const M0_FIXTURE_IDS = {
  user: "00000000-0000-4000-8000-000000000001",
  world: "00000000-0000-4000-8000-000000000002",
} as const;

export const M0_FIXTURE = {
  user: {
    id: M0_FIXTURE_IDS.user,
    email: "dev@mirror.local",
    status: "ACTIVE",
  },
  world: {
    id: M0_FIXTURE_IDS.world,
    name: "镜界开发世界",
    timezone: "Asia/Shanghai",
    timeScale: 1,
    status: "PAUSED",
    seed: "mirror-m0-foundation-v1",
    worldTime: new Date("2026-09-07T06:00:00+08:00"),
  },
} as const;
