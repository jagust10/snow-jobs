import { mockScrapers } from "./mock-scrapers";
import type { JobSearchQuery, JobSource, NormalizedJob, WorkMode } from "./schema";

type ProviderResult = {
  jobs: NormalizedJob[];
  error?: string;
};

type JobProvider = (search: JobSearchQuery) => Promise<ProviderResult>;

const CACHE_TTL_MS = 1000 * 60 * 15;
const STARTUP_SEARCH: JobSearchQuery = {
  query: "ServiceNow",
  location: "Remote",
  sources: ["LinkedIn", "Indeed", "ZipRecruiter", "Dice", "Built In", "USAJOBS"]
};

let cachedScan:
  | {
      searchKey: string;
      jobs: NormalizedJob[];
      providerErrors: Partial<Record<JobSource, string>>;
      scannedAt: number;
    }
  | null = null;

let startupScanPromise: Promise<void> | null = null;

function searchKey(search: JobSearchQuery) {
  return JSON.stringify({
    query: search.query.toLowerCase(),
    location: search.location.toLowerCase(),
    sources: [...search.sources].sort()
  });
}

function toSourceId(source: JobSource, value: string) {
  return `${source.toLowerCase().replace(/\s+/g, "-")}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function inferWorkMode(value: string): WorkMode {
  const text = value.toLowerCase();

  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in-office")) {
    return "onsite";
  }

  return "unknown";
}

function sourceUrl(source: JobSource, query: string, location: string) {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location);

  switch (source) {
    case "Dice":
      return `https://www.dice.com/jobs?q=${q}&location=${l}`;
    case "Built In":
      return `https://builtin.com/jobs?search=${q}&location=${l}`;
    case "USAJOBS":
      return `https://www.usajobs.gov/Search/Results?k=${q}&l=${l}`;
    case "LinkedIn":
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
    case "Indeed":
      return `https://www.indeed.com/jobs?q=${q}&l=${l}`;
    case "ZipRecruiter":
      return `https://www.ziprecruiter.com/jobs-search?search=${q}&location=${l}`;
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "Mozilla/5.0 (compatible; ServiceNowJobFinder/0.1; +http://localhost:3000)"
    },
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function parseJsonLdJobs(html: string, source: JobSource, fallbackUrl: string): NormalizedJob[] {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jobs: NormalizedJob[] = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const jobItems = items.flatMap((item) => {
        if (item?.["@type"] === "JobPosting") return [item];
        if (Array.isArray(item?.["@graph"])) {
          return item["@graph"].filter((entry: { "@type"?: string }) => entry["@type"] === "JobPosting");
        }
        return [];
      });

      for (const item of jobItems) {
        const company =
          typeof item.hiringOrganization === "string"
            ? item.hiringOrganization
            : item.hiringOrganization?.name;
        const location =
          item.jobLocation?.address?.addressLocality ||
          item.jobLocation?.address?.addressRegion ||
          item.applicantLocationRequirements?.name ||
          "Remote";
        const title = stripHtml(item.title || "");

        if (!title) continue;

        jobs.push({
          id: toSourceId(source, `${title}-${company || source}-${location}`),
          title,
          company: stripHtml(company || "Unknown company"),
          location: stripHtml(location),
          source,
          sourceUrl: item.url || fallbackUrl,
          postedAt: item.datePosted || new Date().toISOString(),
          salary: item.baseSalary?.value?.value
            ? String(item.baseSalary.value.value)
            : undefined,
          workMode: inferWorkMode(`${title} ${location} ${item.description || ""}`),
          employmentType: String(item.employmentType || "unknown").toLowerCase().includes("contract")
            ? "contract"
            : "full-time",
          summary: stripHtml(item.description || `${title} at ${company || source}`).slice(0, 240),
          skills: ["ServiceNow"]
        });
      }
    } catch {
      continue;
    }
  }

  return jobs;
}

async function fetchDiceJobs(search: JobSearchQuery): Promise<ProviderResult> {
  try {
    const url = sourceUrl("Dice", search.query, search.location);
    const html = await fetchText(url);
    const jobs = parseJsonLdJobs(html, "Dice", url).slice(0, 10);

    if (jobs.length > 0) return { jobs };

    return {
      jobs: [],
      error: "Dice returned a live page, but no parseable job records were found."
    };
  } catch (error) {
    return {
      jobs: [],
      error: `Dice live fetch failed: ${error instanceof Error ? error.message : "unknown error"}`
    };
  }
}

