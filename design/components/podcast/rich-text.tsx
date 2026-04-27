// components/podcast/rich-text.tsx
// 渲染 [TICKER] → 黃色 monospace mark；**粗體** → bold
import React from "react";

export function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([A-Z.\d]+)\]|\*\*([^*]+)\*\*/g;
  let i = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    if (m[1]) {
      parts.push(
        <mark key={key++} className="rounded bg-warning/14 px-1 font-mono text-[.92em] font-semibold text-[#7a4d04]">
          {m[1]}
        </mark>
      );
    } else {
      parts.push(<b key={key++} className="font-semibold text-foreground">{m[2]}</b>);
    }
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}
