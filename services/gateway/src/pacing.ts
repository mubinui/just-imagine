export class Pacing {
  private lastBeat: number;
  private recapped = false;
  constructor(
    private targetMinutes: number,
    private startedAt: number,
  ) {
    this.lastBeat = startedAt;
  }
  beat(now: number) {
    this.lastBeat = now;
  }
  tick(now: number): 'beat' | 'recap' | 'end' | null {
    const elapsed = now - this.startedAt;
    if (elapsed >= this.targetMinutes * 60000) return 'end';
    if (!this.recapped && elapsed >= (this.targetMinutes - 1) * 60000) {
      this.recapped = true;
      this.lastBeat = now;
      return 'recap';
    }
    if (now - this.lastBeat >= 90000) {
      this.lastBeat = now;
      return 'beat';
    }
    return null;
  }
}
