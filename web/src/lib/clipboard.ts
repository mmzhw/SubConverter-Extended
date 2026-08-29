export type CopyResult = { ok: true } | { ok: false; error: string };

export async function copyText(text: string, nav: Navigator = navigator, doc: Document = document): Promise<CopyResult> {
  if (nav.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return { ok: true };
    } catch {
      // fall through to legacy path
    }
  }
  try {
    const textarea = doc.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    doc.body.appendChild(textarea);
    textarea.select();
    const ok = doc.execCommand('copy');
    doc.body.removeChild(textarea);
    return ok ? { ok: true } : { ok: false, error: 'copy-failed' };
  } catch {
    return { ok: false, error: 'copy-failed' };
  }
}
