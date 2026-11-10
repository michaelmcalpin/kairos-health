"use client";

/**
 * Markdown-lite renderer for chat messages (bold, italic, bullets, headings,
 * code, links). Shared by the client chat and the coach Messages view so AI
 * replies never show raw **asterisks** or ### marks.
 */
import React from "react";

export function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-1 my-2">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm font-body">
            {inlineFormat(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function inlineFormat(str: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) parts.push(str.slice(lastIndex, match.index));
      if (match[2]) parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
      else if (match[3]) parts.push(<em key={idx++} className="italic">{match[3]}</em>);
      else if (match[4]) parts.push(<code key={idx++} className="bg-kairos-royal-surface px-1.5 py-0.5 rounded text-xs font-mono text-kairos-gold">{match[4]}</code>);
      else if (match[5] && match[6]) parts.push(<a key={idx++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-kairos-gold underline hover:text-kairos-gold/80">{match[5]}</a>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) parts.push(str.slice(lastIndex));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s/.test(trimmed)) { listBuffer.push(trimmed.replace(/^[-*•]\s/, "")); continue; }
    if (/^\d+\.\s/.test(trimmed)) { listBuffer.push(trimmed.replace(/^\d+\.\s/, "")); continue; }
    flushList();
    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={key++} className="font-heading font-semibold text-white text-sm mt-3 mb-1">{inlineFormat(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={key++} className="font-heading font-bold text-white mt-3 mb-1">{inlineFormat(trimmed.slice(3))}</h3>);
    } else if (trimmed === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(<p key={key++} className="text-sm font-body leading-relaxed">{inlineFormat(trimmed)}</p>);
    }
  }
  flushList();
  return elements;
}
