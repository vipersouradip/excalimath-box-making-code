import React from "react";
import { Tunables, Stroke } from "../types";
import { PRESET_TESTS, PresetTest } from "../utils/presets";
import { Sliders, FlaskConical, Play } from "lucide-react";

interface TunablePanelProps {
  tunables: Tunables;
  medianH: number;
  onTunablesChange: (updated: Tunables) => void;
  onLoadPreset: (preset: PresetTest) => void;
  activePresetId: string | null;
}

export const TunablePanel: React.FC<TunablePanelProps> = ({
  tunables,
  medianH,
  onTunablesChange,
  onLoadPreset,
  activePresetId,
}) => {
  const handleSliderChange = (key: keyof Tunables, value: number | boolean) => {
    onTunablesChange({
      ...tunables,
      [key]: value,
    });
  };

  const resolvedProximityPx = tunables.vbProximityMultiplier * medianH;

  return (
    <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
      
      {/* Parameters Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-sm text-slate-800">Merge Tunables</h3>
        </div>

        {/* Param 1: D */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700">Distance D (px)</span>
            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px]">
              {tunables.D}px
            </span>
          </div>
          <input
            id="slider-d"
            type="range"
            min="0"
            max="300"
            step="1"
            value={tunables.D}
            onChange={(e) => handleSliderChange("D", parseInt(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
          />
          <span className="text-[10px] text-slate-400">
            H-condition horizontal threshold. If gap &ge; D, split equations.
          </span>
        </div>

        {/* Param 2: dipRatio */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700">Vertical Overlap (dipRatio)</span>
            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px]">
              {tunables.dipRatio.toFixed(2)}
            </span>
          </div>
          <input
            id="slider-dip-ratio"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={tunables.dipRatio}
            onChange={(e) => handleSliderChange("dipRatio", parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
          />
          <span className="text-[10px] text-slate-400">
            V_a minimum overlap ratio. Overlaps below this ratio prevent line fusing.
          </span>
        </div>

        {/* Param 3: spanTolerance */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700">V_b Span Tolerance</span>
            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px]">
              {tunables.spanTolerance}px
            </span>
          </div>
          <input
            id="slider-span-tolerance"
            type="range"
            min="0"
            max="50"
            step="1"
            value={tunables.spanTolerance}
            onChange={(e) => handleSliderChange("spanTolerance", parseInt(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
          />
          <span className="text-[10px] text-slate-400">
            Slack px allowed on V_b &quot;spans both&quot; check.
          </span>
        </div>

        {/* Param 4: vbProximityMultiplier & Guard */}
        <div className="flex flex-col gap-2 mt-1 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">V_b Proximity Guard</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="toggle-guard"
                type="checkbox"
                checked={tunables.vbGuardEnabled}
                onChange={(e) => handleSliderChange("vbGuardEnabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {tunables.vbGuardEnabled ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700">Proximity Max Gap</span>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-slate-600 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                    {tunables.vbProximityMultiplier.toFixed(2)} &times; medianH
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                    resolved: {resolvedProximityPx.toFixed(1)}px
                  </span>
                </div>
              </div>
              <input
                id="slider-proximity"
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={tunables.vbProximityMultiplier}
                onChange={(e) => handleSliderChange("vbProximityMultiplier", parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">
                Stops underlines / unrelated symbols from fusing.
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-700">
              Proximity guard disabled. Page-wide rules, underlines, and arrow shafts will merge freely.
            </div>
          )}
        </div>
      </div>

      {/* Preset Test Suite Picker */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col gap-3 flex-1 overflow-y-auto max-h-[480px]">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FlaskConical className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">Scenario Test Presets</h3>
        </div>

        <div className="flex flex-col gap-2">
          {PRESET_TESTS.map((test) => {
            const isActive = activePresetId === test.id;
            return (
              <button
                key={test.id}
                id={`preset-btn-${test.id}`}
                onClick={() => onLoadPreset(test)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-1.5 cursor-pointer ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900"
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full font-semibold">
                  <span>{test.name}</span>
                  <div className={`p-1 rounded-full ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-relaxed">
                  {test.description}
                </p>
                <div className="text-[9px] font-mono border-t border-slate-100 pt-1.5 mt-0.5 text-slate-400">
                  <span className="font-semibold text-slate-500">Expected:</span> {test.expectedResult}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
