/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoomLayout, Seat } from './types';

const generateSeats = (idPrefix: string, rows: number, cols: number, blockId?: string): Seat[] => {
  const seats: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        id: `${idPrefix}-${blockId || 'default'}-${r}-${c}`,
        row: r,
        col: c,
        isActive: true,
        blockId
      });
    }
  }
  return seats;
};

const generateAmphiBlock = (idPrefix: string, blockId: string): Seat[] => {
  const seats: Seat[] = [];
  // 10 lines of 12
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 12; c++) {
      seats.push({
        id: `${idPrefix}-${blockId}-${r}-${c}`,
        row: r,
        col: c,
        isActive: true,
        blockId
      });
    }
  }
  // 1 line of 6
  for (let c = 0; c < 6; c++) {
    seats.push({
      id: `${idPrefix}-${blockId}-10-${c}`,
      row: 10,
      col: c,
      isActive: true,
      blockId
    });
  }
  return seats;
};

const bonusSeats = (idPrefix: string, count: number): Seat[] => {
  const seats: Seat[] = [];
  for (let i = 0; i < count; i++) {
    seats.push({
      id: `${idPrefix}-bonus-${i}`,
      row: -1, // Special row for bonus
      col: i,
      isActive: true,
      isBonus: true
    });
  }
  return seats;
};

export const INITIAL_ROOMS: RoomLayout[] = [
  {
    id: 'omnisport',
    name: 'Salle Omnisport',
    seats: [
      ...generateSeats('omni', 14, 6),
      ...bonusSeats('omni', 8)
    ]
  },
  {
    id: 'conference',
    name: 'Salle de Conférence',
    seats: [
      ...generateSeats('conf', 12, 6, 'bloc1'),
      ...generateSeats('conf', 12, 11, 'bloc2'),
      ...generateSeats('conf', 12, 6, 'bloc3'),
      ...bonusSeats('conf', 8)
    ]
  },
  {
    id: 'amphi1',
    name: 'Amphi 1',
    seats: [
      ...generateAmphiBlock('amphi1', 'bloc1'),
      ...generateAmphiBlock('amphi1', 'bloc2'),
      ...bonusSeats('amphi1', 8)
    ]
  },
  {
    id: 'amphi2',
    name: 'Amphi 2',
    seats: [
      ...generateAmphiBlock('amphi2', 'bloc1'),
      ...generateAmphiBlock('amphi2', 'bloc2'),
      ...bonusSeats('amphi2', 8)
    ]
  },
  {
    id: 'polyvalente',
    name: 'Salle Polyvalente',
    seats: generateSeats('poly', 7, 4)
  }
];
