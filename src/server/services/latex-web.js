'use strict';
// Normalize supported layout-heavy LaTeX to semantic LaTeX before Pandoc reads it.
// Braced arguments are parsed with nesting, rather than truncated with regexes.
function stripComments(source) {
  return source.replace(/(?<!\\)%[^\n]*/g, '');
}
function group(source, start) {
  let i = start;
  while (/\s/.test(source[i] || '') && i < source.length) i++;
  if (source[i] !== '{') throw new Error('Expected a braced LaTeX argument.');
  const first = ++i;
  let depth = 1;
  for (; i < source.length; i++) {
    if (source[i] === '\\') {
      i++;
      continue;
    }
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return { value: source.slice(first, i), end: i + 1 };
  }
  throw new Error('Unclosed LaTeX argument.');
}
function columns(spec, definitions, depth = 0) {
  if (depth > 8) throw new Error('Recursive table column definition.');
  let result = '';
  for (let i = 0; i < spec.length;) {
    const c = spec[i++];
    if (/\s|\|/.test(c)) continue;
    if ('><@!'.includes(c)) {
      i = group(spec, i).end;
      continue;
    }
    if ('pmb'.includes(c)) {
      i = group(spec, i).end;
      result += 'l';
      continue;
    }
    if (c === '*') {
      const n = group(spec, i),
        sub = group(spec, n.end),
        count = Number(n.value);
      if (!Number.isInteger(count) || count < 1 || count > 12)
        throw new Error('Invalid repeated table columns.');
      result += columns(sub.value, definitions, depth + 1).repeat(count);
      i = sub.end;
      continue;
    }
    if ('lcrX'.includes(c)) {
      result += c === 'X' ? 'l' : c;
      continue;
    }
    if (definitions[c]) {
      result += columns(definitions[c], definitions, depth + 1);
      continue;
    }
    throw new Error(
      'Unsupported table column ' + c + '. Use l, c, r, X, p{width}, or a simple custom column.',
    );
  }
  if (!result || result.length > 12) throw new Error('Tables support 1–12 columns.');
  return result;
}
function prepareWebLatex(original, diagramUrls = []) {
  let source = stripComments(original);
  const start = source.indexOf('\\begin{document}');
  const preamble = start >= 0 ? source.slice(0, start) : '';
  const body =
    start >= 0
      ? source.slice(start + '\\begin{document}'.length).replace(/\\end\{document\}[\s\S]*$/, '')
      : source;
  const diagrams = [...body.matchAll(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g)].map(
    (m) => m[0],
  );
  if (diagrams.length > 10) throw new Error('Use at most 10 TikZ diagrams per paper.');
  if (diagramUrls.length && diagramUrls.length !== diagrams.length)
    throw new Error('Diagram output count does not match the source.');
  const definitions = {};
  for (const match of preamble.matchAll(/\\newcolumntype\s*/g)) {
    const name = group(preamble, match.index + match[0].length),
      value = group(preamble, name.end);
    definitions[name.value] = value.value;
  }
  let figure = 0,
    table = 0,
    diagram = 0;
  const refs = new Map();
  let converted = body.replace(
    /\\begin\{(figure|table)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/g,
    (_all, type, inside) => {
      const number = type === 'figure' ? ++figure : ++table;
      for (const label of inside.matchAll(/\\label\{([^}]+)\}/g)) refs.set(label[1], { number });
      inside = inside.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, () => {
        const url = diagramUrls[diagram++];
        return url
          ? '\\includegraphics{' + url + '}'
          : '\\includegraphics{/uploads/compiled_diagram_placeholder.svg}';
      });
      // resizebox is presentation only; retain its content for semantic HTML.
      let pos;
      while ((pos = inside.indexOf('\\resizebox')) >= 0) {
        const a = group(inside, pos + 10),
          b = group(inside, a.end),
          c = group(inside, b.end);
        inside = inside.slice(0, pos) + c.value + inside.slice(c.end);
      }
      inside = inside.replace(
        /\\caption\s*\{/g,
        '\\caption{' + (type === 'figure' ? 'Figure ' : 'Table ') + number + '. ',
      );
      return '\\begin{' + type + '}' + inside + '\\end{' + type + '}';
    },
  );
  if (diagram !== diagrams.length)
    throw new Error('Place every TikZ diagram inside a figure environment.');
  const re = /\\begin\{(tabularx|tabular)\}/g;
  let output = '',
    last = 0,
    match;
  while ((match = re.exec(converted))) {
    let cursor = match.index + match[0].length;
    if (match[1] === 'tabularx') cursor = group(converted, cursor).end;
    const spec = group(converted, cursor);
    output +=
      converted.slice(last, match.index) +
      '\\begin{tabular}{' +
      columns(spec.value, definitions) +
      '}';
    last = spec.end;
    re.lastIndex = last;
  }
  converted = (output + converted.slice(last)).replace(/\\end\{tabularx\}/g, '\\end{tabular}');
  // Restore explicit numbered links rather than Pandoc's unresolved reference text.
  converted = converted.replace(/\\(?:eqref|ref)\{([^}]+)\}/g, (whole, key) => {
    const ref = refs.get(key);
    return ref ? '\\hyperref[' + key + ']{' + ref.number + '}' : whole;
  });
  const citations = new Map();
  converted = converted.replace(
    /\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
    (_all, content) => {
      content = content.replace(/\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g, (_item, key) => {
        citations.set(key, citations.size + 1);
        return '\\item\\hypertarget{bib-' + key + '}{}';
      });
      return '\\section*{References}\n\\begin{enumerate}\n' + content + '\\end{enumerate}';
    },
  );
  converted = converted.replace(/\\cite\{([^}]+)\}/g, (whole, keys) =>
    keys
      .split(',')
      .map((key) => {
        if (!citations.has(key.trim())) throw new Error('Missing bibliography entry: ' + key);
        return '\\hyperlink{bib-' + key.trim() + '}{[' + citations.get(key.trim()) + ']}';
      })
      .join(', '),
  );
  return {
    source: preamble + '\\begin{document}\n' + converted + '\n\\end{document}',
    diagrams,
    preamble,
    figureCount: figure,
    tableCount: table,
  };
}
module.exports = { prepareWebLatex, stripComments };
