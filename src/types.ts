export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  createdAt: number;
}

export interface Box {
  id: string;
  strokeIds: string[]; // member stroke IDs
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  createdAt: number;
}

export interface Tunables {
  D: number;                        // H-condition horizontal distance (px) [0-300], default 40
  dipRatio: number;                 // V_a minimum vertical overlap ratio [0-1], default 0.33
  spanTolerance: number;            // px slack on V_b "spans both" [0-50], default 8
  vbProximityMultiplier: number;    // V_b guard: max vertical gap multiplier [0-5], default 1.5
  vbGuardEnabled: boolean;          // Toggle V_b proximity guard
  showLabels: boolean;              // Toggle display of box labels on the canvas
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "assertion";
  message: string;
  details?: string[];
}
