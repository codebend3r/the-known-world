import Link from "next/link";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";
import { cx } from "@/lib/cx";
import { formatLifespan, wasKing } from "@/lib/family-tree-label";
import styles from "@/components/FamilyTree/FamilyTree.module.scss";

type NameProps = Pick<
  TreeSpouse,
  "slug" | "name" | "alias" | "isPlaceholder"
> & {
  className: string;
};

function NameContent({ name, alias }: { name: string; alias: string | null }) {
  return (
    <>
      {name}
      {alias && <span className={styles.alias}> ({alias})</span>}
    </>
  );
}

function CharacterName({
  slug,
  name,
  alias,
  isPlaceholder,
  className,
}: NameProps) {
  if (slug && !isPlaceholder) {
    return (
      <Link href={`/characters/${slug}/`} className={className}>
        <NameContent name={name} alias={alias} />
      </Link>
    );
  }
  return (
    <span className={className}>
      <NameContent name={name} alias={alias} />
    </span>
  );
}

function GenderGlyph({ sex }: { sex: TreeNode["sex"] }) {
  if (sex === null) return null;
  return (
    <span
      className={cx(
        styles.gender,
        sex === "m" ? styles.genderM : styles.genderF,
      )}
      aria-label={sex === "m" ? "male" : "female"}
    >
      {sex === "m" ? "♂" : "♀"}
    </span>
  );
}

function KingMark({ titles }: { titles: string[] }) {
  if (!wasKing(titles)) return null;
  return (
    <span className={styles.king} aria-label="king" title="King">
      ♛
    </span>
  );
}

function sexClass(sex: TreeNode["sex"]): string | false {
  return sex ? (sex === "m" ? styles.nameM : styles.nameF) : false;
}

function PersonLabel({ node }: { node: TreeNode }) {
  const lifespan = formatLifespan({ born: node.born, died: node.died });
  const className = cx(
    styles.name,
    sexClass(node.sex),
    node.isPlaceholder && styles.namePlaceholder,
    node.isExternal && styles.nameExternal,
  );
  return (
    <span className={styles.person}>
      <KingMark titles={node.titles} />
      <GenderGlyph sex={node.sex} />
      <CharacterName
        slug={node.slug}
        name={node.name}
        alias={node.alias}
        isPlaceholder={node.isPlaceholder}
        className={className}
      />
      {lifespan && <span className={styles.lifespan}>{lifespan}</span>}
    </span>
  );
}

function NodeRow({ node }: { node: TreeNode }) {
  const rowClass = cx(styles.row, node.isPlaceholder && styles.rowPlaceholder);
  return (
    <div className={rowClass}>
      <PersonLabel node={node} />
      {node.spouses.map((spouse) => {
        const className = cx(
          styles.name,
          sexClass(spouse.sex),
          spouse.isPlaceholder && styles.namePlaceholder,
          !spouse.isInHouse && styles.nameExternal,
        );
        return (
          <span key={spouse.slug ?? spouse.name} className={styles.spouse}>
            <span className={styles.cross} aria-hidden="true">
              ⚭
            </span>
            <KingMark titles={spouse.titles} />
            <GenderGlyph sex={spouse.sex} />
            <CharacterName
              slug={spouse.slug}
              name={spouse.name}
              alias={spouse.alias}
              isPlaceholder={spouse.isPlaceholder}
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
    <li className={styles.node}>
      <NodeRow node={node} />
      {node.children.length > 0 && (
        <ul className={styles.children}>
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
      <p className={styles.empty}>
        No members of this house have yet been recorded.
      </p>
    );
  }
  return (
    <ul className={styles.tree}>
      {roots.map((root) => (
        <Branch key={root.slug} node={root} />
      ))}
    </ul>
  );
}
