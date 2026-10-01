/** Limits shared by client-side forms and server-side validation. */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt only hashes the first 72 bytes of its input and silently ignores the
 * rest, so anything longer would make the extra characters meaningless.
 */
export const PASSWORD_MAX_LENGTH = 72;

export const EMAIL_MAX_LENGTH = 254;
export const NAME_MAX_LENGTH = 80;

export const BOARD_TITLE_MAX_LENGTH = 120;
export const COLUMN_TITLE_MAX_LENGTH = 120;
export const CARD_TITLE_MAX_LENGTH = 200;
export const CARD_DESCRIPTION_MAX_LENGTH = 5000;

export const LABEL_COLORS = ['gray', 'red', 'amber', 'green', 'blue', 'violet'] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];
