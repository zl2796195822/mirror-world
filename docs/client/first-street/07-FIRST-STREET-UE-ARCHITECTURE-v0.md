# 07-FIRST-STREET-UE-ARCHITECTURE-v0

## 数据流

```text
Mirror World Server
        │
client-projection-v0
        │
        ▼
IWorldProjectionSource
        │
        ▼
Client World State
        │
   ┌────┴────┐
   ▼         ▼
Place      Resident
Registry   Registry
   │         │
   └────┬────┘
        ▼
    UE Scene
        │
        ▼
Visual Presentation
```

禁止：HTTP callback 直接到处 `SetActorLocation`。

## 语言分工（推荐）

| 层                                                              | 技术      |
| --------------------------------------------------------------- | --------- |
| Projection Client / Entity Registry / State / Networking / Sync | C++       |
| Scene / Visual presentation / Animation wiring / Camera         | Blueprint |

## C++ Module 规划

```text
MirrorWorldClient
  Projection
  WorldView
  Entities
  Places
  Activities
  Networking
  Debug
```

不要全部塞进 `MirrorWorldGameMode.cpp`。

## IWorldProjectionSource

未来实现：

- `HttpPollingProjectionSource`
- `RealtimeProjectionSource`
- `ReplayProjectionSource`
- `MockProjectionSource`

C2 只 spec。

## 本机环境观察

- MacBook Air / Apple M3
- 当前未检测到已安装 Unreal Engine Editor
- C2 不创建 UE project、不启动 Editor
