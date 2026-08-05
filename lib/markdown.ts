export function markdownToPlainText(markdown: string): string {
  let text = markdown;

  text = text.replace(/```[\s\S]*?```/g, (block) => {
    const codeLines = block.replace(/^```\w*\s*/gm, "").replace(/```$/gm, "");
    return codeLines.trim();
  });

  text = text.replace(/`([^`]+)`/g, "$1");

  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  text = text.replace(/^#{1,6}\s+/gm, "");

  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");

  text = text.replace(/^\s*[-*+]\s+/gm, "- ");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");

  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
