export type TextPart = {
  text: string;
  isHighlighted: boolean;
};

// Phrases the server sends without placeholders but still shows in bold.
const HIGHLIGHT_EXACT_MATCHES = ['Your profile information was reset'];

type TemplateSegment = { value: string; isDynamic: boolean };

function splitTemplate(templatedText: string): TemplateSegment[] {
  const pattern = /\{\{\s*(\w+):\s*([^}]+)\s*\}\}/g;
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(templatedText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        value: templatedText.slice(lastIndex, match.index),
        isDynamic: false,
      });
    }
    segments.push({ value: match[2], isDynamic: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < templatedText.length) {
    segments.push({ value: templatedText.slice(lastIndex), isDynamic: false });
  }

  return segments;
}

function highlightExactMatch(text: string): TextPart[] {
  for (const phrase of HIGHLIGHT_EXACT_MATCHES) {
    const index = text.indexOf(phrase);
    if (index !== -1) {
      return [
        { text: text.slice(0, index), isHighlighted: false },
        { text: phrase, isHighlighted: true },
        { text: text.slice(index + phrase.length), isHighlighted: false },
      ].filter((part) => part.text);
    }
  }
  return [{ text, isHighlighted: false }];
}

/**
 * Split a tray item's text into plain and highlighted parts.
 *
 * `templatedText` marks the names in `text` with placeholders, e.g.
 * `{{ user: id }} posted in {{ community: id }}`. The placeholders hold ids,
 * not the names, so the names are read out of `text` between the template's
 * static pieces.
 */
export function parseTemplatedText(templatedText = '', text = ''): TextPart[] {
  const segments = splitTemplate(templatedText);
  if (!segments.some((segment) => segment.isDynamic)) {
    return highlightExactMatch(text);
  }

  const parts: TextPart[] = [];
  let pointer = 0;

  segments.forEach((segment, index) => {
    if (!segment.isDynamic) {
      const nextIndex = text.indexOf(segment.value, pointer);
      if (nextIndex === -1) return;
      if (nextIndex > pointer) {
        parts.push({
          text: text.slice(pointer, nextIndex),
          isHighlighted: false,
        });
      }
      parts.push({ text: segment.value, isHighlighted: false });
      pointer = nextIndex + segment.value.length;
      return;
    }

    const nextStatic = segments
      .slice(index + 1)
      .find((next) => !next.isDynamic)?.value;
    let endIndex = nextStatic ? text.indexOf(nextStatic, pointer) : text.length;
    if (endIndex === -1) endIndex = text.length;

    const dynamicText = text.slice(pointer, endIndex);
    if (dynamicText) parts.push({ text: dynamicText, isHighlighted: true });
    pointer = endIndex;
  });

  if (pointer < text.length) {
    parts.push({ text: text.slice(pointer), isHighlighted: false });
  }

  return parts;
}
