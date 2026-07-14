import { Point, Stroke } from "../types";

/**
 * Helper to compute bounds and create a fully configured Stroke object from a list of points.
 */
function createStrokeFromPoints(points: Point[], id: string): Stroke {
  if (points.length === 0) {
    return {
      id,
      points: [],
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      createdAt: Date.now(),
    };
  }
  
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    id,
    points,
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX || 1, // Avoid 0 width
    height: maxY - minY || 1, // Avoid 0 height
    createdAt: Date.now() + Math.random() * 10, // Small spread for stable ID ordering
  };
}

// Draw "x" (two crossed diagonal lines)
function drawX(cx: number, cy: number, size: number = 30, prefix: string = "x"): Stroke[] {
  const points1: Point[] = [];
  const points2: Point[] = [];
  const half = size / 2;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points1.push({ x: cx - half + t * size, y: cy - half + t * size });
    points2.push({ x: cx + half - t * size, y: cy - half + t * size });
  }
  return [
    createStrokeFromPoints(points1, `${prefix}_line1`),
    createStrokeFromPoints(points2, `${prefix}_line2`),
  ];
}

// Draw "=" (two horizontal bars)
function drawEquals(cx: number, cy: number, width: number = 30, prefix: string = "eq"): Stroke[] {
  const points1: Point[] = [];
  const points2: Point[] = [];
  const halfW = width / 2;
  const gap = 8;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    points1.push({ x: cx - halfW + t * width, y: cy - gap / 2 });
    points2.push({ x: cx - halfW + t * width, y: cy + gap / 2 });
  }
  return [
    createStrokeFromPoints(points1, `${prefix}_bar1`),
    createStrokeFromPoints(points2, `${prefix}_bar2`),
  ];
}

// Draw "5" (simplified 2 strokes - top bar, and looping bottom)
function draw5(cx: number, cy: number, size: number = 32, prefix: string = "num5"): Stroke[] {
  const halfW = size / 2;
  const halfH = size / 2;
  
  // Stroke 1: Left down and loop
  const p1: Point[] = [];
  p1.push({ x: cx + halfW, y: cy - halfH });
  p1.push({ x: cx - halfW, y: cy - halfH });
  p1.push({ x: cx - halfW, y: cy });
  // Curved loop
  for (let angle = 180; angle >= -90; angle -= 30) {
    const rad = (angle * Math.PI) / 180;
    p1.push({
      x: cx + Math.cos(rad) * halfW,
      y: cy + halfH / 2 + Math.sin(rad) * halfH / 2,
    });
  }

  return [createStrokeFromPoints(p1, `${prefix}_body`)];
}

// Draw "a" (loop and tail)
function drawA(cx: number, cy: number, size: number = 24, prefix: string = "symA"): Stroke[] {
  const points: Point[] = [];
  const r = size / 2;
  // Circular loop
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * 360 * (Math.PI / 180);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  // Tail line down
  const tail: Point[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    tail.push({ x: cx + r, y: cy - r + t * size });
  }
  return [
    createStrokeFromPoints(points, `${prefix}_loop`),
    createStrokeFromPoints(tail, `${prefix}_tail`),
  ];
}

// Draw "b" (vertical line and bubble)
function drawB(cx: number, cy: number, size: number = 30, prefix: string = "symB"): Stroke[] {
  const half = size / 2;
  const stem: Point[] = [];
  for (let i = 0; i <= 8; i++) {
    stem.push({ x: cx - half, y: cy - size + i * (size * 1.5 / 8) });
  }
  const bubble: Point[] = [];
  for (let i = -90; i <= 270; i += 30) {
    const rad = (i * Math.PI) / 180;
    bubble.push({
      x: cx - half + Math.cos(rad) * half,
      y: cy + Math.sin(rad) * half,
    });
  }
  return [
    createStrokeFromPoints(stem, `${prefix}_stem`),
    createStrokeFromPoints(bubble, `${prefix}_bubble`),
  ];
}

