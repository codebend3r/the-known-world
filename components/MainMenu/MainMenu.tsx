import { MainMenuTile } from "@/components/MainMenuTile";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import styles from "@/components/MainMenu/MainMenu.module.scss";

// The contents ledger: every section of the atlas bound in one case, each
// entry numbered as an engraved plate.
export function MainMenu() {
  return (
    <nav className={styles.menu} aria-label="Atlas sections">
      <MainMenuTile
        plate="I"
        title="Maps"
        subtitle="Survey the realm."
        glyph={sectionGlyphs.maps}
        href="/maps/"
      />
      <MainMenuTile
        plate="II"
        title="Houses"
        subtitle="The rolls of the great houses."
        glyph={sectionGlyphs.houses}
        href="/houses/"
      />
      <MainMenuTile
        plate="III"
        title="Characters"
        subtitle="Lords, knights, and kings."
        glyph={sectionGlyphs.characters}
        href="/characters/"
      />
      <MainMenuTile
        plate="IV"
        title="Timeline"
        subtitle="Three centuries, end to end."
        glyph={sectionGlyphs.timeline}
        href="/timeline/"
      />
      <MainMenuTile
        plate="V"
        title="Battles"
        subtitle="The fields of war, surveyed."
        glyph={sectionGlyphs.battles}
        href="/battles/"
      />
      <MainMenuTile
        plate="VI"
        title="Weapons"
        subtitle="Blades of record."
        glyph={sectionGlyphs.weapons}
        href="/weapons/"
      />
      <MainMenuTile
        plate="VII"
        title="Dragons"
        subtitle="Wake the dragon."
        glyph={sectionGlyphs.dragons}
        href="/dragons/"
        visible={false}
      />
    </nav>
  );
}
