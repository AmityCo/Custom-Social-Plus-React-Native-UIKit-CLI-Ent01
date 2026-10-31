export type KeywordPart = {
  text: string;
  isMatch: boolean;
};

// The web UIKit's hashtag pattern.
const HASHTAG_REGEX = /(?<![\p{L}\p{N}\p{M}_#])#[\p{L}\p{N}\p{M}_]{1,100}/gu;
const WORD_CHAR_REGEX = /[A-Za-z0-9_]/;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isWordChar = (char?: string) => !!char && WORD_CHAR_REGEX.test(char);

type Range = [start: number, end: number];

/**
 * Whole-word matches, like the web's `\b` boundaries. A keyword that starts or
 * ends outside A-Z, 0-9 and _ (Thai, for one) has no boundary on that side, so
 * it still matches inside a longer word.
 */
function findWordMatches(text: string, keyword: string): Range[] {
  const ranges: Range[] = [];
  const regex = new RegExp(escapeRegex(keyword), 'gi');
  const needsStartBoundary = isWordChar(keyword[0]);
  const needsEndBoundary = isWordChar(keyword[keyword.length - 1]);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const isWholeWord =
      (!needsStartBoundary || !isWordChar(text[start - 1])) &&
      (!needsEndBoundary || !isWordChar(text[end]));

    if (isWholeWord) {
      ranges.push([start, end]);
    } else {
      regex.lastIndex = start + 1;
    }
  }
  return ranges;
}

/**
 * Like the web: `#tag` highlights a hashtag that is exactly that tag, and any
 * other keyword highlights its first appearance inside the tag.
 */
function findHashtagMatch(hashtag: string, keyword: string): Range | null {
  if (keyword.startsWith('#')) {
    return hashtag.toLowerCase() === keyword.toLowerCase()
      ? [0, hashtag.length]
      : null;
  }

  const match = new RegExp(escapeRegex(keyword), 'i').exec(hashtag.slice(1));
  if (!match) return null;
  return [match.index + 1, match.index + 1 + match[0].length];
}

/** Splits text into the parts that match a search keyword and the parts that don't. */
export function splitByKeyword(text: string, keyword?: string): KeywordPart[] {
  const term = keyword?.trim();
  if (!text || !term) return [{ text, isMatch: false }];

  const ranges: Range[] = [];
  const addWordMatches = (start: number, end: number) => {
    if (term.startsWith('#')) return;
    findWordMatches(text.slice(start, end), term).forEach(([from, to]) =>
      ranges.push([start + from, start + to])
    );
  };

  const hashtagRegex = new RegExp(HASHTAG_REGEX);
  let lastIndex = 0;
  let hashtag: RegExpExecArray | null;
  while ((hashtag = hashtagRegex.exec(text)) !== null) {
    addWordMatches(lastIndex, hashtag.index);
    const match = findHashtagMatch(hashtag[0], term);
    if (match) {
      ranges.push([hashtag.index + match[0], hashtag.index + match[1]]);
    }
    lastIndex = hashtag.index + hashtag[0].length;
  }
  addWordMatches(lastIndex, text.length);

  const parts: KeywordPart[] = [];
  let position = 0;
  ranges.forEach(([start, end]) => {
    if (start > position) {
      parts.push({ text: text.slice(position, start), isMatch: false });
    }
    parts.push({ text: text.slice(start, end), isMatch: true });
    position = end;
  });
  if (position < text.length) {
    parts.push({ text: text.slice(position), isMatch: false });
  }
  return parts;
}
