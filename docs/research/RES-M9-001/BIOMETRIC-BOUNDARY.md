# Biometric Boundary

## Zero-trust stance

未来 face、voice、body scan 只能经过独立、可替换的 Capture/Proof Provider boundary；`Biometric Capture ≠ Identity Proof ≠ Resident Identity`。

## Data classes

```text
raw capture → derived features/embedding → avatar reconstruction artifact
```

每层都应有独立用途、访问、保留和删除策略。默认最小保存；优先端侧 ephemeral processing；不因生成 avatar 而永久保存 raw capture 或 biometric embedding。

## Provider contract direction

只定义 provider 输出的 typed status、quality、provenance、consent reference 和 artifact reference；不把第三方 SDK 的默认上传/遥测当作授权。Provider 可替换、可停用、可审计、失败时 fail closed。

## Explicit non-actions

本研究没有调用摄像头、接收真人脸/声音/身体数据、实现 biometrics、identity scan、matching engine 或 KYC。M7 experiments 的 MediaPipe 仅是隔离表现层输入实验，不能升级为 M9 identity authority。
