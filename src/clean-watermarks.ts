/** Layer A Unicode scrub. Defaults of watermarks-remover `text_unicode.clean_text` (MIT). */

const STRIP_CODEPOINTS = new Set<number>([
  0x00ad, 0x034f, 0x061c, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x180b, 0x180c, 0x180d, 0x180e,
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060,
  0x2061, 0x2062, 0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0x206a, 0x206b, 0x206c,
  0x206d, 0x206e, 0x206f, 0xfeff, 0xfe00, 0xfe01, 0xfe02, 0xfe03, 0xfe04, 0xfe05, 0xfe06,
  0xfe07, 0xfe08, 0xfe09, 0xfe0a, 0xfe0b, 0xfe0c, 0xfe0d, 0xfe0e, 0xfe0f, 0xfff9, 0xfffa,
  0xfffb,
]);

const SPACE_HOMOGLYPHS = new Set<number>([
  0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008,
  0x2009, 0x200a, 0x202f, 0x205f, 0x3000,
]);

const EMOJI_GLUE = new Set<number>([0x200d, 0xfe0e, 0xfe0f]);
const SCRIPT_JOINERS = new Set<number>([0x200c, 0x200d]);
const ORTHOGRAPHIC_CF = new Set<number>([
  0x0600, 0x0601, 0x0602, 0x0603, 0x0604, 0x0605, 0x06dd, 0x070f, 0x08e2, 0x110bd, 0x110cd,
]);

export interface CleanAiMarksResult {
  text: string;
  removedCount: number;
  replacedCount: number;
}

function isStripCp(cp: number): boolean {
  return (
    STRIP_CODEPOINTS.has(cp) ||
    (cp >= 0xe0100 && cp <= 0xe01ef) ||
    (cp >= 0xe0001 && cp <= 0xe007f)
  );
}

function isEmojiBase(cp: number): boolean {
  if (cp >= 0x1f000 && cp <= 0x1faff) return true;
  if (cp >= 0x2600 && cp <= 0x27bf) return true;
  if (cp >= 0x2b00 && cp <= 0x2bff) return true;
  if (cp === 0x00a9 || cp === 0x00ae || cp === 0x2122 || cp === 0x3030 || cp === 0x303d) return true;
  if (cp === 0x3297 || cp === 0x3299) return true;
  if (cp === 0x0023 || cp === 0x002a || (cp >= 0x0030 && cp <= 0x0039)) return true;
  return false;
}

function isJoiningLetter(cp: number): boolean {
  if (cp <= 0x7f) return false;
  const ch = String.fromCodePoint(cp);
  return /^\p{L}$/u.test(ch) || /^\p{M}$/u.test(ch);
}

function isTagCp(cp: number): boolean {
  return cp >= 0xe0020 && cp <= 0xe007f;
}

function isGlue(cp: number): boolean {
  return EMOJI_GLUE.has(cp) || SCRIPT_JOINERS.has(cp) || isTagCp(cp);
}

function decide(
  ch: string,
  prevKept: string | null,
): { action: 'keep' | 'strip' | 'replace'; out: string } {
  const cp = ch.codePointAt(0)!;
  if (EMOJI_GLUE.has(cp) && prevKept !== null && isEmojiBase(prevKept.codePointAt(0)!)) {
    return { action: 'keep', out: ch };
  }
  if (SCRIPT_JOINERS.has(cp) && prevKept !== null && isJoiningLetter(prevKept.codePointAt(0)!)) {
    return { action: 'keep', out: ch };
  }
  if (isTagCp(cp) && prevKept !== null && isEmojiBase(prevKept.codePointAt(0)!)) {
    return { action: 'keep', out: ch };
  }
  if (ORTHOGRAPHIC_CF.has(cp)) return { action: 'keep', out: ch };
  if (isStripCp(cp)) return { action: 'strip', out: '' };
  if (SPACE_HOMOGLYPHS.has(cp)) return { action: 'replace', out: ' ' };
  if (/^\p{Cf}$/u.test(ch) && !SPACE_HOMOGLYPHS.has(cp)) return { action: 'strip', out: '' };
  return { action: 'keep', out: ch };
}

export function cleanAiMarks(text: string): CleanAiMarksResult {
  let removedCount = 0;
  let replacedCount = 0;
  let prevKept: string | null = null;
  let out = '';

  for (const ch of text) {
    const { action, out: next } = decide(ch, prevKept);
    if (action === 'keep') {
      out += next;
      if (!isGlue(ch.codePointAt(0)!)) prevKept = next;
    } else if (action === 'replace') {
      out += next;
      replacedCount += 1;
      prevKept = next;
    } else {
      removedCount += 1;
    }
  }

  return { text: out, removedCount, replacedCount };
}
