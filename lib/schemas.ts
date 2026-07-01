import { z } from "zod";
import { REGION_SLUGS } from "@/lib/regions";

const EraSchema = z.enum([
  "dawn-age",
  "age-of-heroes",
  "long-night",
  "andal-invasion",
  "targaryen-conquest",
  "roberts-reign",
  "game-of-thrones",
  "AC",
  "BC",
]);

const PrecisionSchema = z.enum(["exact", "year", "decade", "era", "legendary"]);

const DateSchema = z.object({
  year: z.number().int(),
  era: EraSchema,
  precision: PrecisionSchema,
});

const SourceSchema = z.object({
  type: z.enum(["awoiaf", "book", "show", "other"]),
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
  type: z.enum(["castle", "town", "ruin", "watchtower", "holdfast"]),
  "sub-region": z.string().optional(),
  "liege-house": z.string().optional(),
  founded: DateSchema.optional(),
  "sworn-houses": z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  coords: CoordsSchema,
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const WeaponTypeSchema = z.enum([
  "sword",
  "greatsword",
  "longsword",
  "dagger",
  "axe",
  "spear",
  "bow",
  "horn",
  "other",
]);

const MaterialSchema = z.enum([
  "valyrian-steel",
  "dragonglass",
  "dragonbone",
  "steel",
  "other",
]);

const WeaponStatusSchema = z.enum(["extant", "lost", "destroyed"]);

export const WeaponSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: WeaponTypeSchema,
  material: MaterialSchema,
  forged: DateSchema.optional(),
  destroyed: DateSchema.optional(),
  status: WeaponStatusSchema,
  "origin-house": z.string().optional(),
  "current-house": z.string().nullable(),
  wielders: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const DragonStatusSchema = z.enum(["extant", "dead", "lost", "wild"]);
const DragonSizeSchema = z.enum([
  "hatchling",
  "young",
  "mature",
  "great",
  "monstrous",
]);

export const DragonSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  size: DragonSizeSchema.optional(),
  hatched: DateSchema.nullable(),
  died: DateSchema.nullable(),
  status: DragonStatusSchema,
  house: z.string().nullable(),
  riders: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const HouseInfoEntrySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  note: z.string().optional(),
});

export const HouseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  seat: z.string(),
  liege: z.string().nullable(),
  words: z.string(),
  sigil: z.object({ description: z.string() }),
  founded: DateSchema,
  extinct: DateSchema.optional(),
  status: z.enum(["extant", "extinct", "exiled", "hidden"]),
  "sworn-from": z.array(z.string()).default([]),
  "cadet-houses": z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  region: z.enum(REGION_SLUGS).optional(),
  seats: z.array(HouseInfoEntrySchema).optional(),
  heads: z.array(HouseInfoEntrySchema).optional(),
  regions: z.array(HouseInfoEntrySchema).optional(),
  titles: z.array(HouseInfoEntrySchema).optional(),
  "notable-members": z.array(HouseInfoEntrySchema).optional(),
  "ancestral-weapons": z.array(z.string()).optional(),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export const CharacterSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  sex: z.enum(["m", "f"]).nullable().default(null),
  born: DateSchema.nullable(),
  died: DateSchema.nullable(),
  "primary-house": z.string().nullable(),
  "also-of-houses": z.array(z.string()).default([]),
  parents: z.array(z.string()).default([]),
  spouses: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  placeholder: z.boolean().default(false),
  "placeholder-reason": z
    .enum(["unnamed", "unwritten", "uncertain"])
    .nullable()
    .default(null),
  "exclude-from-tree": z.boolean().default(false),
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
  type: z.enum([
    "battle",
    "siege",
    "treaty",
    "wedding",
    "death",
    "betrayal",
    "other",
  ]),
  date: DateSchema,
  location: z.union([z.string(), CoordsSchema]),
  participants: z.array(ParticipantSchema).default([]),
  outcome: z.string().optional(),
  casualties: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const BattleTypeSchema = z.enum([
  "battle",
  "siege",
  "war",
  "campaign",
  "raid",
  "naval",
  "massacre",
  "rebellion",
  "mutiny",
  "skirmish",
  "other",
]);

export const BattleSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: BattleTypeSchema,
  war: z.string().optional(),
  start: DateSchema,
  end: DateSchema,
  location: z.string().optional(),
  region: z.enum(REGION_SLUGS).optional(),
  participants: z.array(ParticipantSchema).default([]),
  commanders: z.array(z.string()).default([]),
  victor: z.string().optional(),
  outcome: z.string().optional(),
  casualties: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export type Castle = z.infer<typeof CastleSchema>;
export type House = z.infer<typeof HouseSchema>;
export type HouseInfoEntry = z.infer<typeof HouseInfoEntrySchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Dragon = z.infer<typeof DragonSchema>;
export type Battle = z.infer<typeof BattleSchema>;
