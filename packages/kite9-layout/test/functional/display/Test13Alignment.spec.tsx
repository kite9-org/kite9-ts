/**
 * Content alignment.
 * old→new: Test60 (active methods) → test_13_1…test_13_8
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

checkLayout(
  "test_13_01_ContainerVerticalTop",
  <kite9-diagram id="d" layout="RIGHT">
    <kite9-container
      id="c4"
      style="min-height: 80px; --kite9-sizing: minimize; --kite9-vertical-align: top; --kite9-layout: down"
    >
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: top; --kite9-horizontal-align: left"
      />
    </kite9-container>
    <kite9-container id="c5" style="min-height: 200px; --kite9-layout: down">
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: top; --kite9-horizontal-align: left"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: top; --kite9-horizontal-align: left"
      />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_13_02_PerGlyphAlignmentsDown",
  <kite9-diagram id="d" layout="DOWN">
    <kite9-container id="c5" style="min-width: 200px; min-height: 200px; --kite9-layout: down">
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: top; --kite9-horizontal-align: left"
      />
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: bottom; --kite9-horizontal-align: right"
      />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_13_03_PerGlyphAlignmentsRight",
  <kite9-diagram id="d" layout="RIGHT">
    <kite9-container id="c5" style="min-width: 200px; min-height: 200px; --kite9-layout: right">
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: top; --kite9-horizontal-align: left"
      />
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: bottom; --kite9-horizontal-align: right"
      />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_13_04_CentreAlignedWithLink",
  <kite9-diagram id="d">
    <kite9-container id="c5" style="min-width: 400px; min-height: 200px; --kite9-layout: right">
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
    </kite9-container>
    {link("l1", "one", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_13_05_AlignedWithOutLink",
  <kite9-diagram id="d">
    <kite9-container id="c5" style="min-width: 400px; min-height: 200px; --kite9-layout: right">
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
    </kite9-container>
    <kite9-container id="c4" />
    {link("l1", "one", "three")}
    {link("l2", "two", "c4")}
  </kite9-diagram>,
);

checkLayout(
  "test_13_06_UnalignedWithLink",
  <kite9-diagram id="d">
    <kite9-container id="c5" style="min-width: 400px; min-height: 200px; --kite9-layout: right">
      <kite9-glyph id="one" label="one" />
      <kite9-glyph id="two" label="two" />
      <kite9-glyph id="three" label="three" />
    </kite9-container>
    {link("l1", "one", "three")}
  </kite9-diagram>,
);

checkLayout(
  "test_13_07_UnalignedWithOutLink",
  <kite9-diagram id="d">
    <kite9-container id="c5" style="min-width: 400px; min-height: 200px">
      <kite9-glyph id="one" label="one" />
      <kite9-glyph id="two" label="two" />
      <kite9-glyph id="three" label="three" />
    </kite9-container>
    <kite9-container id="c4" />
    {link("l1", "two", "c4")}
  </kite9-diagram>,
);

checkLayout(
  "test_13_08_CentreAlignedNoLink",
  <kite9-diagram id="d">
    <kite9-container id="c5" style="min-width: 400px; min-height: 200px; --kite9-layout: down">
      <kite9-glyph
        id="one"
        label="one"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="two"
        label="two"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
      <kite9-glyph
        id="three"
        label="three"
        style="--kite9-vertical-align: center; --kite9-horizontal-align: center"
      />
    </kite9-container>
  </kite9-diagram>,
);
