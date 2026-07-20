import { describe, it, expect } from 'vitest';
import { parseBlocks, tokenizeInline } from '../src/components/ReadingRenderer.jsx';

// Flatten a token tree back to plain text — a leaked "**" would show up here.
function flatten(tokens) {
  return tokens.map((t) => t.type === 'bold' ? flatten(t.children) : t.text).join('');
}
function boldTexts(tokens) {
  return tokens.filter((t) => t.type === 'bold').map((t) => flatten(t.children));
}

describe('parseBlocks', () => {
  it('groups consecutive bullet lines into one list', () => {
    const blocks = parseBlocks('- one\n- two\n- three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'ul', items: ['one', 'two', 'three'] });
  });

  it('separates paragraphs on blank lines and joins soft wraps', () => {
    const blocks = parseBlocks('line a\nline b\n\nsecond para');
    expect(blocks).toEqual([
      { type: 'p', text: 'line a line b' },
      { type: 'p', text: 'second para' },
    ]);
  });

  it('handles a paragraph followed by a bullet list', () => {
    const blocks = parseBlocks('intro text\n- first\n- second');
    expect(blocks).toEqual([
      { type: 'p', text: 'intro text' },
      { type: 'ul', items: ['first', 'second'] },
    ]);
  });
});

describe('tokenizeInline', () => {
  it('parses a simple bold span', () => {
    expect(boldTexts(tokenizeInline('a **b** c'))).toEqual(['b']);
  });

  it('does NOT leak ** when a bold span contains an *italic* (the reported bug)', () => {
    const tokens = tokenizeInline('**"I need to feel like I *know* you"** Names the barrier.');
    // no literal ** or lone * should survive in the flattened text
    expect(flatten(tokens)).not.toContain('**');
    // the whole quote is bold, with the inner word italicized
    const bold = tokens.find((t) => t.type === 'bold');
    expect(bold).toBeTruthy();
    expect(flatten(bold.children)).toBe('"I need to feel like I know you"');
    expect(bold.children.some((c) => c.type === 'italic' && c.text === 'know')).toBe(true);
  });

  it('pairs multiple bold spans across a list without desyncing', () => {
    const items = ['**a** x', '**b *c* d** y', '**e** z'];
    for (const it of items) {
      expect(flatten(tokenizeInline(it))).not.toContain('**');
    }
    expect(boldTexts(tokenizeInline(items[1]))).toEqual(['b c d']);
  });

  it('preserves surrounding plain text', () => {
    expect(flatten(tokenizeInline('start **mid** end'))).toBe('start mid end');
  });
});
