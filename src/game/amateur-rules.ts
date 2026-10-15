import { SECOND_STRIKE_RULE } from "./second-strike";

export const AMATEUR_TIE_RULE = "Without Nile Floods, ties favor the attacker: the defending card is defeated and the attacking card survives. This also applies to heirs and second strikes. With Nile Floods, tied cards both survive face up.";
export const AMATEUR_TIE_EXPLANATION = "The scores are equal. At Amateur level, without Nile Floods, ties favor the attacker: the defending card is defeated and the attacking card survives.";
export const AMATEUR_SECOND_STRIKE_RULE = SECOND_STRIKE_RULE.replace("A tie or cancelled comparison eliminates neither side and ends the attempt.", "With Nile Floods, a tie eliminates neither side and ends the attempt. Without Nile Floods, a tie favors the attacker and eliminates the defending side.");
