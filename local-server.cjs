const http = require("node:http");
const { URL } = require("node:url");

const sources = ["LinkedIn", "Indeed", "ZipRecruiter", "Dice", "Built In", "USAJOBS"];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hoursAgo(hours) {
  return new Date(Date.now() - 1000 * 60 * 60 * hours).toISOString();
}

const allJobs = [
  {
    id: `linkedin-${slugify("ServiceNow Platform Engineer Apex Systems")}`,
    title: "ServiceNow Platform Engineer",
    company: "Apex Systems",
    location: "Remote, United States",
    source: "LinkedIn",
    sourceUrl: providerSearchUrl("LinkedIn", "ServiceNow Platform Engineer", "Apex Systems", "Remote, United States"),
    postedAt: hoursAgo(18),
    salary: "$115k - $145k",
    workMode: "remote",
    employmentType: "full-time",
    summary:
      "Own Flow Designer, IntegrationHub, and CMDB enhancements for enterprise ITSM workflows.",
    skills: ["ServiceNow", "Flow Designer", "IntegrationHub", "CMDB"]
  },
  {
    id: `linkedin-${slugify("ServiceNow Business Analyst BrightPath")}`,
    title: "ServiceNow Business Analyst",
    company: "BrightPath Consulting",
    location: "Austin, TX",
    source: "LinkedIn",
    sourceUrl: providerSearchUrl("LinkedIn", "ServiceNow Business Analyst", "BrightPath Consulting", "Austin, TX"),
    postedAt: hoursAgo(42),
    workMode: "hybrid",
    employmentType: "contract",
    summary:
      "Translate stakeholder requirements into scoped stories for ITSM, HRSD, and portal work.",
    skills: ["ServiceNow", "ITSM", "HRSD", "Agile"]
  },
  {
    id: `indeed-${slugify("ServiceNow Developer Northstar Health")}`,
    title: "ServiceNow Developer",
    company: "Northstar Health",
    location: "Chicago, IL",
    source: "Indeed",
    sourceUrl: providerSearchUrl("Indeed", "ServiceNow Developer", "Northstar Health", "Chicago, IL"),
    postedAt: hoursAgo(8),
    salary: "$70 - $85/hr",
    workMode: "hybrid",
    employmentType: "contract",
    summary:
      "Build scoped applications, catalog items, and scripted integrations for a healthcare platform team.",
    skills: ["ServiceNow", "JavaScript", "Scoped Apps", "REST"]
  },
  {
    id: `indeed-${slugify("ServiceNow Administrator CivicGrid")}`,
    title: "ServiceNow Administrator",
    company: "CivicGrid",
    location: "Remote, United States",
    source: "Indeed",
    sourceUrl: providerSearchUrl("Indeed", "ServiceNow Administrator", "CivicGrid", "Remote, United States"),
    postedAt: hoursAgo(72),
    salary: "$95k - $120k",
    workMode: "remote",
    employmentType: "full-time",
    summary:
      "Maintain ITSM modules, user access, SLAs, dashboards, and production instance hygiene.",
    skills: ["ServiceNow", "ITSM", "Admin", "Reporting"]
  },
  {
    id: `ziprecruiter-${slugify("Senior ServiceNow Consultant CloudBridge")}`,
    title: "Senior ServiceNow Consultant",
    company: "CloudBridge Partners",
    location: "New York, NY",
    source: "ZipRecruiter",
    sourceUrl: providerSearchUrl("ZipRecruiter", "Senior ServiceNow Consultant", "CloudBridge Partners", "New York, NY"),
    postedAt: hoursAgo(28),
    salary: "$135k - $165k",
    workMode: "hybrid",
    employmentType: "full-time",
    summary:
      "Lead discovery, solution design, and delivery for ITOM and CSM implementation programs.",
    skills: ["ServiceNow", "ITOM", "CSM", "Consulting"]
  },
  {
    id: `ziprecruiter-${slugify("ServiceNow Architect Meridian Federal")}`,
    title: "ServiceNow Architect",
    company: "Meridian Federal",
    location: "Washington, DC",
    source: "ZipRecruiter",
    sourceUrl: providerSearchUrl("ZipRecruiter", "ServiceNow Architect", "Meridian Federal", "Washington, DC"),
    postedAt: hoursAgo(12),
    salary: "$150k - $185k",
    workMode: "onsite",
    employmentType: "full-time",
    summary:
      "Define platform architecture, integrations, and governance for federal ServiceNow environments.",
    skills: ["ServiceNow", "Architecture", "Governance", "Security"]
  }
];

