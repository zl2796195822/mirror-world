import { ContextEmpty } from "../components/context-empty";
import { requireUser } from "../../lib/auth/require-user";

export default async function SettingsPage() {
  await requireUser();

  return (
    <ContextEmpty
      eyebrow="CONTEXT / SETTINGS"
      title="设置"
      description="隐私、通知和开发设置将在对应能力接入后出现。当前没有可保存的设置。"
      status="等待设置能力"
    />
  );
}
