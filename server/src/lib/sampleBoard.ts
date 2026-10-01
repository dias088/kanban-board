import type { LabelColor } from '@kanban/shared';
import type { Db } from '../prisma';
import { POSITION_STEP } from './position';

/**
 * The board handed to the seeded demo account and to every visitor who presses
 * "Try the demo". Both paths share it so the demo never drifts from the seed.
 */

interface SampleCard {
  title: string;
  description?: string;
  labelColor?: LabelColor;
  dueInDays?: number;
}

interface SampleColumn {
  title: string;
  cards: SampleCard[];
}

const SAMPLE_COLUMNS: SampleColumn[] = [
  {
    title: 'Backlog',
    cards: [
      {
        title: 'Decide on the label palette',
        description: 'Six colours is plenty. More than that and nobody remembers what they mean.',
        labelColor: 'violet',
      },
      { title: 'Sketch the empty states' },
      {
        title: 'Collect feedback from the first users',
        labelColor: 'gray',
        dueInDays: 21,
      },
    ],
  },
  {
    title: 'In progress',
    cards: [
      {
        title: 'Drag a card into another column',
        description:
          'Grab the handle on the left of a card, or focus it and press space, then use the arrow keys.',
        labelColor: 'blue',
        dueInDays: 3,
      },
      {
        title: 'Write the API documentation',
        description: 'Every endpoint, the error envelope and the ordering rules.',
        labelColor: 'amber',
        dueInDays: 7,
      },
    ],
  },
  {
    title: 'Done',
    cards: [
      { title: 'Set up the monorepo', labelColor: 'green' },
      { title: 'Ship authentication with refresh token rotation', labelColor: 'green' },
      {
        title: 'An overdue card looks like this',
        description: 'Past due dates are highlighted so they are hard to miss.',
        labelColor: 'red',
        dueInDays: -2,
      },
    ],
  },
];

const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export async function createSampleBoard(
  db: Db,
  userId: string,
  title = 'Product roadmap',
): Promise<string> {
  const board = await db.board.create({
    data: {
      title,
      ownerId: userId,
      columns: {
        create: SAMPLE_COLUMNS.map((column, columnIndex) => ({
          title: column.title,
          position: (columnIndex + 1) * POSITION_STEP,
          cards: {
            create: column.cards.map((card, cardIndex) => ({
              title: card.title,
              description: card.description ?? null,
              labelColor: card.labelColor ?? null,
              dueDate: card.dueInDays === undefined ? null : daysFromNow(card.dueInDays),
              position: (cardIndex + 1) * POSITION_STEP,
            })),
          },
        })),
      },
    },
  });

  return board.id;
}