function providerSearchUrl(source, title, company, location) {
  const query = encodeURIComponent(`${title} ${company}`);
  const place = encodeURIComponent(location);
  if (source === "LinkedIn") return `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${place}`;
  if (source === "Indeed") return `https://www.indeed.com/jobs?q=${query}&l=${place}`;
  if (source === "ZipRecruiter") return `https://www.ziprecruiter.com/jobs-search?search=${query}&location=${place}`;
  return "#";
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

function inferWorkMode(value) {
  const text = value.toLowerCase();
  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in-office")) return "onsite";
  return "unknown";
}

function providerUrl(source, query, location) {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location);
  if (source === "Dice") return `https://www.dice.com/jobs?q=${q}&location=${l}`;
  if (source === "Built In") return `https://builtin.com/jobs?search=${q}&location=${l}`;
  if (source === "USAJOBS") return `https://www.usajobs.gov/Search/Results?k=${q}&l=${l}`;
  return "#";
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ServiceNowJobFinder/0.1; +http://localhost:3000)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function parseJsonLdJobs(html, source, fallbackUrl) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jobs = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const jobItems = items.flatMap((item) => {
        if (item && item["@type"] === "JobPosting") return [item];
        if (Array.isArray(item && item["@graph"])) {
          return item["@graph"].filter((entry) => entry && entry["@type"] === "JobPosting");
        }
        return [];
      });

      for (const item of jobItems) {
        const company =
          typeof item.hiringOrganization === "string"
            ? item.hiringOrganization
            : item.hiringOrganization && item.hiringOrganization.name;
        const location =
          item.jobLocation?.address?.addressLocality ||
          item.jobLocation?.address?.addressRegion ||
          item.applicantLocationRequirements?.name ||
          "Remote";
        const title = stripHtml(item.title || "");
        if (!title) continue;

        jobs.push({
          id: `${source.toLowerCase().replace(/\s+/g, "-")}-${slugify(`${title}-${company || source}-${location}`)}`,
          title,
          company: stripHtml(company || "Unknown company"),
          location: stripHtml(location),
          source,
          sourceUrl: item.url || fallbackUrl,
          postedAt: item.datePosted || new Date().toISOString(),
          salary: item.baseSalary?.value?.value ? String(item.baseSalary.value.value) : undefined,
          workMode: inferWorkMode(`${title} ${location} ${item.description || ""}`),
          employmentType: String(item.employmentType || "unknown").toLowerCase().includes("contract") ? "contract" : "full-time",
          summary: stripHtml(item.description || `${title} at ${company || source}`).slice(0, 240),
          skills: ["ServiceNow"]
        });
      }
    } catch {}
  }

  return jobs;
}

async function fetchDiceJobs(query, location) {
  const url = providerUrl("Dice", query, location);
  const html = await fetchText(url);
  return parseJsonLdJobs(html, "Dice", url).slice(0, 10);
}

async function fetchBuiltInJobs(query, location) {
  const url = providerUrl("Built In", query, location);
  const html = await fetchText(url);
  return parseJsonLdJobs(html, "Built In", url).slice(0, 10);
}

