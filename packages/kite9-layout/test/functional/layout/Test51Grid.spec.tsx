/**
 * Grid layouts: supergrids, nested grids, links in/out of grids, labels, big grids.
 * old→new: Test51Grid → test_51_01…test_51_30 (Java has no 51_5, 51_7, 51_21)
 */
import type { ComponentChild } from "preact";
import { checkLayout } from "../helpers/check-layout.js";
import { link } from "../helpers/link.js";

const GRID_2X2 = "--kite9-grid-columns: 2; --kite9-grid-rows: 2";

/** Java `createSquareGridContext`: four cells holding the given glyph ids. */
function squareCells(
  g1: ComponentChild,
  g2: ComponentChild,
  g3: ComponentChild,
  g4: ComponentChild,
): ComponentChild {
  return (
    <>
      <kite9-container id="tl" style="--kite9-occupies: 0 0">
        {g1}
      </kite9-container>
      <kite9-container id="tr" style="--kite9-occupies: 1 0">
        {g2}
      </kite9-container>
      <kite9-container id="bl" style="--kite9-occupies: 0 1">
        {g3}
      </kite9-container>
      <kite9-container id="br" style="--kite9-occupies: 1 1">
        {g4}
      </kite9-container>
    </>
  );
}

const g = (id: string, label = id): ComponentChild => (
  <kite9-glyph id={id} label={label} />
);

const one = () => g("one");
const two = () => g("two");
const three = () => g("three");
const four = () => g("four");

/** `outer` 2×2 grid of the four standard cells. */
function squareGrid(): ComponentChild {
  return (
    <kite9-container id="outer" layout="GRID" style={GRID_2X2}>
      {squareCells(one(), two(), three(), four())}
    </kite9-container>
  );
}

const cellId = (i: number, j: number) => `c${i}-${j}`;

/** Glyph placed into supergrid cells (Java createMockSupergrid / createSupergrid). */
function supergridGlyph(i: number, j: number): ComponentChild {
  if (i === 2 && j === 1) {
    return <kite9-glyph id="one" stereotype="ster" label="Some gylph" />;
  }
  if (i === 1 && j === 3) {
    return (
      <kite9-glyph id="two" stereotype="ster" label="sdlfkjsdlkfsdlkfk lksdjf" />
    );
  }
  if (i === 3 && j === 0) {
    return (
      <kite9-glyph id="three" stereotype="ster" label="sdlfkjsdlkfsdlkfk lksdjf" />
    );
  }
  if (i === 0 && j === 0) {
    return <kite9-glyph id="four" label="sdlfkjsdlkfsdlkfk lksdjf" />;
  }
  return null;
}

/** Java `createMockSupergrid`: plain container (NOT a grid) of occupying contexts + directed links. */
function mockSupergrid(size: number): ComponentChild {
  const cells: ComponentChild[] = [];
  const links: ComponentChild[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      cells.push(
        <kite9-container
          id={cellId(i, j)}
          style={`--kite9-occupies: ${i} ${i} ${j} ${j}`}
        >
          {supergridGlyph(i, j)}
        </kite9-container>,
      );
      if (j > 0) {
        links.push(
          link(`h${i}-${j}`, cellId(i, j), cellId(i, j - 1), {
            drawDirection: "right",
          }),
        );
      }
      if (i > 0) {
        links.push(
          link(`v${i}-${j}`, cellId(i, j), cellId(i - 1, j), {
            drawDirection: "up",
          }),
        );
      }
    }
  }
  return (
    <>
      <kite9-container id="outer">{cells}</kite9-container>
      {links}
    </>
  );
}

/** Java `createSupergrid`: grid with size×size cells, optional undirected content links. */
function supergrid(
  addContentLink: boolean,
  size: number,
): [ComponentChild, ComponentChild[]] {
  const cells: ComponentChild[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      cells.push(
        <kite9-container
          id={cellId(i, j)}
          style={`--kite9-occupies: ${i} ${i} ${j} ${j}`}
        >
          {supergridGlyph(i, j)}
        </kite9-container>,
      );
    }
  }
  const links: ComponentChild[] = addContentLink
    ? [
        link("t1", "one", "two"),
        link("t2", "one", "two"),
        link("t3", "one", "three"),
        link("t4", "one", "four"),
        link("t5", "two", "four"),
      ]
    : [];
  return [
    <kite9-container
      id="outer"
      layout="GRID"
      style={`--kite9-grid-columns: ${size}; --kite9-grid-rows: ${size}`}
    >
      {cells}
    </kite9-container>,
    links,
  ];
}

