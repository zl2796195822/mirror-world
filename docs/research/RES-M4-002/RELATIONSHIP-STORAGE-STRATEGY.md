# RELATIONSHIP-STORAGE-STRATEGY

## 1. 最小键

```text
UNIQUE(world_id, from_resident_id, to_resident_id)
```

禁止 A↔B 单行双向共享。

## 2. 建议字段方向（sketch）

- dimensions（familiarity/trust/affinity/conflict/obligation[/dependency]）
- `relationship_policy_version`
- `projection_cursor` / `last_applied_world_seq`
- `last_source_event_id`
- `updated_at_world_time`
- row version for OCC

## 3. 与 source lineage

可选旁路表：

```text
relationship_projection_applies(
  world_id, from_resident_id, to_resident_id,
  source_event_id, observer_resident_id, policy_version
)
```

用于幂等与审计；不是 World Truth。

## 4. world-scoped

所有关系行必须 world-scoped；跨世界禁止合并。

## 5. rebuild

- 可 TRUNCATE 后在 pinned policies + ordered observations 下重建
- 不要求在 M4 首日实现完整 rebuild harness，但 schema 不得堵死
