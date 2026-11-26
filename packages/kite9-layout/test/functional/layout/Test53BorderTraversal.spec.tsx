/**
 * Border traversal rules on containers.
 * old→new: Test53BorderTraversal → test_53_01…test_53_02
 */
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

// Java checkEverythingStraight / checkNoHops → false (the defaults).

// Java additionally asserts via mustTurn() that the g2→six link turns;
// that post-layout assertion is not ported.
checkLayout(
  "test_53_01_MustLeaveTop",
  <kite9-diagram id="diagram" layout="RIGHT">
    <kite9-glyph id="one" label="one" />
    <kite9-container id="five" style="--kite9-traversal-top: always">
      <kite9-glyph id="six" label="six" />
    </kite9-container>
    <kite9-glyph id="two" label="two" />
    <kite9-glyph id="three" label="three" />
    {link("l1", "two", "six")}
  </kite9-diagram>,
);

// Java additionally asserts via mustContradict() that the crossing link is
// contradicting; so contradictions are allowed here. Link rank -1000 is not
// expressible in the JSX helper.
checkLayout(
  "test_53_02_LeavingOnly",
  <kite9-diagram id="dia">
    <kite9-glyph id="a" label="a" />
    <kite9-glyph id="b" label="b" />
    <kite9-container id="c" style="--kite9-traversal: leaving">
      <kite9-glyph id="inner" label="inner" />
    </kite9-container>
    <kite9-glyph id="d" label="d" />
    <kite9-glyph id="e" label="e" />
    {/* creating an 'S' shape */}
    {link("l1", "a", "b", { drawDirection: "right" })}
    {link("l2", "b", "c", { drawDirection: "down" })}
    {link("l3", "c", "d", { drawDirection: "down" })}
    {link("l4", "d", "e", { drawDirection: "right" })}
    {link("l5", "inner", "e")}
    {/* tricky bit, crossing the 'S' like a dollar sign - won't be allowed here */}
    {link("l6", "a", "e", { drawDirection: "down", contradicting: true })}
  </kite9-diagram>,
  { checks: { checkNoContradictions: false } },
);
