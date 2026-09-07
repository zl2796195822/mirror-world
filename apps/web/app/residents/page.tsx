import { ContextEmpty } from "../components/context-empty";

export default function ResidentsPage() {
  return (
    <ContextEmpty
      eyebrow="CONTEXT / RESIDENTS"
      title="居民观察"
      description="居民索引尚未接入。这里不会用占位人物或预写人生填充空白。"
      status="等待居民数据"
    />
  );
}
