export type JobSource =
  | "LinkedIn"
  | "Indeed"
  | "ZipRecruiter"
  | "Dice"
  | "Built In"
  | "USAJOBS";

export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: JobSource;
  sourceUrl: string;
  postedAt: string;
  salary?: string;
  workMode: WorkMode;
  employmentType: "full-time" | "contract" | "part-time" | "unknown";
  summary: string;
  skills: string[];
};

export type JobSearchQuery = {
  query: string;
  location: string;
  sources: JobSource[];
};

export type JobsApiResponse = {
  jobs: NormalizedJob[];
  meta: {
    query: string;
    location: string;
    sources: JobSource[];
    total: number;
    generatedAt: string;
    failedSources?: JobSource[];
    providerErrors?: Partial<Record<JobSource, string>>;
    cacheAgeSeconds?: number;
  };
};

export const JOB_SOURCES: JobSource[] = [
  "LinkedIn",
  "Indeed",
  "ZipRecruiter",
  "Dice",
  "Built In",
  "USAJOBS"
];

export function isJobSource(value: string): value is JobSource {
  return JOB_SOURCES.includes(value as JobSource);
}
