import { ContextEmpty } from "../components/context-empty";

export default function WorldPage() {
  return (
    <ContextEmpty
      eyebrow="WORLD / OBSERVE"
      title="世界观察"
      description="当前没有可用的世界快照。世界时间、运行状态和空间信息将在对应能力接入后显示。"
      status="等待世界快照"
    />
  );
}
