import { z } from 'zod';

const EraSchema = z.enum(['dawn-age', 'age-of-heroes', 'long-night', 'andal-invasion', 'targaryen-conquest', 'roberts-reign', 'game-of-thrones', 'AC', 'BC']);

const PrecisionSchema = z.enum(['exact', 'year', 'decade', 'era', 'legendary']);

const DateSchema = z.object({
  year: z.number().int(),
  era: EraSchema,
  precision: PrecisionSchema,
});

const SourceSchema = z.object({
  type: z.enum(['awoiaf', 'book', 'show', 'other']),
  url: z.url().optional(),
  ref: z.string().optional(),
  license: z.string().optional(),
});

const CoordsSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CastleSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['castle', 'town', 'ruin', 'watchtower', 'holdfast']),
  'sub-region': z.string().optional(),
  'liege-house': z.string().optional(),
  founded: DateSchema.optional(),
  'sworn-houses': z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  coords: CoordsSchema,
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export const HouseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  seat: z.string(),
  liege: z.string().nullable(),
  words: z.string(),
  sigil: z.object({ description: z.string() }),
  founded: DateSchema,
  status: z.enum(['extant', 'extinct', 'exiled', 'hidden']),
  'sworn-from': z.array(z.string()).default([]),
  'cadet-houses': z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export const PersonSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  born: DateSchema.nullable(),
  died: DateSchema.nullable(),
  'primary-house': z.string(),
  'also-of-houses': z.array(z.string()).default([]),
  parents: z.array(z.string()).default([]),
  spouses: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  placeholder: z.boolean().default(false),
  'placeholder-reason': z.enum(['unnamed', 'unwritten', 'uncertain']).nullable().default(null),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const ParticipantSchema = z.object({
  side: z.string(),
  houses: z.array(z.string()).default([]),
});

export const EventSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['battle', 'siege', 'treaty', 'wedding', 'death', 'betrayal', 'other']),
  date: DateSchema,
  location: z.union([z.string(), CoordsSchema]),
  participants: z.array(ParticipantSchema).default([]),
  outcome: z.string().optional(),
  casualties: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export type Castle = z.infer<typeof CastleSchema>;
export type House = z.infer<typeof HouseSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Source = z.infer<typeof SourceSchema>;
