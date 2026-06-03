// svgcleaner/src/types.ts

export type LogStatus = "ok" | "skip" | "error";

export interface TransformLog {
  status: LogStatus;
  message: string;
}

export interface TransformResult {
  svg: string;
  log: TransformLog[];
}

export interface FileResult {
  uploadedName: string;
  svgId: string | null;
  svg: string;
  log: TransformLog[];
}

export interface TransformLogOld {
  status: "ok" | "skip" | "error";
  message: string;
}

export interface TransformResultOld {
  svg: string;
  log: TransformLogOld[];
}
