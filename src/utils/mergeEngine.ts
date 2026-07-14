import { Point, Stroke, Box, Tunables } from "../types";

/**
 * Calculates the vertical overlap of two boxes/strokes.
 * Return 0 if they do not overlap vertically.
 */
export function getVerticalOverlap(
  a: { minY: number; maxY: number },
  b: { minY: number; maxY: number }
): number {
  const top = Math.max(a.minY, b.minY);
  const bottom = Math.min(a.maxY, b.maxY);
  return Math.max(0, bottom - top);
}

/**
 * Calculates the horizontal gap between two boxes/strokes.
 * Return 0 if they overlap horizontally.
 */
export function getHorizontalGap(
  a: { minX: number; maxX: number },
  b: { minX: number; maxX: number }
): number {
  if (a.maxX < b.minX) {
    return b.minX - a.maxX;
  }
  if (b.maxX < a.minX) {
    return a.minX - b.maxX;
  }
  return 0; // Overlapping horizontally
}

/**
 * Calculates the edge-to-edge vertical gap between two boxes/strokes.
 * Return 0 if they overlap vertically.
 */
export function getVerticalGap(
  a: { minY: number; maxY: number },
  b: { minY: number; maxY: number }
): number {
  if (a.maxY < b.minY) {
    return b.minY - a.maxY;
  }
  if (b.maxY < a.minY) {
    return a.minY - b.maxY;
  }
  return 0; // Overlapping vertically
}

/**
 * Computes the median height of the current boxes.
 */
export function getMedianHeight(boxes: Box[]): number {
  if (boxes.length === 0) return 40; // Default height fallback
  const heights = boxes.map((b) => b.maxY - b.minY).sort((a, b) => a - b);
  const mid = Math.floor(heights.length / 2);
  if (heights.length % 2 !== 0) {
    return heights[mid];
  }
  return (heights[mid - 1] + heights[mid]) / 2;
}

/**
 * Creates a merged union box of two existing boxes.
 * Uses extreme extents and preserves the stable ID of the older box (or deterministic).
 */
export function getUnionBox(boxA: Box, boxB: Box): Box {
  const minX = Math.min(boxA.minX, boxB.minX);
  const minY = Math.min(boxA.minY, boxB.minY);
  const maxX = Math.max(boxA.maxX, boxB.maxX);
  const maxY = Math.max(boxA.maxY, boxB.maxY);
  
  // Stable ID assignment: inherit ID from the box that has the smaller/older createdAt
  const id = boxA.createdAt <= boxB.createdAt ? boxA.id : boxB.id;
  
  return {
    id,
    strokeIds: Array.from(new Set([...boxA.strokeIds, ...boxB.strokeIds])),
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    createdAt: Math.min(boxA.createdAt, boxB.createdAt),
  };
}

/**
 * Evaluation structure for logs
 */
export interface EvaluationResult {
  merged: boolean;
  reason: string;
  vaPassed: boolean;
  hPassed: boolean;
  vbPassed: boolean;
  bridgingStrokeId?: string;
  logs: string[];
}

/**
 * Evaluates the merge predicate for two boxes A and B.
 * Evaluation order is mandatory:
 * 1. Evaluate V_a first. Only if V_a passes, evaluate H.
 * 2. Independently, evaluate V_b (with proximity guard).
 */
