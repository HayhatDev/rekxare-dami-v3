import { describe, it, expect } from 'vitest';
import { parseDeck, stripHtml, splitDelimited, detectFormat, parseAnkiDirectives } from './deckImport';

const NOW = new Date(2026, 8, 2, 10, 0, 0);
const DECK = 'general:2026-09-02';

function parse(text: string, subject = 'General') {
  return parseDeck(text, subject, DECK, NOW);
}

describe('stripHtml', () => {
  it('flattens br tags to spaces instead of newlines', () => {
    expect(stripHtml('line one<br>line two')).toBe('line one line two');
  });

  it('removes tags and decodes entities', () => {
    expect(stripHtml('<b>Bold</b> &amp; <i>italic</i>')).toBe('Bold & italic');
    expect(stripHtml('a &lt; b &gt; c')).toBe('a < b > c');
    expect(stripHtml('it&#39;s')).toBe("it's");
    expect(stripHtml('&#20013;&#25991;')).toBe('中文');
  });

  it('does not leave a newline inside a field', () => {
    expect(stripHtml('a</div>\n<b>b</b>')).not.toContain('\n');
  });
});

describe('splitDelimited', () => {
  it('keeps a delimiter inside a quoted field', () => {
    expect(splitDelimited('"hello, world",second', ',')).toEqual(['hello, world', 'second']);
  });

  it('handles escaped quotes', () => {
    expect(splitDelimited('"say ""hi""",x', ',')).toEqual(['say "hi"', 'x']);
  });

  it('splits on tabs', () => {
    expect(splitDelimited('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
  });

  it('keeps trailing empty fields', () => {
    expect(splitDelimited('a,,', ',')).toEqual(['a', '', '']);
  });
});

describe('detectFormat', () => {
  it('detects an Anki text export', () => {
    expect(detectFormat('#separator:tab\n#html:true\na\tb')).toBe('anki');
  });

  it('detects a Quizlet export with no header', () => {
    expect(detectFormat('bonjour\thello\nmerci\tthanks')).toBe('quizlet');
  });

  it('detects a headered CSV as delimited', () => {
    expect(detectFormat('front,back\none,two')).toBe('delimited');
  });
});

describe('parseAnkiDirectives', () => {
  it('reads separator and column layout', () => {
    const r = parseAnkiDirectives([
      '#separator:tab',
      '#html:true',
      '#notetype column:1',
      '#deck column:2',
      'front\tback',
    ]);
    expect(r.separator).toBe('\t');
    expect(r.front).toBe(0);
    expect(r.back).toBe(1);
    expect(r.body).toEqual(['front\tback']);
    expect(r.found).toBe(true);
  });

  it('respects a notetype column offset', () => {
    const r = parseAnkiDirectives(['#separator:comma', '#notetype column:3', 'a,b,front,back']);
    expect(r.front).toBe(2);
    expect(r.back).toBe(3);
  });
});

describe('parseDeck - Anki text export', () => {
  it('imports front/back pairs as recall cards', () => {
    const r = parse('#separator:tab\n#html:true\nbonjour\thello\nmerci\tthanks');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0].question).toBe('bonjour');
    expect(r.cards[0].answer).toBe('hello');
    expect(r.cards[0].options).toEqual([]);
    expect(r.cards[0].reps).toBe(0);
  });

  it('strips HTML out of both sides', () => {
    const r = parse('#separator:tab\n#html:true\n<b>bonjour</b>\t<i>hello</i>');
    expect(r.cards[0].question).toBe('bonjour');
    expect(r.cards[0].answer).toBe('hello');
  });

  it('honours a space separator', () => {
    const r = parse('#separator:space\nbonjour hello');
    expect(r.cards[0].question).toBe('bonjour');
    expect(r.cards[0].answer).toBe('hello');
  });

  it('skips rows missing an answer', () => {
    const r = parse('#separator:tab\nbonjour\t\nmerci\tthanks');
    expect(r.cards).toHaveLength(1);
    expect(r.skipped.some((s) => s.reason === 'empty_back')).toBe(true);
  });
});

describe('parseDeck - Quizlet export', () => {
  it('imports tab separated term/definition', () => {
    const r = parse('bonjour\thello\nmerci\tthanks');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[1].question).toBe('merci');
    expect(r.cards[1].answer).toBe('thanks');
  });

  it('ignores a trailing empty line', () => {
    expect(parse('bonjour\thello\n').cards).toHaveLength(1);
  });
});

describe('parseDeck - CSV with headers', () => {
  it('maps front/back columns by header name', () => {
    const r = parse('Front,Back,Extra\na,b,c\nd,e,f');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0].question).toBe('a');
    expect(r.cards[0].answer).toBe('b');
    expect(r.cards[1].question).toBe('d');
    expect(r.cards[1].answer).toBe('e');
  });

  it('maps term/definition headers', () => {
    const r = parse('term,definition\nx,y');
    expect(r.cards[0].question).toBe('x');
    expect(r.cards[0].answer).toBe('y');
  });

  it('handles quoted fields containing commas', () => {
    const r = parse('front,back\n"a, b",c');
    expect(r.cards[0].question).toBe('a, b');
    expect(r.cards[0].answer).toBe('c');
  });

  it('falls back to the first two columns with no header', () => {
    const r = parse('a,b\nc,d');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0].question).toBe('a');
  });
});

describe('parseDeck - rejections and duplicates', () => {
  it('drops a duplicate front within one file', () => {
    const r = parse('#separator:tab\nsame\tone\nsame\ttwo');
    expect(r.cards).toHaveLength(1);
    expect(r.skipped.some((s) => s.reason === 'duplicate')).toBe(true);
  });

  it('reports a file with no delimiter', () => {
    const r = parse('just some prose with no structure');
    expect(r.cards).toHaveLength(0);
    expect(r.warnings).toContain('no_delimiter_found');
  });

  it('reports an empty file', () => {
    const r = parse('   \n\n  ');
    expect(r.cards).toHaveLength(0);
    expect(r.warnings).toContain('empty_file');
  });

  it('warns when every row was rejected', () => {
    const r = parse('#separator:tab\n\t\n\t');
    expect(r.cards).toHaveLength(0);
  });

  it('skips rows with too few columns', () => {
    const r = parse('front,back\na,b\nlonely');
    expect(r.cards).toHaveLength(1);
    expect(r.skipped.some((s) => s.reason === 'too_few_columns')).toBe(true);
  });
});

describe('parseDeck - card identity', () => {
  it('produces the same id for the same front in the same subject', () => {
    const a = parse('front,back\nx,y');
    const b = parse('front,back\nx,y');
    expect(a.cards[0].id).toBe(b.cards[0].id);
  });

  it('separates the same front under different subjects', () => {
    const a = parseDeck('front,back\nx,y', 'Math', DECK, NOW);
    const b = parseDeck('front,back\nx,y', 'Biology', DECK, NOW);
    expect(a.cards[0].id).not.toBe(b.cards[0].id);
  });

  it('is case and whitespace insensitive on the front', () => {
    const a = parseDeck('front,back\nX,y', 'General', DECK, NOW);
    const b = parseDeck('front,back\n  x  ,y', 'General', DECK, NOW);
    expect(a.cards[0].id).toBe(b.cards[0].id);
  });
});