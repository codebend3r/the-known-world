import { MainMenuTile } from "@/components/MainMenuTile";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import styles from "@/components/MainMenu/MainMenu.module.scss";

export function MainMenu() {
  return (
    <nav className={styles.menu} aria-label="Atlas sections">
      <MainMenuTile
        title="Maps"
        subtitle="Survey the realm."
        glyph={sectionGlyphs.maps}
        href="/maps/"
        status="coming-soon"
      />
      <MainMenuTile
        title="Timeline"
        subtitle="Trace the centuries."
        glyph={sectionGlyphs.timeline}
        href="/timeline/"
      />
      <MainMenuTile
        title="Houses"
        subtitle="Read the rolls of the great houses."
        glyph={sectionGlyphs.houses}
        href="/houses/"
      />
      <MainMenuTile
        title="Characters"
        subtitle="Meet the lords, knights, and kings."
        glyph={sectionGlyphs.characters}
        href="/characters/"
      />
      <MainMenuTile
        title="Weapons"
        subtitle="Lift the blades of legend."
        glyph={sectionGlyphs.weapons}
        href="/weapons/"
      />
      <MainMenuTile
        title="Battles"
        subtitle="Walk the fields of war."
        glyph={sectionGlyphs.battles}
        href="/battles/"
      />
      <MainMenuTile
        title="Dragons"
        subtitle="Wake the dragon."
        glyph={sectionGlyphs.dragons}
        href="/dragons/"
        visible={false}
      />
    </nav>
  );
}
