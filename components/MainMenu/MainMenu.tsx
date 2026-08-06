import { MainMenuTile } from "@/components/MainMenuTile";
import { sectionGlyphs } from "@/components/SectionGlyphs";
import styles from "@/components/MainMenu/MainMenu.module.scss";

export function MainMenu() {
  return (
    <nav className={styles.menu} aria-label="Atlas sections">
      <MainMenuTile
        title="Maps"
        subtitle="Survey the realm from the Wall to the Summer Sea."
        glyph={sectionGlyphs.maps}
        href="/maps/"
        plate="01"
      />
      <MainMenuTile
        title="Timeline"
        subtitle="Trace the centuries from the Dawn Age onward."
        glyph={sectionGlyphs.timeline}
        href="/timeline/"
        plate="02"
      />
      <MainMenuTile
        title="Houses"
        subtitle="Read the rolls of the great and minor houses."
        glyph={sectionGlyphs.houses}
        href="/houses/"
        plate="03"
      />
      <MainMenuTile
        title="Castles"
        subtitle="Tour the seats and strongholds of Westeros."
        glyph={sectionGlyphs.castles}
        href="/castles/"
        plate="04"
      />
      <MainMenuTile
        title="Characters"
        subtitle="Meet the lords, knights, and kings."
        glyph={sectionGlyphs.characters}
        href="/characters/"
        plate="05"
      />
      <MainMenuTile
        title="Weapons"
        subtitle="Lift the named blades of legend."
        glyph={sectionGlyphs.weapons}
        href="/weapons/"
        plate="06"
      />
      <MainMenuTile
        title="Battles"
        subtitle="Walk the fields of war."
        glyph={sectionGlyphs.battles}
        href="/battles/"
        plate="07"
      />
      <MainMenuTile
        title="Dragons"
        subtitle="Wake the dragons of old Valyria."
        glyph={sectionGlyphs.dragons}
        href="/dragons/"
        plate="08"
        visible={false}
      />
    </nav>
  );
}
