import { useState, useEffect } from "react";
import { Point, Stroke, Box, Tunables, LogEntry } from "./types";
import { MathCanvas } from "./components/MathCanvas";
import { TunablePanel } from "./components/TunablePanel";
import { LogPanel } from "./components/LogPanel";
import { rebuildAllBoxes, handleNewStroke, getMedianHeight } from "./utils/mergeEngine";
import { PresetTest } from "./utils/presets";
import { Compass, HelpCircle, Sparkles, BookOpen } from "lucide-react";

export default function App() {
  // App-level state for stroke collection and resulting merged boxes
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  
  // Initial parameters as mandated by the spec
  const [tunables, setTunables] = useState<Tunables>({
    D: 40,
    dipRatio: 0.33,
    spanTolerance: 8,
    vbProximityMultiplier: 1.5,
    vbGuardEnabled: true,
    showLabels: false,
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Calculate median height across current equation boxes
  const medianH = getMedianHeight(boxes);

  // Helper to log actions into the stream
  const addLog = (
    type: "info" | "success" | "warning" | "assertion",
    message: string,
    details?: string[]
  ) => {
    const newLog: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type,
      message,
      details,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // Initial welcome greeting
  useEffect(() => {
    addLog(
      "info",
      "ExcaliMath Sandbox initialized successfully.",
      [
        "Welcome to the official equation-box merge conditions validator!",
        "Use the drawing board to write custom mathematical strokes by hand, or pick one of the 10 mandated scenarios on the right to load pre-drawn testing strokes.",
        "The dark console below logs step-by-step predicate evaluations (proving ordering and Rule 0 constraint checks)."
      ]
    );
  }, []);

  // Stroke insertion callback
  const handleStrokeAdded = (newStroke: Stroke) => {
    setActivePresetId(null); // Reset preset selection when drawing manually
    
    setStrokes((prevStrokes) => {
      const nextStrokes = [...prevStrokes, newStroke];
      const evaluationDetails: string[] = [];
      
      // Calculate next boxes incrementally (touching only near boxes to maintain ID stability)
      const nextBoxes = handleNewStroke(
        newStroke,
        boxes,
        nextStrokes,
        tunables,
        (pairLogs) => {
          evaluationDetails.push(...pairLogs);
        }
      );

      // Check if merge happened
      const createdCount = boxes.length;
      const finishedCount = nextBoxes.length;

      if (finishedCount < createdCount + 1) {
        addLog(
          "success",
          `Stroke added and merged! (Boxes count: ${createdCount} &rarr; ${finishedCount})`,
          [
            `New stroke ID: ${newStroke.id.slice(0, 8)}`,
            `Points captured: ${newStroke.points.length}`,
            `----------------------------------------`,
            ...evaluationDetails,
          ]
        );
      } else {
        addLog(
          "info",
          `Stroke added: Created isolated box (no merge conditions met).`,
          [
            `New stroke ID: ${newStroke.id.slice(0, 8)}`,
            `Points captured: ${newStroke.points.length}`,
            `----------------------------------------`,
            ...evaluationDetails,
          ]
        );
      }

      setBoxes(nextBoxes);
      return nextStrokes;
    });
  };

  // Dragging slider updates parameters and triggers immediate live reflow of existing strokes
  const handleTunablesChange = (updated: Tunables) => {
    setTunables(updated);
    
    const evaluationDetails: string[] = [];
    const nextBoxes = rebuildAllBoxes(strokes, updated, (pairLogs) => {
      evaluationDetails.push(...pairLogs);
    });
    
    setBoxes(nextBoxes);
    addLog(
      "warning",
      `Parameter modified: Live reflow recalculation executed.`,
      [
        `New Config: D = ${updated.D}px, dipRatio = ${updated.dipRatio.toFixed(2)}, spanTolerance = ${updated.spanTolerance}px`,
        `vbProximityMultiplier = ${updated.vbProximityMultiplier.toFixed(2)}, Guard: ${updated.vbGuardEnabled ? "ON" : "OFF"}`,
        `----------------------------------------`,
        ...evaluationDetails,
      ]
    );
  };

  // Loads pre-drawn coordinates of a test case scenario
  const handleLoadPreset = (preset: PresetTest) => {
    setActivePresetId(preset.id);
    setLogs([]); // Reset log stream for clean test results
    
    const nextStrokes = preset.setup(tunables.D);
    setStrokes(nextStrokes);
    
    const evaluationDetails: string[] = [];
    const nextBoxes = rebuildAllBoxes(nextStrokes, tunables, (pairLogs) => {
      evaluationDetails.push(...pairLogs);
    });

    setBoxes(nextBoxes);

    // Small timeout to ensure stream logs render clearly
    setTimeout(() => {
      addLog(
        "success",
        `Loaded Scenario: ${preset.name}`,
        [
          `Description: ${preset.description}`,
          `Expected Result: ${preset.expectedResult}`,
          `----------------------------------------`,
          `Number of Strokes Generated: ${nextStrokes.length}`,
          `Merged Bounding Boxes Output: ${nextBoxes.length}`,
          `----------------------------------------`,
          `Execution details:`,
          ...evaluationDetails,
        ]
      );
    }, 50);
  };

  const handleClear = () => {
    setStrokes([]);
    setBoxes([]);
    setActivePresetId(null);
    addLog("info", "Workspace drawing board cleared.");
  };

  const handleUndo = () => {
    setActivePresetId(null);
    setStrokes((prevStrokes) => {
      if (prevStrokes.length === 0) return prevStrokes;
      const nextStrokes = prevStrokes.slice(0, -1);
      
      const evaluationDetails: string[] = [];
      const nextBoxes = rebuildAllBoxes(nextStrokes, tunables, (pairLogs) => {
        evaluationDetails.push(...pairLogs);
      });
      
      setBoxes(nextBoxes);
      addLog(
        "warning",
        "Undone last drawn stroke vector.",
        [
          `Remaining stroke vectors: ${nextStrokes.length}`,
          `Recalculated Bounding Boxes: ${nextBoxes.length}`,
          `----------------------------------------`,
          ...evaluationDetails,
        ]
      );
      
      return nextStrokes;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
      
      {/* Premium Elegant Header */}
      <header className="border-b border-slate-200/80 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                ExcaliMath
                <span className="text-[10px] bg-indigo-50 font-mono text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-semibold uppercase tracking-wider">
                  final specification
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Sandbox to validate, tune, and stress-test equation-box merge conditions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0 border-t md:border-t-0 md:pt-0 pt-3 border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg font-medium text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Fixpoint Merging</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg font-medium text-slate-600">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ordering (V_a &rarr; H)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6 w-full">
        
        {/* Left Side: Parameters & Preset Scenario List */}
        <TunablePanel
          tunables={tunables}
          medianH={medianH}
          onTunablesChange={handleTunablesChange}
          onLoadPreset={handleLoadPreset}
          activePresetId={activePresetId}
        />

        {/* Right Side: Interactive Drawing Board & Instrumented Logs Console */}
        <div className="flex-1 flex flex-col gap-6">
          <MathCanvas
            strokes={strokes}
            boxes={boxes}
            tunables={tunables}
            onStrokeAdded={handleStrokeAdded}
            onClear={handleClear}
            onUndo={handleUndo}
          />
          
          <LogPanel
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        </div>

      </main>

      {/* Instructional Sticky Footer Drawer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500 leading-relaxed">
          <div className="flex items-start gap-2 max-w-2xl">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Evaluation Engine:</strong> Formula boxes are merged by evaluating 
              <code className="bg-slate-100 px-1 rounded text-indigo-600 font-mono mx-1">V_a ∧ H</code> 
              first (where <code className="bg-slate-100 px-1 rounded text-indigo-600 font-mono">H</code> is evaluated ONLY after 
              <code className="bg-slate-100 px-1 rounded text-indigo-600 font-mono">V_a</code> passes), 
              or independently via <code className="bg-slate-100 px-1 rounded text-indigo-600 font-mono">V_b</code> (the wide fraction bar span condition with custom proximity guard).
            </p>
          </div>
          <span className="font-mono text-[10px] text-slate-400 select-none">
            ExcaliMath merge sandbox v1.0.0
          </span>
        </div>
      </footer>

    </div>
  );
}
