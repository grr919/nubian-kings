/**
 * Keeps old polling responses from overwriting newer room state or a
 * successful controller takeover. The API remains authoritative: a newer
 * GET from a different controller is still allowed to revoke local control.
 */
export class MultiplayerResponseGate {
  private issued = 0;
  private accepted = 0;
  private current?: { code: string; revision: number };

  begin(): number { return ++this.issued; }

  invalidate(): void { this.accepted = ++this.issued; }

  clear(): void {
    this.invalidate();
    this.current = undefined;
  }

  accept(ticket: number, room: { code: string; revision: number }): boolean {
    if (ticket < this.accepted) return false;
    if (this.current?.code === room.code && room.revision < this.current.revision) return false;
    this.accepted = ticket;
    this.current = { code: room.code, revision: room.revision };
    return true;
  }

  isCurrent(ticket: number): boolean { return ticket >= this.accepted; }
}
