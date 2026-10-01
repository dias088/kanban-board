/** Response shapes returned by the API. Dates are ISO-8601 strings over the wire. */
import type { LabelColor } from './constants';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface CardDto {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  position: number;
  dueDate: string | null;
  labelColor: LabelColor | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnDto {
  id: string;
  title: string;
  boardId: string;
  position: number;
  cards: CardDto[];
}

/** Shape used by the boards list, where the cards themselves are not needed. */
export interface BoardSummaryDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  columnCount: number;
  cardCount: number;
}

export interface BoardDetailDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  columns: ColumnDto[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | undefined>;
  };
}
