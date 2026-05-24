"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  JOB_SOURCES,
  type JobSource,
  type JobsApiResponse,
  type NormalizedJob
} from "@/lib/jobs/schema";
import { cn } from "@/lib/utils";

type ApiState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: JobsApiResponse | null; error: null }
  | { status: "success"; data: JobsApiResponse; error: null }
  | { status: "error"; data: JobsApiResponse | null; error: string };

const sourceStyles: Record<JobSource, string> = {
  LinkedIn: "border-sky-200 bg-sky-50 text-sky-800",
  Indeed: "border-indigo-200 bg-indigo-50 text-indigo-800",
  ZipRecruiter: "border-amber-200 bg-amber-50 text-amber-800",
  Dice: "border-red-200 bg-red-50 text-red-800",
  "Built In": "border-emerald-200 bg-emerald-50 text-emerald-800",
  USAJOBS: "border-blue-200 bg-blue-50 text-blue-800"
};

function formatPostedDate(value: string) {
  const posted = new Date(value);
  const hours = Math.max(1, Math.round((Date.now() - posted.getTime()) / 36e5));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function JobCard({ job }: { job: NormalizedJob }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", sourceStyles[job.source])}>
                {job.source}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {job.workMode}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {job.employmentType}
              </Badge>
            </div>
            <CardTitle className="text-xl leading-tight">{job.title}</CardTitle>
            <CardDescription className="flex flex-wrap gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {job.company}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {formatPostedDate(job.postedAt)}
              </span>
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={job.sourceUrl}>
              Open
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-700">{job.summary}</p>
        <div className="flex flex-wrap gap-2">
          {job.salary ? <Badge variant="success">{job.salary}</Badge> : null}
          {job.skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [query, setQuery] = useState("ServiceNow");
  const [location, setLocation] = useState("Remote");
  const [sources, setSources] = useState<JobSource[]>(JOB_SOURCES);
  const [apiState, setApiState] = useState<ApiState>({
    status: "idle",
    data: null,
    error: null
  });

  const jobs = apiState.data?.jobs ?? [];
  const hasActiveSource = sources.length > 0;

  const sourceLabel = useMemo(() => {
    if (sources.length === JOB_SOURCES.length) {
      return "All sources";
    }

    return sources.length > 0 ? sources.join(", ") : "No sources";
  }, [sources]);

  async function fetchJobs() {
    if (!hasActiveSource) {
      setApiState({
        status: "error",
        data: apiState.data,
        error: "Choose at least one job source."
      });
      return;
    }

    setApiState((current) => ({ status: "loading", data: current.data, error: null }));

    const params = new URLSearchParams({
      query: query.trim() || "ServiceNow",
      location: location.trim() || "Remote",
      sources: sources.join(",")
    });

    try {
      const response = await fetch(`/api/jobs?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to fetch jobs.");
      }

      setApiState({ status: "success", data: payload, error: null });
    } catch (error) {
      setApiState((current) => ({
        status: "error",
        data: current.data,
        error: error instanceof Error ? error.message : "Unable to fetch jobs."
      }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void fetchJobs();
  }

  function toggleSource(source: JobSource) {
    setSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    );
  }

  useEffect(() => {
    void fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen">
      <section className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <Badge variant="secondary" className="w-fit gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Startup scan, cached live results
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                  ServiceNow Job Finder
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Search normalized ServiceNow listings across LinkedIn, Indeed,
                  ZipRecruiter, Dice, Built In, and USAJOBS from one clean pipeline.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-3 text-center">
              <div>
                <div className="text-2xl font-semibold">{jobs.length}</div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{sources.length}</div>
                <div className="text-xs text-muted-foreground">Sources</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {jobs.filter((job) => job.workMode === "remote").length}
                </div>
                <div className="text-xs text-muted-foreground">Remote</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium">Keywords</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="ServiceNow developer"
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Location</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="pl-9"
                  placeholder="Remote"
                />
              </div>
            </label>
            <Button type="submit" className="mt-auto" disabled={apiState.status === "loading"}>
              {apiState.status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BriefcaseBusiness className="h-4 w-4" />
              )}
              Find jobs
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4" />
                Sources
              </CardTitle>
              <CardDescription>{sourceLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {JOB_SOURCES.map((source) => {
                const checked = sources.includes(source);
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => toggleSource(source)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                      checked ? "border-primary bg-primary/5" : "bg-background"
                    )}
                  >
                    <span>{source}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schema</CardTitle>
              <CardDescription>Every provider maps to the same shape.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {["title", "company", "location", "source", "salary", "skills", "workMode"].map((field) => (
                <Badge key={field} variant="outline">
                  {field}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {apiState.status === "error" ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Search failed</div>
                <div>{apiState.error}</div>
              </div>
            </div>
          ) : null}

          {apiState.data?.meta.providerErrors &&
          Object.keys(apiState.data.meta.providerErrors).length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">Provider notes</div>
              <div className="mt-2 space-y-1">
                {Object.entries(apiState.data.meta.providerErrors).map(([source, message]) => (
                  <div key={source}>
                    <span className="font-medium">{source}:</span> {message}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {apiState.status === "loading" && jobs.length === 0 ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 w-28 rounded bg-slate-200" />
                    <div className="h-6 w-2/3 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-16 rounded bg-slate-200" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {apiState.status !== "loading" && jobs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No jobs found</CardTitle>
                <CardDescription>
                  Try a broader keyword, another location, or enable more sources.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {jobs.length > 0 ? (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
