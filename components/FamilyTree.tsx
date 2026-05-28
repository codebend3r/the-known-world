import Link from 'next/link';
import type { TreeNode } from '@/lib/family-tree';

function formatLifespan(node: TreeNode): string | null {
  if (node.born === null && node.died === null) return null;
  const b = node.born === null ? '?' : String(node.born);
  const d = node.died === null ? '' : String(node.died);
  return d ? `${b}–${d}` : `${b}–`;
}

type NameProps = {
  slug: string | null;
  name: string;
  placeholder: boolean;
  className: string;
};

function CharacterName({ slug, name, placeholder, className }: NameProps) {
  if (slug && !placeholder) {
    return (
      <Link href={`/characters/${slug}/`} className={className}>
        {name}
      </Link>
    );
  }
  return <span className={className}>{name}</span>;
}

function GenderGlyph({ sex }: { sex: 'm' | 'f' | null }) {
  if (sex === null) return null;
  return (
    <span
      className={`family-tree__gender family-tree__gender--${sex}`}
      aria-label={sex === 'm' ? 'male' : 'female'}
    >
      {sex === 'm' ? '♂' : '♀'}
    </span>
  );
}

function sexClass(sex: 'm' | 'f' | null): string {
  return sex ? ` family-tree__name--${sex}` : '';
}

function PersonLabel({ node }: { node: TreeNode }) {
  const lifespan = formatLifespan(node);
  const className =
    'family-tree__name' +
    sexClass(node.sex) +
    (node.placeholder ? ' family-tree__name--placeholder' : '') +
    (node.external ? ' family-tree__name--external' : '');
  return (
    <span className="family-tree__person">
      <GenderGlyph sex={node.sex} />
      <CharacterName
        slug={node.slug}
        name={node.name}
        placeholder={node.placeholder}
        className={className}
      />
      {lifespan && <span className="family-tree__lifespan">{lifespan}</span>}
    </span>
  );
}

function NodeRow({ node }: { node: TreeNode }) {
  const rowClass =
    'family-tree__row' +
    (node.placeholder ? ' family-tree__row--placeholder' : '');
  return (
    <div className={rowClass}>
      <PersonLabel node={node} />
      {node.spouses.map((spouse) => {
        const className =
          'family-tree__name family-tree__name--spouse' +
          sexClass(spouse.sex) +
          (spouse.placeholder ? ' family-tree__name--placeholder' : '') +
          (!spouse.inHouse ? ' family-tree__name--external' : '');
        return (
          <span
            key={spouse.slug ?? spouse.name}
            className="family-tree__spouse"
          >
            <span className="family-tree__cross" aria-hidden="true">
              ⚭
            </span>
            <GenderGlyph sex={spouse.sex} />
            <CharacterName
              slug={spouse.slug}
              name={spouse.name}
              placeholder={spouse.placeholder}
              className={className}
            />
          </span>
        );
      })}
    </div>
  );
}

function Branch({ node }: { node: TreeNode }) {
  return (
    <li className="family-tree__node">
      <NodeRow node={node} />
      {node.children.length > 0 && (
        <ul className="family-tree__children">
          {node.children.map((child) => (
            <Branch key={child.slug} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FamilyTree({ roots }: { roots: TreeNode[] }) {
  if (roots.length === 0) {
    return (
      <p className="family-tree__empty">
        No members of this house have yet been recorded.
      </p>
    );
  }
  return (
    <ul className="family-tree">
      {roots.map((root) => (
        <Branch key={root.slug} node={root} />
      ))}
    </ul>
  );
}