export function evaluateMerge(
  boxA: Box,
  boxB: Box,
  allStrokes: Stroke[],
  tunables: Tunables,
  medianH: number,
  currentBoxes?: Box[],
  usedBridgingStrokeIds?: Set<string>
): EvaluationResult {
  const logs: string[] = [];
  const idA = boxA.id.replace("box_", "").slice(0, 5);
  const idB = boxB.id.replace("box_", "").slice(0, 5);
  
  logs.push(`[Predicate Start] Evaluating Box ${idA} and Box ${idB}`);

  // --- Step 1: V_a ---
  const overlap = getVerticalOverlap(boxA, boxB);
  const heightA = boxA.maxY - boxA.minY;
  const heightB = boxB.maxY - boxB.minY;
  const minHeight = Math.min(heightA, heightB);
  const requiredOverlap = tunables.dipRatio * minHeight;
  const vaPassed = overlap >= requiredOverlap;

  logs.push(
    `1. V_a Check: Vertical overlap = ${overlap.toFixed(1)}px. Required = ${requiredOverlap.toFixed(1)}px (dipRatio ${tunables.dipRatio} * shorter box height ${minHeight.toFixed(1)}px). Va Passed: ${vaPassed}`
  );

  let hPassed = false;
  // Ordering requirement: Only evaluate H if V_a passes!
  if (vaPassed) {
    const gap = getHorizontalGap(boxA, boxB);
    hPassed = gap < tunables.D;
    logs.push(
      `2. H Check (evaluated because V_a passed): Edge-to-edge gap = ${gap.toFixed(1)}px. Threshold D = ${tunables.D}px. H Passed: ${hPassed}`
    );
  } else {
    logs.push(
      `2. H Check: SKIPPED (V_a failed. Ordering constraint prevents evaluating H).`
    );
  }

  // Both V_a and H must pass to merge on this branch
  if (vaPassed && hPassed) {
    const reasonMsg = `V_a ∧ H (Overlap: ${overlap.toFixed(1)}px, Gap: ${getHorizontalGap(boxA, boxB).toFixed(1)}px < ${tunables.D}px)`;
    logs.push(`[MERGE DECISION] MERGING due to: ${reasonMsg}`);
    return {
      merged: true,
      reason: reasonMsg,
      vaPassed,
      hPassed,
      vbPassed: false,
      logs,
    };
  }

  // --- Step 2: V_b ---
  logs.push(`3. V_b Check: Scanning for wide bridging stroke S vertically between/adjacent to A and B...`);
  let vbPassed = false;
  let bridgingStrokeId: string | undefined = undefined;

  for (const stroke of allStrokes) {
    const sId = stroke.id.slice(0, 5);
    const sWidth = stroke.maxX - stroke.minX;
    const widthA = boxA.maxX - boxA.minX;
    const widthB = boxB.maxX - boxB.minX;

    // Skip if this stroke is already used as a bridging stroke
    if (usedBridgingStrokeIds && usedBridgingStrokeIds.has(stroke.id)) {
      continue;
    }

    // A bridging stroke must NOT already be a member of either boxA or boxB
    if (boxA.strokeIds.includes(stroke.id) || boxB.strokeIds.includes(stroke.id)) {
      continue;
    }

    // Condition 1: Wider than both
    if (sWidth <= widthA || sWidth <= widthB) {
      continue;
    }

    // Condition 2: Spans both
    const minLeft = Math.min(boxA.minX, boxB.minX);
    const maxRight = Math.max(boxA.maxX, boxB.maxX);
    const spansLeft = stroke.minX <= minLeft + tunables.spanTolerance;
    const spansRight = stroke.maxX >= maxRight - tunables.spanTolerance;

    if (!spansLeft || !spansRight) {
      continue;
    }

    // Condition 3: Vertically between / adjacent
    const midA = (boxA.minY + boxA.maxY) / 2;
    const midB = (boxB.minY + boxB.maxY) / 2;
    const midS = (stroke.minY + stroke.maxY) / 2;
    const isBetween = (midA < midS && midS < midB) || (midB < midS && midS < midA);

    if (!isBetween) {
      continue;
    }

    // Condition 3.5: Immediate adjacency check for fractions (maximum of 3 boxes merging)
    if (currentBoxes && currentBoxes.length > 0) {
      const boxAbove = midA < midS ? boxA : boxB;
      const boxBelow = midA < midS ? boxB : boxA;

      // Filter other boxes that do not contain the bridging stroke
      const otherBoxes = currentBoxes.filter(
        (c) => !c.strokeIds.includes(stroke.id)
      );

      // Only care about boxes overlapping horizontally with the bar
      const columnBoxes = otherBoxes.filter(
        (c) => getHorizontalGap(c, stroke) === 0
      );

      const aboveBoxes = columnBoxes.filter((c) => {
        const midC = (c.minY + c.maxY) / 2;
        return midC < midS;
      });

      const belowBoxes = columnBoxes.filter((c) => {
        const midC = (c.minY + c.maxY) / 2;
        return midC > midS;
      });

      const sortedAbove = [...aboveBoxes].sort((x, y) => {
        const midX = (x.minY + x.maxY) / 2;
        const midY = (y.minY + y.maxY) / 2;
        return midY - midX; // descending, so largest mid value is first (closest to S)
      });

      const sortedBelow = [...belowBoxes].sort((x, y) => {
        const midX = (x.minY + x.maxY) / 2;
        const midY = (y.minY + y.maxY) / 2;
        return midX - midY; // ascending, so smallest mid value is first (closest to S)
      });

      const closestAbove = sortedAbove[0];
      const closestBelow = sortedBelow[0];

      if (!closestAbove || !closestBelow) {
        continue;
      }

      const isImmediate =
        boxAbove.id === closestAbove.id && boxBelow.id === closestBelow.id;

      if (!isImmediate) {
        logs.push(
          ` - Stroke ${sId} satisfies width and span, but FAILS immediate adjacency check. Closest above = ${closestAbove.id.replace("box_", "").slice(0, 5)}, Closest below = ${closestBelow.id.replace("box_", "").slice(0, 5)}.`
        );
        continue;
      }
    }

    // Condition 4: Proximity guard (tunable)
    if (tunables.vbGuardEnabled) {
      const resolvedProximity = tunables.vbProximityMultiplier * medianH;
      const gapSA = getVerticalGap(stroke, boxA);
      const gapSB = getVerticalGap(stroke, boxB);

      if (gapSA > resolvedProximity || gapSB > resolvedProximity) {
        logs.push(
          ` - Stroke ${sId} satisfies width and span, but FAILS proximity guard. Gap to A = ${gapSA.toFixed(1)}px, Gap to B = ${gapSB.toFixed(1)}px. Max permitted = ${resolvedProximity.toFixed(1)}px (${tunables.vbProximityMultiplier} * medianH ${medianH.toFixed(1)}px).`
        );
        continue;
      }
    }

    // V_b Passes!
    vbPassed = true;
    bridgingStrokeId = stroke.id;
    logs.push(
      ` - SUCCESS: Stroke ${sId} is a valid bridging stroke S! Width = ${sWidth.toFixed(1)}px, Left margin = ${stroke.minX.toFixed(1)}px (span limit ${(minLeft + tunables.spanTolerance).toFixed(1)}px), Right margin = ${stroke.maxX.toFixed(1)}px (span limit ${(maxRight - tunables.spanTolerance).toFixed(1)}px).`
    );
    break;
  }

  if (vbPassed) {
    const reasonMsg = `V_b (Bridging stroke ${bridgingStrokeId?.slice(0, 5)}: width wider than both & spans both)`;
    logs.push(`[MERGE DECISION] MERGING due to: ${reasonMsg}`);
    return {
      merged: true,
      reason: reasonMsg,
      vaPassed,
      hPassed,
      vbPassed: true,
      bridgingStrokeId,
      logs,
    };
  }

  logs.push(`[MERGE DECISION] NO MERGE: Both (V_a ∧ H) and V_b failed.`);
  return {
    merged: false,
    reason: "No merge conditions satisfied",
    vaPassed,
    hPassed,
    vbPassed: false,
    logs,
  };
}

