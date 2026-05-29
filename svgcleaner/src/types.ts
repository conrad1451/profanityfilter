// svgcleaner/src/types.ts

export interface TransformLog {
  status: "ok" | "skip" | "error";
  message: string;
}

export interface TransformResult {
  svg: string;
  log: TransformLog[];
}
