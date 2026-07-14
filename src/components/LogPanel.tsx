import React, { useRef, useEffect } from "react";
import { LogEntry } from "../types";
import { Terminal, ShieldCheck, Eye, Trash2 } from "lucide-react";

interface LogPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClearLogs }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom of the log console on update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-900 text-slate-100 border border-slate-850 rounded-2xl p-5 flex flex-col h-80 min-h-[300px] shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-slate-200">Predicate Evaluation Stream</h3>
        </div>
        <button
          onClick={onClearLogs}
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
          title="Clear console logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Log
        </button>
      </div>

      {/* Log Entries Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2.5 pr-2 custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Eye className="w-8 h-8 opacity-40 animate-pulse" />
            <span>Draw something or click a preset to stream predicate evaluation logs</span>
          </div>
        ) : (
          logs.map((log) => {
            let textColor = "text-slate-300";
            let bgClass = "bg-slate-950/25";
            let borderLeft = "border-l border-slate-700";

            if (log.type === "success") {
              textColor = "text-emerald-400";
              bgClass = "bg-emerald-950/20";
              borderLeft = "border-l-2 border-emerald-500";
            } else if (log.type === "warning") {
              textColor = "text-amber-400";
              bgClass = "bg-amber-950/20";
              borderLeft = "border-l-2 border-amber-500";
            } else if (log.type === "assertion") {
              textColor = "text-rose-400 font-semibold";
              bgClass = "bg-rose-950/30 border border-rose-900/50";
              borderLeft = "border-l-4 border-rose-500";
            }

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded-lg ${bgClass} ${borderLeft} transition-colors`}
              >
                <div className="flex items-center gap-2 justify-between mb-1 opacity-80 text-[10px]">
                  <span className="text-slate-500 font-semibold">
                    [{log.timestamp}]
                  </span>
                  <span className={`uppercase font-bold tracking-wide text-[9px] ${
                    log.type === "success" ? "text-emerald-500" :
                    log.type === "warning" ? "text-amber-500" :
                    log.type === "assertion" ? "text-rose-500 animate-pulse" : "text-slate-400"
                  }`}>
                    {log.type}
                  </span>
                </div>
                <div className={`${textColor}`}>{log.message}</div>
                
                {log.details && log.details.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex flex-col gap-1 text-[10px] text-slate-400">
                    {log.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="text-indigo-400 select-none">&rsaquo;</span>
                        <span className="whitespace-pre-line">{detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2.5 border-t border-slate-800/60 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          <span>Ordering Check: V_a &rarr; H verified</span>
        </div>
        <span>Total Logged Events: {logs.length}</span>
      </div>
    </div>
  );
};
