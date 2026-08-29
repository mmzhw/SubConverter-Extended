import { describe, it, expect } from 'vitest';
import { copyText } from './clipboard';

function fakeNav(writeText: () => Promise<void>): Navigator {
  return { clipboard: { writeText } } as unknown as Navigator;
}

describe('copyText', () => {
  it('succeeds via clipboard API', async () => {
    const res = await copyText('x', fakeNav(() => Promise.resolve()));
    expect(res).toEqual({ ok: true });
  });

  it('falls back to execCommand when clipboard fails', async () => {
    const nav = fakeNav(() => Promise.reject(new Error('denied')));
    const doc = {
      createElement: () => ({ style: {}, select: () => {}, value: '' }),
      body: { appendChild: () => {}, removeChild: () => {} },
      execCommand: () => true,
    } as unknown as Document;
    const res = await copyText('x', nav, doc);
    expect(res).toEqual({ ok: true });
  });

  it('reports failure when both paths fail', async () => {
    const nav = fakeNav(() => Promise.reject(new Error('denied')));
    const doc = { createElement: () => { throw new Error('no'); }, execCommand: () => false } as unknown as Document;
    const res = await copyText('x', nav, doc);
    expect(res).toEqual({ ok: false, error: 'copy-failed' });
  });
});
