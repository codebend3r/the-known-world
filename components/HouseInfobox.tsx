import Link from 'next/link';
import { Sigil } from './Sigil';
import type {
  House,
  Castle,
  Character,
  HouseInfoEntry,
} from '@/lib/schemas';

type Props = {
  house: House;
  castlesBySlug: Map<string, Castle>;
  charactersBySlug: Map<string, Character>;
  housesBySlug: Map<string, House>;
};

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, '');
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function formatDate(d: House['founded']): string {
  const { year, era, precision } = d;
  if (era === 'AC' || era === 'BC') {
    return `${Math.abs(year)} ${era}`;
  }
  const eraLabel = era
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  return precision === 'legendary' ? `${eraLabel} (legendary)` : eraLabel;
}

type EntryProps = {
  entry: HouseInfoEntry;
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

function InfoEntry({ entry, hrefPrefix, exists }: EntryProps) {
  const canLink =
    !!entry.slug &&
    !!hrefPrefix &&
    (exists ? exists(entry.slug) : true);
  return (
    <li>
      {canLink ? (
        <Link href={`${hrefPrefix}/${entry.slug}/`}>{entry.name}</Link>
      ) : (
        <span>{entry.name}</span>
      )}
      {entry.note && (
        <span className="house-infobox__note"> ({entry.note})</span>
      )}
    </li>
  );
}

type RowProps = {
  label: string;
  entries: HouseInfoEntry[];
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

function InfoRow({ label, entries, hrefPrefix, exists }: RowProps) {
  if (entries.length === 0) return null;
  return (
    <div className="house-infobox__row">
      <dt>{label}</dt>
      <dd>
        <ul>
          {entries.map((entry, i) => (
            <InfoEntry
              key={`${entry.name}-${i}`}
              entry={entry}
              hrefPrefix={hrefPrefix}
              exists={exists}
            />
          ))}
        </ul>
      </dd>
    </div>
  );
}

export function HouseInfobox({
  house,
  castlesBySlug,
  charactersBySlug,
  housesBySlug,
}: Props) {
  const seats: HouseInfoEntry[] =
    house.seats ??
    [
      {
        slug: house.seat,
        name: castlesBySlug.get(house.seat)?.name ?? humanizeSlug(house.seat),
      },
    ];

  const heads = house.heads ?? [];
  const regions = house.regions ?? [];
  const titles = house.titles ?? [];
  const weapons = house['ancestral-weapons'] ?? [];

  const cadets: HouseInfoEntry[] = house['cadet-houses'].map((slug) => ({
    slug,
    name: housesBySlug.get(slug)?.name ?? `House ${humanizeSlug(slug)}`,
  }));

  const liegeHouse = house.liege ? housesBySlug.get(house.liege) : null;

  return (
    <aside className="house-infobox" aria-label={`${house.name} infobox`}>
      <div className="house-infobox__sigil">
        <Sigil
          slug={house.slug}
          name={shortHouseName(house.name)}
          size="16rem"
          decorative
        />
      </div>

      <dl className="house-infobox__rows">
        {house.sigil.description && (
          <div className="house-infobox__row">
            <dt>Coat of arms</dt>
            <dd>{house.sigil.description}</dd>
          </div>
        )}

        <InfoRow
          label="Seats"
          entries={seats}
          hrefPrefix="/castles"
          exists={(s) => castlesBySlug.has(s)}
        />

        <InfoRow
          label="Heads"
          entries={heads}
          hrefPrefix="/characters"
          exists={(s) => {
            const c = charactersBySlug.get(s);
            return !!c && !c.placeholder;
          }}
        />

        <InfoRow label="Regions" entries={regions} />

        <InfoRow label="Titles" entries={titles} />

        <div className="house-infobox__row">
          <dt>Overlord</dt>
          <dd>
            {liegeHouse ? (
              <Link href={`/houses/${liegeHouse.slug}/`}>{liegeHouse.name}</Link>
            ) : house.liege ? (
              <span>{house.liege}</span>
            ) : (
              <span>None; sovereign</span>
            )}
          </dd>
        </div>

        {cadets.length > 0 && (
          <InfoRow
            label={cadets.length === 1 ? 'Cadet branch' : 'Cadet branches'}
            entries={cadets}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        )}

        <InfoRow label="Ancestral weapons" entries={weapons} />

        <div className="house-infobox__row">
          <dt>Founded</dt>
          <dd>{formatDate(house.founded)}</dd>
        </div>

        {house.extinct && (
          <div className="house-infobox__row">
            <dt>Extinct</dt>
            <dd>{formatDate(house.extinct)}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
