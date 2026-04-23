/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Seat {
  id: string;
  row: number;
  col: number;
  isActive: boolean;
  blockId?: string;
  isBonus?: boolean;
}

export interface RoomLayout {
  id: string;
  name: string;
  seats: Seat[];
}

export interface SavedProposal {
  id: string;
  name: string;
  timestamp: string;
  roomData: Record<string, boolean[]>; // roomId -> isActive array
}