/**
 * Asserts that no box is rendered inside another.
 * Returns information if nesting is found.
 */
export function checkNesting(boxes: Box[]): {
  nested: boolean;
  boxA?: Box;
  boxB?: Box;
} {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue;
      const a = boxes[i];
      const b = boxes[j];
      
      // Check if box A is strictly inside box B (with small buffer to prevent float issues)
      const isAInsideB =
        a.minX >= b.minX - 0.5 &&
        a.maxX <= b.maxX + 0.5 &&
        a.minY >= b.minY - 0.5 &&
        a.maxY <= b.maxY + 0.5;
        
      if (isAInsideB) {
        return { nested: true, boxA: a, boxB: b };
      }
    }
  }
  return { nested: false };
}

/**
 * Rebuilds all equation boxes from scratch using the current set of strokes.
 * Runs fixpoint evaluation loop.
 */
export function rebuildAllBoxes(
  strokes: Stroke[],
  tunables: Tunables,
  onLogPredicateEvaluation?: (logs: string[]) => void
): Box[] {
  if (strokes.length === 0) return [];

  // Seed initial boxes: every stroke starts as its own box containing exactly that one stroke.
  let currentBoxes: Box[] = strokes.map((stroke) => ({
    id: `box_${stroke.id}`,
    strokeIds: [stroke.id],
    minX: stroke.minX,
    minY: stroke.minY,
    maxX: stroke.maxX,
    maxY: stroke.maxY,
    width: stroke.width,
    height: stroke.height,
    createdAt: stroke.createdAt,
  }));

  let mergedAny = true;
  let iterations = 0;
  const maxIterations = 100; // safety limit
  const usedBridgingStrokeIds = new Set<string>();

  while (mergedAny && iterations < maxIterations) {
    mergedAny = false;
    iterations++;

    // 1. Order independence: sort boxes deterministically (top-to-bottom, then left-to-right)
    currentBoxes.sort((a, b) => {
      if (Math.abs(a.minY - b.minY) > 0.01) {
        return a.minY - b.minY;
      }
      return a.minX - b.minX;
    });

    const medianH = getMedianHeight(currentBoxes);
    let pairToMerge: [number, number, EvaluationResult] | null = null;

    // Pairwise evaluation
    for (let i = 0; i < currentBoxes.length; i++) {
      for (let j = i + 1; j < currentBoxes.length; j++) {
        const evalResult = evaluateMerge(
          currentBoxes[i],
          currentBoxes[j],
          strokes,
          tunables,
          medianH,
          currentBoxes,
          usedBridgingStrokeIds
        );
        
        // Expose logs of evaluation
        if (onLogPredicateEvaluation && evalResult.logs.length > 0) {
          onLogPredicateEvaluation(evalResult.logs);
        }

        if (evalResult.merged) {
          pairToMerge = [i, j, evalResult];
          break;
        }
      }
      if (pairToMerge) break;
    }

    if (pairToMerge) {
      const [i, j, evalResult] = pairToMerge;
      
      let union: Box;
      if (evalResult.vbPassed && evalResult.bridgingStrokeId) {
        usedBridgingStrokeIds.add(evalResult.bridgingStrokeId);
        const sId = evalResult.bridgingStrokeId;
        const boxSIdx = currentBoxes.findIndex((b) => b.strokeIds.includes(sId));
        if (boxSIdx !== -1 && boxSIdx !== i && boxSIdx !== j) {
          const boxS = currentBoxes[boxSIdx];
          const tempUnion = getUnionBox(currentBoxes[i], currentBoxes[j]);
          union = getUnionBox(tempUnion, boxS);
          currentBoxes = currentBoxes.filter((_, idx) => idx !== i && idx !== j && idx !== boxSIdx);
        } else {
          union = getUnionBox(currentBoxes[i], currentBoxes[j]);
          currentBoxes = currentBoxes.filter((_, idx) => idx !== i && idx !== j);
        }
      } else {
        union = getUnionBox(currentBoxes[i], currentBoxes[j]);
        currentBoxes = currentBoxes.filter((_, idx) => idx !== i && idx !== j);
      }

      currentBoxes.push(union);
      mergedAny = true;
    }
  }

  return currentBoxes;
}

