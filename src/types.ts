export type ElementType = "mouse" | "pen" | "rect" | "circle" | "arrow" | "line" | "sticky" | "eraser" | "text";

export interface Element {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  points?: number[];
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  rotation?: number;
}

export interface Participant {
  id: string;
  name: string;
  color?: string;
}

export interface CursorPosition {
  id: string;
  userName: string;
  position: { x: number; y: number };
}

export interface RoomSummary {
  id: string;
  title: string;
  room_code: string;
  active_users_count?: number;
  updated_at?: string;
  created_at?: string;
}
