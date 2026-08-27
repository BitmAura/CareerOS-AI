"use client";

/**
 * Lightweight Markdown → resume layout (not a full MD engine).
 * Renders H1/H2/H3, paragraphs, and bullets so ATS drafts look like a resume, not a tiny note.
 */
export function MarkdownResumePreview({ markdown }: { markdown: string }) {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<{ type: string; text?: string; items?: string[] }> = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: [...list] });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }
    if (/^[-*•]\s+/.test(line.trim())) {
      list.push(line.trim().replace(/^[-*•]\s+/, ""));
      continue;
    }
    flushList();
    blocks.push({ type: "p", text: line.trim() });
  }
  flushList();

  return (
    <article className="rounded-lg border bg-background p-6 text-sm leading-relaxed shadow-sm print:border-0 print:shadow-none">
      {blocks.map((b, i) => {
        if (b.type === "h1") {
          return (
            <h1 key={i} className="text-xl font-semibold tracking-tight text-foreground">
              {b.text}
            </h1>
          );
        }
        if (b.type === "h2") {
          return (
            <h2
              key={i}
              className="mt-5 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {b.text}
            </h2>
          );
        }
        if (b.type === "h3") {
          return (
            <h3 key={i} className="mt-3 text-sm font-semibold text-foreground">
              {b.text}
            </h3>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">
              {(b.items || []).map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        // Contact / date lines under name often look like muted meta
        const isMeta =
          i > 0 &&
          blocks[i - 1]?.type === "h1" &&
          /@|\|/.test(b.text || "");
        return (
          <p
            key={i}
            className={
              isMeta
                ? "mt-1 text-xs text-muted-foreground"
                : "mt-2 whitespace-pre-wrap text-foreground/90"
            }
          >
            {b.text}
          </p>
        );
      })}
    </article>
  );
}
