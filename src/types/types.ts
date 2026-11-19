import { z } from 'zod';

export const maxNameLength = 48;
export const maxDrawingPoints = 4096;
export const maxRemotePlayers = 64;
export const maxLocalPlayers = 64;

const coordinate = z.number().min(0).max(2048);
const drawingSchema = z
  .object({
    x: z.array(coordinate).max(maxDrawingPoints),
    y: z.array(coordinate).max(maxDrawingPoints),
    drag: z.array(z.boolean()).max(maxDrawingPoints),
    color: z.string().min(1).max(64),
    height: z.number().int().min(1).max(2048),
    width: z.number().int().min(1).max(2048),
  })
  .refine(
    ({ x, y, drag, width, height }) =>
      x.length === y.length &&
      x.length === drag.length &&
      width * height <= 2_097_152 &&
      x.every((value) => value <= width) &&
      y.every((value) => value <= height),
    'Invalid portrait dimensions or strokes',
  );

export const simplePlayerSchema = z.object({
  name: z.string().trim().min(1).max(maxNameLength),
  drawing: drawingSchema,
});

export const playerSchema = simplePlayerSchema.extend({
  id: z.string(),
  drawing: drawingSchema.optional(),
  score: z.number(),
  joined: z.number(),
});

export const drawnPlayerSchema = playerSchema.extend({ drawn: z.number() });
export type Player = z.infer<typeof playerSchema>;
export type DrawnPlayer = z.infer<typeof drawnPlayerSchema>;
export type GameType = 'ANARCHY' | 'FAIR';
