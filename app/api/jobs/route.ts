import { NextRequest, NextResponse } from "next/server";
import { JOB_SOURCES, isJobSource, type JobSearchQuery } from "@/lib/jobs/schema";
import { getCachedJobs, startStartupScan } from "@/lib/jobs/live-providers";

const DEFAULT_QUERY = "ServiceNow";
const DEFAULT_LOCATION = "Remote";

void startStartupScan();

function parseSources(value: string | null) {
  if (!value) {
    return JOB_SOURCES;
  }

  const sources = value
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);

  const invalidSources = sources.filter((source) => !isJobSource(source));

  if (invalidSources.length > 0) {
    return {
      error: `Unsupported source: ${invalidSources.join(", ")}`
    };
  }

  return sources as typeof JOB_SOURCES;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get("query")?.trim() || DEFAULT_QUERY;
    const location = params.get("location")?.trim() || DEFAULT_LOCATION;
    const parsedSources = parseSources(params.get("sources"));

    if ("error" in parsedSources) {
      return NextResponse.json({ error: parsedSources.error }, { status: 400 });
    }

    const search: JobSearchQuery = {
      query,
      location,
      sources: parsedSources
    };

    const { jobs, providerErrors, cacheAgeSeconds } = await getCachedJobs(search);
    const failedSources = search.sources.filter((source) => providerErrors[source]);

    if (jobs.length === 0 && failedSources.length === search.sources.length) {
      return NextResponse.json(
        {
          error: "All selected job providers failed. Please try again.",
          providerErrors
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      jobs,
      meta: {
        query,
        location,
        sources: search.sources,
        total: jobs.length,
        generatedAt: new Date().toISOString(),
        failedSources,
        providerErrors,
        cacheAgeSeconds
      }
    });
  } catch (error) {
    console.error("Failed to fetch mock jobs", error);

    return NextResponse.json(
      { error: "Something went wrong while fetching jobs." },
      { status: 500 }
    );
  }
}
