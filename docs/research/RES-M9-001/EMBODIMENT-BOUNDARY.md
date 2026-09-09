# Embodiment Boundary

## Rule

Embodiment 是 Resident 在世界中的可替换表现层。Avatar file hash、VRM asset、body model、animation state 或 renderer instance 都不能成为 identity authority。

一个 Resident 可以有多个历史 embodiment，但同一时间由 world/render policy 选择一个或多个 representation。换衣、换身体模型、年龄变化、受伤、换 Web 3D/Unreal/XR provider 均不自动改变 ResidentId、关系或资产权属。

## M7 contract

M7 只接收 `EmbodimentRef`、visual profile、animation/runtime state 和 bounded world projection；不得读取 Auth credential、Proxy Charter、private identity proof 或 hidden memory。Renderer absence 不能暂停 world。

## Experiment evidence boundary

EXP-M7-003 的 three-vrm/VRM cache、semantic gate、LOD 与 experiment asset pipeline 是 representation research，且明确 `LOD2` 是 visual proxy，不是完整 VRM。EXP-AVATAR-001 的 MediaPipe 是端侧 input experiment。它们没有实现 Digital Identity、Resident link 或 Proxy。