/**
 * Handles adding a new stroke incrementally.
 * Only re-evaluates boxes near the changed stroke. Untouched boxes keep stable IDs.
 */
export function handleNewStroke(
  newStroke: Stroke,
  currentBoxes: Box[],
  allStrokes: Stroke[],
  tunables: Tunables,
  onLogPredicateEvaluation?: (logs: string[]) => void
): Box[] {
  // Create a brand-new box for this stroke
  const bNew: Box = {
    id: `box_${newStroke.id}`,
    strokeIds: [newStroke.id],
    minX: newStroke.minX,
    minY: newStroke.minY,
    maxX: newStroke.maxX,
    maxY: newStroke.maxY,
    width: newStroke.width,
    height: newStroke.height,
    createdAt: newStroke.createdAt,
  };

  // Distance helper (edge-to-edge horizontal and vertical)
  function getDistance(box1: Box, box2: Box): number {
    const horizontalDist = getHorizontalGap(box1, box2);
    const verticalDist = getVerticalGap(box1, box2);
    return Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
  }

  // Calculate dynamic proximity limit
  const medianH = getMedianHeight(currentBoxes);
  const resolvedProx = tunables.vbProximityMultiplier * medianH;
  const maxD = Math.max(tunables.D, 150);
  const proximityThreshold = Math.max(maxD, resolvedProx * 2, 220);

  let activePool: Box[] = [bNew];
  let untouchedPool: Box[] = [];

  // Group existing boxes: if "near" bNew, add to activePool, else untouchedPool
  for (const box of currentBoxes) {
    if (getDistance(box, bNew) <= proximityThreshold) {
      activePool.push(box);
    } else {
      untouchedPool.push(box);
    }
  }

  // Run fixpoint evaluation loop only on activePool
  let mergedAny = true;
  let iterations = 0;
  const usedBridgingStrokeIds = new Set<string>();

  while (mergedAny && iterations < 100) {
    mergedAny = false;
    iterations++;

    activePool.sort((a, b) => {
      if (Math.abs(a.minY - b.minY) > 0.01) {
        return a.minY - b.minY;
      }
      return a.minX - b.minX;
    });

    const currentMedianH = getMedianHeight([...activePool, ...untouchedPool]);
    let pairToMerge: [number, number, EvaluationResult] | null = null;

    for (let i = 0; i < activePool.length; i++) {
      for (let j = i + 1; j < activePool.length; j++) {
        const evalResult = evaluateMerge(
          activePool[i],
          activePool[j],
          allStrokes,
          tunables,
          currentMedianH,
          [...activePool, ...untouchedPool],
          usedBridgingStrokeIds
        );

        if (onLogPredicateEvaluation && evalResult.logs.length > 0) {
          onLogPredicateEvaluation(evalResult.logs);
        }

        if (evalResult.merged) {
          pairToMerge = [i, j, evalResult];
          break;
        }
      }
      if (pairToMerge) break;
    }

    if (pairToMerge) {
      const [i, j, evalResult] = pairToMerge;
      let union: Box;
      if (evalResult.vbPassed && evalResult.bridgingStrokeId) {
        usedBridgingStrokeIds.add(evalResult.bridgingStrokeId);
        const sId = evalResult.bridgingStrokeId;
        const boxSIdx = activePool.findIndex((b) => b.strokeIds.includes(sId));
        if (boxSIdx !== -1 && boxSIdx !== i && boxSIdx !== j) {
          const boxS = activePool[boxSIdx];
          const tempUnion = getUnionBox(activePool[i], activePool[j]);
          union = getUnionBox(tempUnion, boxS);
          activePool = activePool.filter((_, idx) => idx !== i && idx !== j && idx !== boxSIdx);
        } else {
          // If boxS is in untouchedPool, we need to pull it to activePool and merge
          const untouchedSIdx = untouchedPool.findIndex((b) => b.strokeIds.includes(sId));
          if (untouchedSIdx !== -1) {
            const boxS = untouchedPool[untouchedSIdx];
            const tempUnion = getUnionBox(activePool[i], activePool[j]);
            union = getUnionBox(tempUnion, boxS);
            activePool = activePool.filter((_, idx) => idx !== i && idx !== j);
            untouchedPool = untouchedPool.filter((_, idx) => idx !== untouchedSIdx);
          } else {
            union = getUnionBox(activePool[i], activePool[j]);
            activePool = activePool.filter((_, idx) => idx !== i && idx !== j);
          }
        }
      } else {
        union = getUnionBox(activePool[i], activePool[j]);
        activePool = activePool.filter((_, idx) => idx !== i && idx !== j);
      }
      activePool.push(union);
      mergedAny = true;
    }
  }

  // Combine active and untouched boxes
  return [...activePool, ...untouchedPool];
}
