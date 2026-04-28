/**
 * Incrementally extract closed string elements from a streaming JSON array.
 * Used to surface key-points to the UI as Claude generates them, before the
 * full JSON document is valid.
 *
 * Returns null when the array start hasn't been seen yet. Otherwise returns
 * all elements that have been fully closed (matching `"`) so far.
 */
export function extractCompleteKeyPoints(text: string): string[] | null {
  const stripped = text.replace(/```(?:json)?\n?/g, '');
  const fieldIdx = stripped.indexOf('"keyPoints"');
  if (fieldIdx === -1) return null;
  const openBracket = stripped.indexOf('[', fieldIdx);
  if (openBracket === -1) return null;

  const result: string[] = [];
  let i = openBracket + 1;

  while (i < stripped.length) {
    while (i < stripped.length && /\s/.test(stripped[i])) i++;
    const c = stripped[i];
    if (c === undefined) break;
    if (c === ']') break;
    if (c === ',') { i++; continue; }
    if (c !== '"') break; // partial / malformed — bail out

    i++;
    let s = '';
    let closed = false;
    while (i < stripped.length) {
      const ch = stripped[i];
      if (ch === '\\') {
        if (i + 1 >= stripped.length) break;
        const next = stripped[i + 1];
        if (next === 'n') s += '\n';
        else if (next === 't') s += '\t';
        else if (next === '"') s += '"';
        else if (next === '\\') s += '\\';
        else if (next === '/') s += '/';
        else s += next;
        i += 2;
      } else if (ch === '"') {
        closed = true;
        i++;
        break;
      } else {
        s += ch;
        i++;
      }
    }
    if (!closed) break; // partial trailing string — wait for more
    result.push(s);
  }
  return result;
}
