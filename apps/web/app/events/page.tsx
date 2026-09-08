import { ContextEmpty } from "../components/context-empty";
import { requireUser } from "../../lib/auth/require-user";

export default async function EventsPage() {
  await requireUser();

  return (
    <ContextEmpty
      eyebrow="TEMPORAL / EVENTS"
      title="世界事件"
      description="事件流尚未接入。没有真实事件时，这里保持空状态，不生成模拟发生的故事。"
      status="等待事件流"
    />
  );
}
