const TOKEN_REGEX = /{(\w+)}|<(\w+)([^/>]*)\/>|<(\w+)>(.*?)<\/\4>/gs;

export function parseGameString(str) {
  const tokens = [];
  let lastIndex = 0;

  for (const match of str.matchAll(TOKEN_REGEX)) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: str.slice(lastIndex, match.index),
      });
    }

    // {count}
    if (match[1]) {
      tokens.push({ type: "variable", name: match[1] });
    }

    // <skill skill="woodcutting"/>
    else if (match[2]) {
      const attrs = Object.fromEntries(
        [...match[3].matchAll(/(\w+)="(.*?)"/g)].map((m) => [m[1], m[2]])
      );
      tokens.push({ type: match[2], ...attrs });
    }

    // <hl>...</hl>
    else if (match[4]) {
      tokens.push({
        type: match[4],
        value: match[5],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < str.length) {
    tokens.push({
      type: "text",
      value: str.slice(lastIndex),
    });
  }

  return tokens;
}