async function fetchUsaJobs(query, location) {
  const apiKey = process.env.USAJOBS_API_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;
  if (!apiKey || !userAgent) {
    throw new Error("USAJOBS requires USAJOBS_API_KEY and USAJOBS_USER_AGENT env vars.");
  }

  const params = new URLSearchParams({ Keyword: query, LocationName: location, ResultsPerPage: "10" });
  const response = await fetch(`https://data.usajobs.gov/api/Search?${params.toString()}`, {
    headers: {
      host: "data.usajobs.gov",
      "user-agent": userAgent,
      "authorization-key": apiKey
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const items = payload?.SearchResult?.SearchResultItems || [];
  return items.map((item) => {
    const descriptor = item.MatchedObjectDescriptor || {};
    const locationName = descriptor.PositionLocation?.[0]?.LocationName || location;
    const title = descriptor.PositionTitle || "USAJOBS role";
    const company = descriptor.OrganizationName || descriptor.DepartmentName || "Federal agency";
    return {
      id: `usajobs-${slugify(descriptor.PositionID || `${title}-${company}`)}`,
      title,
      company,
      location: locationName,
      source: "USAJOBS",
      sourceUrl: descriptor.PositionURI || providerUrl("USAJOBS", query, location),
      postedAt: descriptor.PublicationStartDate || new Date().toISOString(),
      salary: descriptor.PositionRemuneration?.[0]
        ? `${descriptor.PositionRemuneration[0].MinimumRange} - ${descriptor.PositionRemuneration[0].MaximumRange}`
        : undefined,
      workMode: inferWorkMode(`${title} ${locationName} ${descriptor.UserArea?.Details?.TeleworkEligible}`),
      employmentType: "full-time",
      summary: stripHtml(descriptor.QualificationSummary || title).slice(0, 240),
      skills: ["ServiceNow", "Federal"]
    };
  });
}

async function getJobs(url) {
  const query = url.searchParams.get("query")?.trim() || "ServiceNow";
  const location = url.searchParams.get("location")?.trim() || "Remote";
  const requestedSources =
    url.searchParams.get("sources")?.split(",").map((source) => source.trim()).filter(Boolean) ||
    sources;

  const invalidSources = requestedSources.filter((source) => !sources.includes(source));
  if (invalidSources.length > 0) {
    return { status: 400, body: { error: `Unsupported source: ${invalidSources.join(", ")}` } };
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const providerErrors = {};
  const localJobs = allJobs
    .filter((job) => requestedSources.includes(job.source))
    .filter((job) => {
      const haystack = [
        job.title,
        job.company,
        job.location,
        job.summary,
        job.skills.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = queryTerms.every((term) => haystack.includes(term));
      const matchesLocation =
        location.toLowerCase() === "remote" ||
        job.location.toLowerCase().includes(location.toLowerCase()) ||
        job.workMode === "remote";
      return matchesQuery && matchesLocation;
    })
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  for (const source of ["LinkedIn", "Indeed", "ZipRecruiter"]) {
    if (requestedSources.includes(source)) {
      providerErrors[source] = `${source} is using local mock data until an approved API/feed is configured.`;
    }
  }

  const liveJobs = [];
  for (const [source, fn] of [
    ["Dice", fetchDiceJobs],
    ["Built In", fetchBuiltInJobs],
    ["USAJOBS", fetchUsaJobs]
  ]) {
    if (!requestedSources.includes(source)) continue;
    try {
      const result = await fn(query, location);
      if (result.length === 0) {
        providerErrors[source] = `${source} returned a live response, but no parseable jobs were found.`;
      }
      liveJobs.push(...result);
    } catch (error) {
      providerErrors[source] = `${source} live fetch failed: ${error.message}`;
    }
  }

  const jobs = [...localJobs, ...liveJobs].sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );

  return {
    status: 200,
    body: {
      jobs,
      meta: {
        query,
        location,
        sources: requestedSources,
        total: jobs.length,
        generatedAt: new Date().toISOString(),
        failedSources: Object.keys(providerErrors),
        providerErrors,
        cacheAgeSeconds: 0
      }
    }
  };
}

const page = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ServiceNow Job Finder</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-50 text-slate-950">
    <main class="min-h-screen">
      <section class="border-b bg-white">
        <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
          <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div class="mb-3 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Mocked providers, end-to-end flow</div>
              <h1 class="text-4xl font-semibold">ServiceNow Job Finder</h1>
              <p class="mt-3 max-w-2xl text-slate-600">Search normalized ServiceNow listings across LinkedIn, Indeed, and ZipRecruiter stubs while the scraper layer is safely offline.</p>
            </div>
            <div class="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-3 text-center">
              <div><div id="matches" class="text-2xl font-semibold">0</div><div class="text-xs text-slate-500">Matches</div></div>
              <div><div id="sourceCount" class="text-2xl font-semibold">6</div><div class="text-xs text-slate-500">Sources</div></div>
              <div><div id="remoteCount" class="text-2xl font-semibold">0</div><div class="text-xs text-slate-500">Remote</div></div>
            </div>
          </div>
          <form id="searchForm" class="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
            <label class="space-y-2"><span class="text-sm font-medium">Keywords</span><input id="query" class="h-10 w-full rounded-md border px-3 text-sm" value="ServiceNow" /></label>
            <label class="space-y-2"><span class="text-sm font-medium">Location</span><input id="location" class="h-10 w-full rounded-md border px-3 text-sm" value="Remote" /></label>
            <button id="submitButton" class="mt-auto h-10 rounded-md bg-teal-700 px-4 text-sm font-medium text-white">Find jobs</button>
          </form>
        </div>
      </section>
      <section class="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside class="space-y-4">
          <div class="rounded-lg border bg-white p-5">
            <h2 class="font-semibold">Sources</h2>
            <div id="sources" class="mt-4 space-y-2"></div>
          </div>
          <div class="rounded-lg border bg-white p-5">
            <h2 class="font-semibold">Schema</h2>
            <div class="mt-4 flex flex-wrap gap-2 text-xs">
              <span class="rounded-md border px-2.5 py-1">title</span><span class="rounded-md border px-2.5 py-1">company</span><span class="rounded-md border px-2.5 py-1">location</span><span class="rounded-md border px-2.5 py-1">source</span><span class="rounded-md border px-2.5 py-1">salary</span><span class="rounded-md border px-2.5 py-1">skills</span><span class="rounded-md border px-2.5 py-1">workMode</span>
            </div>
          </div>
        </aside>
        <div id="status" class="hidden rounded-lg border p-4 text-sm"></div>
        <div id="jobs" class="space-y-4"></div>
      </section>
    </main>
    <script>
      const allSources = ["LinkedIn", "Indeed", "ZipRecruiter", "Dice", "Built In", "USAJOBS"];
      let activeSources = [...allSources];

      function sourceButton(source) {
        const active = activeSources.includes(source);
        return '<button type="button" data-source="' + source + '" class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ' + (active ? 'border-teal-700 bg-teal-50' : 'bg-white') + '"><span>' + source + '</span><span>' + (active ? '✓' : '') + '</span></button>';
      }

      function renderSources() {
        document.getElementById("sources").innerHTML = allSources.map(sourceButton).join("");
        document.getElementById("sourceCount").textContent = activeSources.length;
      }

      function posted(value) {
        const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 36e5));
        return hours < 24 ? hours + "h ago" : Math.round(hours / 24) + "d ago";
      }

      function renderJobs(jobs) {
        document.getElementById("matches").textContent = jobs.length;
        document.getElementById("remoteCount").textContent = jobs.filter((job) => job.workMode === "remote").length;
        document.getElementById("jobs").innerHTML = jobs.length ? jobs.map((job) => (
          '<article class="rounded-lg border bg-white p-5 shadow-sm">' +
          '<div class="flex flex-col gap-3 sm:flex-row sm:justify-between">' +
          '<div><div class="mb-2 flex flex-wrap gap-2 text-xs font-semibold">' +
          '<span class="rounded-md border bg-slate-50 px-2.5 py-1">' + job.source + '</span>' +
          '<span class="rounded-md bg-slate-100 px-2.5 py-1">' + job.workMode + '</span>' +
          '<span class="rounded-md bg-slate-100 px-2.5 py-1">' + job.employmentType + '</span></div>' +
          '<h3 class="text-xl font-semibold">' + job.title + '</h3>' +
          '<p class="mt-2 text-sm text-slate-500">' + job.company + ' · ' + job.location + ' · ' + posted(job.postedAt) + '</p></div>' +
          '<a class="h-9 rounded-md border px-3 py-2 text-sm" href="' + job.sourceUrl + '">Open</a></div>' +
          '<p class="mt-4 text-sm leading-6 text-slate-700">' + job.summary + '</p>' +
          '<div class="mt-4 flex flex-wrap gap-2 text-xs">' +
          (job.salary ? '<span class="rounded-md bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">' + job.salary + '</span>' : '') +
          job.skills.map((skill) => '<span class="rounded-md border px-2.5 py-1">' + skill + '</span>').join("") +
          '</div></article>'
        )).join("") : '<div class="rounded-lg border bg-white p-5"><h3 class="font-semibold">No jobs found</h3><p class="mt-1 text-sm text-slate-500">Try a broader keyword, another location, or enable more sources.</p></div>';
      }

      async function searchJobs() {
        const status = document.getElementById("status");
        if (!activeSources.length) {
          status.className = "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800";
          status.textContent = "Choose at least one job source.";
          return;
        }

        status.className = "rounded-lg border bg-white p-4 text-sm";
        status.textContent = "Loading jobs...";
        const params = new URLSearchParams({
          query: document.getElementById("query").value || "ServiceNow",
          location: document.getElementById("location").value || "Remote",
          sources: activeSources.join(",")
        });
        const res = await fetch("/api/jobs?" + params.toString());
        const data = await res.json();
        if (!res.ok) {
          status.className = "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800";
          status.textContent = data.error || "Unable to fetch jobs.";
          return;
        }
        if (data.meta && data.meta.providerErrors && Object.keys(data.meta.providerErrors).length) {
          status.className = "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900";
          status.innerHTML = "<strong>Provider notes</strong><br>" + Object.entries(data.meta.providerErrors).map(([source, message]) => "<span><strong>" + source + ":</strong> " + message + "</span>").join("<br>");
        } else {
          status.className = "hidden";
        }
        renderJobs(data.jobs);
      }

      document.getElementById("searchForm").addEventListener("submit", (event) => {
        event.preventDefault();
        searchJobs();
      });
      document.getElementById("sources").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-source]");
        if (!button) return;
        const source = button.dataset.source;
        activeSources = activeSources.includes(source) ? activeSources.filter((item) => item !== source) : [...activeSources, source];
        renderSources();
      });
      renderSources();
      searchJobs();
    </script>
  </body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3000");

  if (url.pathname === "/api/jobs") {
    const result = await getJobs(url);
    res.writeHead(result.status, { "content-type": "application/json" });
    res.end(JSON.stringify(result.body));
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(page);
});

server.listen(3000, () => {
  console.log("ServiceNow Job Finder fallback server running at http://localhost:3000");
});