const contradicting = { checks: { checkNoContradictions: false } };

checkLayout(
  "test_51_01_SimpleGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID" style="--kite9-grid-columns: 2">
      <kite9-container id="tl" />
      <kite9-container id="tr" style="--kite9-occupies-x: 1; --kite9-occupies-y: 0" />
      <kite9-container id="bl" style="--kite9-occupies-x: 0; --kite9-occupies-y: 1 1" />
      <kite9-container id="br" style="--kite9-occupies-x: 1; --kite9-occupies-y: 1" />
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_51_02_SupergridMockup",
  <kite9-diagram id="diagram">{mockSupergrid(4)}</kite9-diagram>,
);

// Java: labels cannot be rendered on gridded containers.
checkLayout(
  "test_51_03_GridWithMissingBits",
  <kite9-diagram id="diagram">
    <kite9-container id="inner" layout="GRID" style={GRID_2X2}>
      <kite9-container id="tl" style="--kite9-occupies-x: 0; --kite9-occupies-y: 0">
        {g("tl-g", "Top\nLeft")}
      </kite9-container>
      <kite9-container id="tr" style="--kite9-occupies-x: 1; --kite9-occupies-y: 0">
        {g("tr-g", "Top\nRight")}
      </kite9-container>
      <kite9-container id="br" style="--kite9-occupies-x: 1; --kite9-occupies-y: 1">
        {g("br-g", "Bottom\nRight")}
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_51_04_ProperSupergrid",
  <kite9-diagram id="diagram">{supergrid(false, 4)[0]}</kite9-diagram>,
);

checkLayout(
  "test_51_06_GridWithUndirectedConnections",
  (() => {
    const [grid, links] = supergrid(true, 4);
    return (
      <kite9-diagram id="diagram">
        {grid}
        {links}
      </kite9-diagram>
    );
  })(),
);

checkLayout(
  "test_51_08_GridWithLabels",
  <kite9-diagram id="diagram">
    <kite9-container
      id="inner"
      layout="GRID"
      style={`${GRID_2X2}; --kite9-padding: 4px`}
    >
      <kite9-container id="tl" style="--kite9-occupies-x: 0; --kite9-occupies-y: 0">
        <kite9-text-line id="tll" label={"Top \n Left"} />
      </kite9-container>
      <kite9-container id="tr" style="--kite9-occupies-x: 1; --kite9-occupies-y: 0">
        <kite9-text-line id="trl" label="Top Right" />
      </kite9-container>
      <kite9-container id="br" style="--kite9-occupies-x: 1; --kite9-occupies-y: 1">
        <kite9-text-line id="brl" label="Bottom Right" />
      </kite9-container>
    </kite9-container>
    <kite9-key id="key" label="Bits missing" />
  </kite9-diagram>,
);

