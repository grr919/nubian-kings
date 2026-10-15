/** One optional follow-up, offered before the original victory's replenishment. */
export interface SecondStrike {
  playerId: string;
  targetPlayerId: string;
  turnPlayerIndex: number;
  accepted: boolean;
}

export const SECOND_STRIKE_RULE = "When a contest removes an army’s last card, the victorious side may risk a second strike against that side’s exposed heir before replenishing. Choose any eligible card or formation and statistic. Losing eliminates your entire side, even if your heir and other army cards remain. A tie or cancelled comparison eliminates neither side and ends the attempt. Declining continues normal play. Standard and long-game victory rules still apply.";