// Draw "+" (horizontal and vertical cross)
function drawPlus(cx: number, cy: number, size: number = 26, prefix: string = "plus"): Stroke[] {
  const half = size / 2;
  const h: Point[] = [];
  const v: Point[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    h.push({ x: cx - half + t * size, y: cy });
    v.push({ x: cx, y: cy - half + t * size });
  }
  return [
    createStrokeFromPoints(h, `${prefix}_horiz`),
    createStrokeFromPoints(v, `${prefix}_vert`),
  ];
}

// Draw simple solid horizontal bar (e.g. fraction line or underline)
function drawHorizontalBar(startX: number, endX: number, cy: number, prefix: string = "bar"): Stroke[] {
  const points: Point[] = [];
  const steps = 15;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: startX + t * (endX - startX), y: cy });
  }
  return [createStrokeFromPoints(points, `${prefix}_stroke`)];
}

export interface PresetTest {
  id: string;
  name: string;
  description: string;
  expectedResult: string;
  setup: (D: number) => Stroke[];
}

export const PRESET_TESTS: PresetTest[] = [
  {
    id: "test-1",
    name: "1. x = 5 (Single Line)",
    description: "Draws 'x', '=' and '5' closely on a single line. Standard horizontal symbols should merge via V_a ∧ H.",
    expectedResult: "1 merged Box representing the full equation.",
    setup: () => {
      return [
        ...drawX(150, 200, 28, "t1_x"),
        ...drawEquals(210, 200, 28, "t1_eq"),
        ...draw5(265, 200, 30, "t1_5"),
      ];
    },
  },
  {
    id: "test-2",
    name: "2. Gap ≥ D (Split Equations)",
    description: "Two equations on the same line, separated by a horizontal distance greater than D (default 40px).",
    expectedResult: "2 separate Boxes because the horizontal gap is >= D (H check fails).",
    setup: (D) => {
      const gapValue = Math.max(D + 30, 80);
      return [
        // Equation 1: x = 5
        ...drawX(150, 200, 28, "t2_x"),
        ...drawEquals(200, 200, 28, "t2_eq"),
        ...draw5(245, 200, 30, "t2_5"),
        // Equation 2: a = b, separated by gapValue
        ...drawA(245 + 15 + gapValue + 15, 200, 24, "t2_a"),
        ...drawEquals(245 + 15 + gapValue + 65, 200, 28, "t2_eq2"),
        ...drawB(245 + 15 + gapValue + 115, 200, 30, "t2_b"),
      ];
    },
  },
  {
    id: "test-3",
    name: "3. Stacked Equations (No Overlap)",
    description: "Two parallel equations stacked vertically with zero horizontal gap, but vertical overlap (dipRatio) is < 33%. Prove H alone never merges.",
    expectedResult: "2 separate Boxes (V_a fails because vertical overlap < 33%, even though gap is 0).",
    setup: () => {
      return [
        // Top line: a + b
        ...drawA(150, 130, 24, "t3_top_a"),
        ...drawPlus(200, 130, 24, "t3_top_plus"),
        ...drawB(250, 130, 28, "t3_top_b"),
        // Bottom line: x = 5
        ...drawX(150, 210, 28, "t3_bot_x"),
        ...drawEquals(200, 210, 28, "t3_bot_eq"),
        ...draw5(250, 210, 30, "t3_bot_5"),
      ];
    },
  },
  {
    id: "test-4",
    name: "4. Exponent / Limit (≥ 33% dip)",
    description: "A small exponent box dipping at least 33% of its height into the base symbol's vertical interval.",
    expectedResult: "1 unified Box (fuses exponent into the base box, ensuring no nested rendering).",
    setup: () => {
      return [
        // Base box "x" centered at (150, 200) with height 40 (minY=180, maxY=220)
        ...drawX(150, 200, 40, "t4_base_x"),
        // Exponent "5" centered at (185, 180) with height 24 (minY=168, maxY=192)
        // Overlap from 180 to 192 = 12px. Exponent height is 24px.
        // Overlap ratio = 12/24 = 50% (which is >= 33% dip ratio).
        ...draw5(185, 180, 24, "t4_exp_5"),
      ];
    },
  },
  {
    id: "test-5",
    name: "5. Standard Fraction (V_b)",
    description: "A standard fraction: numerator 'a', denominator 'b', and a wide fraction bar spanning both horizontally, within proximity limits.",
    expectedResult: "1 unified Box. Fraction merges via V_b even though numerator and denominator are far apart.",
    setup: () => {
      return [
        // Numerator 'a' high up
        ...drawA(200, 100, 24, "t5_num"),
        // Denominator 'b' low down
        ...drawB(200, 220, 26, "t5_den"),
        // Fraction Bar spanning from x=140 to x=260, at y=160
        // Width of bar = 120px, wider than both a (24px) and b (26px)
        ...drawHorizontalBar(130, 270, 160, "t5_bar"),
      ];
    },
  },
  {
    id: "test-6",
    name: "6. Wide Bar - Proximity Fail",
    description: "Fraction bar is wide and spans both boxes, but sits very far (e.g. 3x medianH) from the denominator box.",
    expectedResult: "With Guard ON: 2 separate Boxes (V_b proximity check fails). With Guard OFF: 1 Box (merges).",
    setup: () => {
      return [
        // Numerator 'a'
        ...drawA(200, 100, 20, "t6_num"),
        // Denominator 'b' (extremely far below)
        ...drawB(200, 280, 20, "t6_den"),
        // Fraction Bar at y=130 (near numerator, far from denominator)
        ...drawHorizontalBar(130, 270, 125, "t6_bar"),
      ];
    },
  },
  {
    id: "test-7",
    name: "7. Underline / Page Rule",
    description: "Draws an equation, and a long underline far below. Proximity guard stops the line from fusing with the equation.",
    expectedResult: "2 separate Boxes while Guard is ON (stops page rules from fusing with math above them).",
    setup: () => {
      return [
        // Equation: x = 5
        ...drawX(150, 150, 28, "t7_x"),
        ...drawEquals(210, 150, 28, "t7_eq"),
        ...draw5(265, 150, 30, "t7_5"),
        // Underline drawn far below at y=275
        ...drawHorizontalBar(100, 320, 275, "t7_underline"),
      ];
    },
  },
  {
    id: "test-8",
    name: "8. Ordering: V_a Then H",
    description: "Two equations stacked. Since they do not overlap vertically (V_a fails), H is never evaluated. Verify via instrumented logs.",
    expectedResult: "Evaluation log explicitly displays 'H Check: SKIPPED (V_a failed. Ordering constraint prevents evaluating H)'.",
    setup: () => {
      return [
        ...drawX(200, 130, 26, "t8_top"),
        ...draw5(200, 210, 26, "t8_bot"),
      ];
    },
  },
  {
    id: "test-9",
    name: "9. Fixpoint Multi-Merge",
    description: "Box A merges with B (H gap is 35px), and the resulting union AB merges with C (gap is 35px). Evaluated to fixpoint.",
    expectedResult: "All 3 fuse into 1 single equation box.",
    setup: () => {
      return [
        ...drawX(120, 200, 26, "t9_a"), // Box A
        ...drawEquals(185, 200, 26, "t9_b"), // Box B (H-gap from A ~39px < 40)
        ...draw5(250, 200, 26, "t9_c"), // Box C (H-gap from B ~39px < 40)
      ];
    },
  },
  {
    id: "test-10",
    name: "10. Live Sliders Reflow",
    description: "A border case containing three symbols with 45px gaps. Dragging the horizontal distance slider 'D' from 40 to 60 triggers immediate reflow.",
    expectedResult: "Boxes merge/split live on slider drag without reloading the page.",
    setup: () => {
      return [
        ...drawX(120, 200, 26, "t10_a"),
        ...drawEquals(195, 200, 26, "t10_b"), // Gap is ~49px
        ...draw5(270, 200, 26, "t10_c"), // Gap is ~49px
      ];
    },
  },
];