checkLayout(
  "test_51_09_IllegalDirectedConnections",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {link("l1", "one", "three", { drawDirection: "right", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

checkLayout(
  "test_51_10_IllegalDirectedConnections2",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {link("l1", "two", "three", { drawDirection: "right", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

// Java: assertThrows(ElementsMissingException) — grid cells can't be linked to anything.
checkLayout(
  "test_51_11_ContainerConnectionInsideDirected",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "tl", "five")}
  </kite9-diagram>,
  { skip: "Java expects ElementsMissingException; no expect-failure support in checkLayout" },
);

// Java: assertThrows(ElementsMissingException) — grid cells can't be linked to anything.
checkLayout(
  "test_51_12_ContainerConnectionInsideUndirected",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "tl", "three")}
  </kite9-diagram>,
  { skip: "Java expects ElementsMissingException; no expect-failure support in checkLayout" },
);

checkLayout(
  "test_51_13_ContainerConnectionOutsideUndirected",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "one", "five")}
  </kite9-diagram>,
);

checkLayout(
  "test_51_14_ContainerConnectionOutsideDirectedFacing",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "four", "five", { drawDirection: "right", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

checkLayout(
  "test_51_15_ContainerConnectionOutsideDirectedThroughContainer",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "one", "five", { drawDirection: "right", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

checkLayout(
  "test_51_16_ContainerConnectionParentOutsideUndirected",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "outer", "five")}
  </kite9-diagram>,
);

// Java: assertThrows(ElementsMissingException) — can't link a grid to its own contents.
checkLayout(
  "test_51_17_ContainerConnectionParentInsideUndirected",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "outer", "two")}
  </kite9-diagram>,
  { skip: "Java expects ElementsMissingException; no expect-failure support in checkLayout" },
);

// Link contradicts grid ordering.
checkLayout(
  "test_51_18_InternalConnectionContradiction1",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "one", "two", { drawDirection: "left", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

checkLayout(
  "test_51_19_InternalConnectionContradiction2",
  <kite9-diagram id="diagram">
    {squareGrid()}
    {g("five")}
    {link("l1", "one", "four", { drawDirection: "down", contradicting: true })}
  </kite9-diagram>,
  contradicting,
);

checkLayout(
  "test_51_20_3LayerGridWithDirectedConnections",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID" style="--kite9-grid-columns: 2; --kite9-grid-rows: 1">
      <kite9-container
        id="l"
        layout="GRID"
        style="--kite9-occupies: 0 0; --kite9-grid-columns: 1; --kite9-grid-rows: 2"
      >
        <kite9-container
          id="tl"
          layout="GRID"
          style="--kite9-occupies: 0 0; --kite9-grid-columns: 2; --kite9-grid-rows: 1"
        >
          <kite9-container id="tl1" style="--kite9-occupies: 0 0">
            {one()}
          </kite9-container>
          <kite9-container id="tl2" style="--kite9-occupies: 1 0">
            {two()}
          </kite9-container>
        </kite9-container>
        <kite9-container id="bl" style="--kite9-occupies: 0 1">
          {three()}
        </kite9-container>
      </kite9-container>
      <kite9-container id="r" style="--kite9-occupies: 1 0">
        {four()}
      </kite9-container>
    </kite9-container>
    {link("l1", "one", "two", { drawDirection: "right" })}
    {link("l2", "one", "three", { drawDirection: "down" })}
    {link("l3", "two", "four", { drawDirection: "right" })}
    {link("l4", "three", "four", { drawDirection: "right" })}
  </kite9-diagram>,
);

checkLayout(
  "test_51_22_OddSupergrid",
  (() => {
    const [grid, links] = supergrid(true, 5);
    return (
      <kite9-diagram id="diagram">
        {grid}
        {links}
      </kite9-diagram>
    );
  })(),
);

checkLayout(
  "test_51_23_SingleCellGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID">
      <kite9-container id="tl">{one()}</kite9-container>
    </kite9-container>
    {g("two")}
    {link("l1", "two", "one", { drawDirection: "left", toDecoration: "DIAMOND" })}
  </kite9-diagram>,
);

checkLayout(
  "test_51_24_NoCellGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID" />
  </kite9-diagram>,
);

checkLayout(
  "test_51_25_ProblematicGrid",
  <kite9-diagram id="diagram">
    <kite9-container id="outer" layout="GRID">
      <kite9-container
        id="1"
        style="--kite9-occupies: 0 0 2 2; min-width: 50px; min-height: 50px"
      >
        {two()}
        {three()}
      </kite9-container>
      <kite9-container
        id="2"
        style="--kite9-occupies: 0 0 3 3; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="3"
        style="--kite9-occupies: 1 1 2 2; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="4"
        style="--kite9-occupies: 3 3 2 2; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="5"
        style="--kite9-occupies: 2 2 0 0; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="6"
        style="--kite9-occupies: 3 3 4 4; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="7"
        style="--kite9-occupies: 1 1 5 5; min-width: 50px; min-height: 50px"
      />
      <kite9-container
        id="8"
        style="--kite9-occupies: 0 0 6 6; min-width: 50px; min-height: 50px"
      />
    </kite9-container>
    {g("one")}
    {link("l1", "three", "one", { toDecoration: "DIAMOND" })}
    {link("l2", "one", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_51_26_GridWithContainerLabel",
  <kite9-diagram id="diagram">
    <kite9-container
      id="table"
      layout="GRID"
      style="--kite9-grid-columns: 2; --kite9-grid-rows: 10; --kite9-margin: 0; --kite9-padding: 0"
    >
      <kite9-container id="cell1" style="min-width: 100px; min-height: 100px" />
      <kite9-container
        id="cell2"
        style="--kite9-occupies: 1 1 6 7; --kite9-layout: right; min-width: 100px; min-height: 100px"
      >
        <kite9-container
          id="ctx1"
          label="Some label"
          layout="RIGHT"
          style="--kite9-sizing: maximize"
        />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_51_27_GridWithCellLabel",
  <kite9-diagram id="diagram">
    <kite9-container
      id="table"
      layout="GRID"
      style="--kite9-grid-columns: 2; --kite9-grid-rows: 10; --kite9-margin: 0; --kite9-padding: 0"
    >
      <kite9-container
        id="cell2"
        style="--kite9-occupies: 1 1 6 7; --kite9-layout: right; min-width: 100px; min-height: 100px"
      >
        <kite9-label id="cell2-l" label="Cell Label Left" style="--kite9-label-placement: left" />
      </kite9-container>
      <kite9-container id="cell0" style="min-width: 100px; min-height: 100px">
        <kite9-label id="cell0-l" label="Cell Label TR" style="--kite9-label-placement: down" />
      </kite9-container>
      <kite9-container id="cell1" style="min-width: 100px; min-height: 100px">
        <kite9-label id="cell1-l1" label="Cell Label B" style="--kite9-label-placement: up" />
        <kite9-label id="cell1-l2" label="Cell Label B" style="--kite9-label-placement: left" />
      </kite9-container>
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_51_28_GridWithCellLabelAndContents",
  <kite9-diagram id="diagram">
    <kite9-container
      id="table"
      layout="GRID"
      style="--kite9-grid-columns: 2; --kite9-grid-rows: 10; --kite9-margin: 0; --kite9-padding: 0"
    >
      <kite9-container
        id="cell2"
        style="--kite9-occupies: 1 1 6 7; --kite9-layout: right; min-width: 100px; min-height: 100px"
      >
        {one()}
      </kite9-container>
      <kite9-container id="cell0" style="min-width: 100px; min-height: 100px">
        <kite9-label id="cell0-l" label="2 Cell Label Bottom" style="--kite9-label-placement: down" />
        {two()}
      </kite9-container>
      <kite9-container id="cell1" style="min-width: 100px; min-height: 100px" />
    </kite9-container>
    {link("l1", "one", "two")}
  </kite9-diagram>,
);

checkLayout(
  "test_51_29_MassiveGridNoLinks",
  <kite9-diagram id="diagram">
    <kite9-container
      id="outer"
      layout="GRID"
      style="--kite9-grid-columns: 10; --kite9-grid-rows: 10"
    >
      {Array.from({ length: 100 }, (_, i) => (
        <kite9-container id={`c${i}`}>
          <kite9-glyph id={`g${i}`} label={`${i}`} />
        </kite9-container>
      ))}
    </kite9-container>
  </kite9-diagram>,
);

checkLayout(
  "test_51_30_MassiveGridAndLink",
  <kite9-diagram id="diagram">
    <kite9-container
      id="outer"
      layout="GRID"
      style="--kite9-grid-columns: 6; --kite9-grid-rows: 6"
    >
      {Array.from({ length: 36 }, (_, i) => (
        <kite9-container id={`c${i}`}>
          <kite9-glyph id={`g${i}`} label={`${i}`} />
        </kite9-container>
      ))}
    </kite9-container>
    {link("l1", "g4", "g23")}
  </kite9-diagram>,
);