async function fetchBuiltInJobs(search: JobSearchQuery): Promise<ProviderResult> {
  try {
    const url = sourceUrl("Built In", search.query, search.location);
    const html = await fetchText(url);
    const jobs = parseJsonLdJobs(html, "Built In", url).slice(0, 10);

    if (jobs.length > 0) return { jobs };

    return {
      jobs: [],
      error: "Built In returned a live page, but no parseable job records were found."
    };
  } catch (error) {
    return {
      jobs: [],
      error: `Built In live fetch failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    };
  }
}

async function fetchUsaJobs(search: JobSearchQuery): Promise<ProviderResult> {
  const apiKey = process.env.USAJOBS_API_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;

  if (!apiKey || !userAgent) {
    return {
      jobs: [],
      error:
        "USAJOBS requires USAJOBS_API_KEY and USAJOBS_USER_AGENT env vars before live results can load."
    };
  }

  try {
    const params = new URLSearchParams({
      Keyword: search.query,
      LocationName: search.location,
      ResultsPerPage: "10"
    });

    const response = await fetch(`https://data.usajobs.gov/api/Search?${params.toString()}`, {
      headers: {
        host: "data.usajobs.gov",
        "user-agent": userAgent,
        "authorization-key": apiKey
      },
      next: { revalidate: 900 }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const items = payload?.SearchResult?.SearchResultItems ?? [];

    return {
      jobs: items.map((item: any) => {
        const descriptor = item.MatchedObjectDescriptor;
        const location = descriptor?.PositionLocation?.[0]?.LocationName || search.location;
        const title = descriptor?.PositionTitle || "USAJOBS role";
        const company = descriptor?.OrganizationName || descriptor?.DepartmentName || "Federal agency";

        return {
          id: toSourceId("USAJOBS", descriptor?.PositionID || `${title}-${company}`),
          title,
          company,
          location,
          source: "USAJOBS",
          sourceUrl: descriptor?.PositionURI || sourceUrl("USAJOBS", search.query, search.location),
          postedAt: descriptor?.PublicationStartDate || new Date().toISOString(),
          salary: descriptor?.PositionRemuneration?.[0]
            ? `${descriptor.PositionRemuneration[0].MinimumRange} - ${descriptor.PositionRemuneration[0].MaximumRange}`
            : undefined,
          workMode: inferWorkMode(`${title} ${location} ${descriptor?.UserArea?.Details?.TeleworkEligible}`),
          employmentType: "full-time",
          summary: stripHtml(descriptor?.QualificationSummary || descriptor?.PositionTitle || "").slice(0, 240),
          skills: ["ServiceNow", "Federal"]
        } satisfies NormalizedJob;
      })
    };
  } catch (error) {
    return {
      jobs: [],
      error: `USAJOBS live fetch failed: ${error instanceof Error ? error.message : "unknown error"}`
    };
  }
}

function mockProvider(source: "LinkedIn" | "Indeed" | "ZipRecruiter"): JobProvider {
  return async (search) => ({
    jobs: await mockScrapers[source](search),
    error: `${source} is using local mock data until an approved API/feed is configured.`
  });
}

const providers: Record<JobSource, JobProvider> = {
  LinkedIn: mockProvider("LinkedIn"),
  Indeed: mockProvider("Indeed"),
  ZipRecruiter: mockProvider("ZipRecruiter"),
  Dice: fetchDiceJobs,
  "Built In": fetchBuiltInJobs,
  USAJOBS: fetchUsaJobs
};

export async function scanJobs(search: JobSearchQuery) {
  const results = await Promise.all(
    search.sources.map(async (source) => {
      const result = await providers[source](search);
      return { source, ...result };
    })
  );

  const providerErrors = results.reduce<Partial<Record<JobSource, string>>>((acc, result) => {
    if (result.error) {
      acc[result.source] = result.error;
    }
    return acc;
  }, {});

  const jobs = results
    .flatMap((result) => result.jobs)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  return { jobs, providerErrors };
}

export async function getCachedJobs(search: JobSearchQuery) {
  const key = searchKey(search);
  const now = Date.now();

  if (cachedScan && cachedScan.searchKey === key && now - cachedScan.scannedAt < CACHE_TTL_MS) {
    return {
      jobs: cachedScan.jobs,
      providerErrors: cachedScan.providerErrors,
      cacheAgeSeconds: Math.round((now - cachedScan.scannedAt) / 1000)
    };
  }

  const result = await scanJobs(search);
  cachedScan = {
    searchKey: key,
    jobs: result.jobs,
    providerErrors: result.providerErrors,
    scannedAt: now
  };

  return {
    ...result,
    cacheAgeSeconds: 0
  };
}

export function startStartupScan() {
  if (!startupScanPromise) {
    startupScanPromise = getCachedJobs(STARTUP_SEARCH).then(() => undefined);
  }

  return startupScanPromise;
}
