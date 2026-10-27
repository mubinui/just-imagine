/** In-memory, bounded turn fragments. No logging or persistence. */
export class TranscriptBuffer {
  private value = { child: '', character: '' };
  constructor(private emit: (role: 'child' | 'character', text: string, final: boolean) => void) {}
  push(role: 'child' | 'character', fragment: { text?: string; finished?: boolean }) {
    // A new speaker ends the other's turn, so a late final can never reappear after it.
    const other = role === 'child' ? 'character' : 'child';
    if (fragment.text && this.value[other]) this.push(other, { finished: true });
    if (fragment.text) this.value[role] = (this.value[role] + fragment.text).slice(-6000);
    if (this.value[role]) this.emit(role, this.value[role], fragment.finished === true);
    if (fragment.finished) this.value[role] = '';
  }
  finish() {
    for (const role of ['child', 'character'] as const) this.push(role, { finished: true });
  }
  clear() {
    this.value = { child: '', character: '' };
  }
}
