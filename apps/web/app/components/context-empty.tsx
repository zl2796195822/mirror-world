type ContextEmptyProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
};

export function ContextEmpty({
  eyebrow,
  title,
  description,
  status = "当前没有可用数据",
}: ContextEmptyProps) {
  return (
    <section className="context-empty" aria-labelledby="context-title">
      <div className="context-empty__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="context-title">{title}</h1>
        <p className="body-copy">{description}</p>
      </div>
      <p className="status-line">
        <span className="status-dot" aria-hidden="true" />
        {status}
      </p>
    </section>
  );
}
