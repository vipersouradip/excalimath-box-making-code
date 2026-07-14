import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Point, Stroke, Box, Tunables } from "../types";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { checkNesting } from "../utils/mergeEngine";

interface MathCanvasProps {
  strokes: Stroke[];
  boxes: Box[];
  tunables: Tunables;
  onStrokeAdded: (newStroke: Stroke) => void;
  onClear: () => void;
  onUndo: () => void;
}

export const MathCanvas: React.FC<MathCanvasProps> = ({
  strokes,
  boxes,
  tunables,
  onStrokeAdded,
  onClear,
  onUndo,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [nestingError, setNestingError] = useState<{
    nested: boolean;
    boxA?: Box;
    boxB?: Box;
  }>({ nested: false });

  // Trigger nesting assertion check every time boxes change
  useEffect(() => {
    const nestingResult = checkNesting(boxes);
    setNestingError(nestingResult);
    
    if (nestingResult.nested && nestingResult.boxA && nestingResult.boxB) {
      console.error(
        `[ASSERTION FAILED] Nesting Invariant Violated! Box ${nestingResult.boxA.id} lies completely inside Box ${nestingResult.boxB.id}.`
      );
    }
  }, [boxes]);

  const getCoordinatesFromEvent = (e: React.PointerEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const coords = getCoordinatesFromEvent(e);
    setCurrentPoints([coords]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinatesFromEvent(e);
    setCurrentPoints((prev) => [...prev, coords]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    svgRef.current?.releasePointerCapture(e.pointerId);
    setIsDrawing(false);

    if (currentPoints.length > 1) {
      const xs = currentPoints.map((p) => p.x);
      const ys = currentPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const newStroke: Stroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        points: currentPoints,
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        createdAt: Date.now(),
      };

      onStrokeAdded(newStroke);
    }
    setCurrentPoints([]);
  };

  // Convert point arrays into smooth SVG paths
  const getSvgPathFromPoints = (pts: Point[]): string => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x} ${pts[i].y}`;
    }
    return path;
  };

  return (
    <div id="canvas-container" className="relative flex-1 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[480px]">
      
      {/* Dynamic Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #64748b 1px, transparent 1px),
            linear-gradient(to bottom, #64748b 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px"
        }}
      />

      {/* Header and Manual Operations Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-100 bg-white/85 backdrop-blur-sm px-6 py-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-slate-800">Sandbox Drawing Area</h2>
          <p className="text-[11px] text-slate-400">Draw with your mouse or stylus. Watch boxes merge in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="undo-btn"
            onClick={onUndo}
            disabled={strokes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Undo last stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            id="clear-btn"
            onClick={onClear}
            disabled={strokes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Clear workspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Loud Nesting Error Banner */}
      {nestingError.nested && (
        <div id="nesting-alert" className="relative z-20 bg-rose-500 text-white font-medium text-xs px-6 py-2.5 flex items-center gap-2 animate-pulse shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>LOUD ASSERTION FAIL:</strong> Contained box 
            <span className="font-mono bg-rose-700 px-1 rounded mx-1">{nestingError.boxA?.id.replace("box_", "").slice(0, 5)}</span> 
            survived. It lies completely inside parent box 
            <span className="font-mono bg-rose-700 px-1 rounded mx-1">{nestingError.boxB?.id.replace("box_", "").slice(0, 5)}</span>!
          </span>
        </div>
      )}

      {/* SVG Canvas Board */}
      <div className="relative flex-1 overflow-hidden select-none">
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Render Completed Strokes */}
          {strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={getSvgPathFromPoints(stroke.points)}
              fill="none"
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-opacity duration-150"
            />
          ))}

          {/* Render Active Ink Stroke */}
          {isDrawing && currentPoints.length > 0 && (
            <path
              d={getSvgPathFromPoints(currentPoints)}
              fill="none"
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            />
          )}
        </svg>

        {/* Absolute Floating Equation-Level Bounding Boxes (Tween Animated) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <AnimatePresence mode="popLayout">
            {boxes.map((box) => {
              const boxColor = "border-emerald-500 bg-emerald-500/10 text-emerald-700";
              const labelId = box.id.replace("box_", "").slice(0, 5);

              return (
                <motion.div
                  key={box.id}
                  layoutId={box.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    left: box.minX - 8,
                    top: box.minY - 8,
                    width: box.width + 16,
                    height: box.height + 16,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "tween", duration: 0.15, ease: "easeInOut" }}
                  style={{ position: "absolute" }}
                  className={`border-2 border-dashed ${boxColor} rounded-xl`}
                >
                  {/* Floating Box Label Tag */}
                  <div className="absolute -top-6 left-1 bg-emerald-600 text-white font-mono text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Eq-Box: {labelId}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Stats footer bar */}
      <div className="bg-slate-100 border-t border-slate-200/60 px-6 py-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div>Strokes count: {strokes.length}</div>
        <div>Active Bounding Boxes: {boxes.length}</div>
      </div>
    </div>
  );
};
