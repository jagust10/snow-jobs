import type { JobSearchQuery, NormalizedJob } from "./schema";

type MockScraper = (search: JobSearchQuery) => Promise<NormalizedJob[]>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function includesSearch(job: NormalizedJob, query: string, location: string) {
  const haystack = [
    job.title,
    job.company,
    job.location,
    job.summary,
    job.skills.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchesQuery = queryTerms.every((term) => haystack.includes(term));
  const matchesLocation =
    location.trim().length === 0 ||
    location.toLowerCase() === "remote" ||
    job.location.toLowerCase().includes(location.toLowerCase()) ||
    job.workMode === "remote";

  return matchesQuery && matchesLocation;
}

function withSearchFilter(jobs: NormalizedJob[], search: JobSearchQuery) {
  return jobs.filter((job) => includesSearch(job, search.query, search.location));
}

function providerSearchUrl(source: NormalizedJob["source"], title: string, company: string, location: string) {
  const query = encodeURIComponent(`${title} ${company}`);
  const place = encodeURIComponent(location);

  switch (source) {
    case "LinkedIn":
      return `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${place}`;
    case "Indeed":
      return `https://www.indeed.com/jobs?q=${query}&l=${place}`;
    case "ZipRecruiter":
      return `https://www.ziprecruiter.com/jobs-search?search=${query}&location=${place}`;
    default:
      return "#";
  }
}

export const mockLinkedInScraper: MockScraper = async (search) => {
  const jobs: NormalizedJob[] = [
    {
      id: `linkedin-${slugify("ServiceNow Platform Engineer Apex Systems")}`,
      title: "ServiceNow Platform Engineer",
      company: "Apex Systems",
      location: "Remote, United States",
      source: "LinkedIn",
      sourceUrl: providerSearchUrl(
        "LinkedIn",
        "ServiceNow Platform Engineer",
        "Apex Systems",
        "Remote, United States"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
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
      sourceUrl: providerSearchUrl(
        "LinkedIn",
        "ServiceNow Business Analyst",
        "BrightPath Consulting",
        "Austin, TX"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
      workMode: "hybrid",
      employmentType: "contract",
      summary:
        "Translate stakeholder requirements into scoped stories for ITSM, HRSD, and portal work.",
      skills: ["ServiceNow", "ITSM", "HRSD", "Agile"]
    }
  ];

  return withSearchFilter(jobs, search);
};

export const mockIndeedScraper: MockScraper = async (search) => {
  const jobs: NormalizedJob[] = [
    {
      id: `indeed-${slugify("ServiceNow Developer Northstar Health")}`,
      title: "ServiceNow Developer",
      company: "Northstar Health",
      location: "Chicago, IL",
      source: "Indeed",
      sourceUrl: providerSearchUrl(
        "Indeed",
        "ServiceNow Developer",
        "Northstar Health",
        "Chicago, IL"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
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
      sourceUrl: providerSearchUrl(
        "Indeed",
        "ServiceNow Administrator",
        "CivicGrid",
        "Remote, United States"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      salary: "$95k - $120k",
      workMode: "remote",
      employmentType: "full-time",
      summary:
        "Maintain ITSM modules, user access, SLAs, dashboards, and production instance hygiene.",
      skills: ["ServiceNow", "ITSM", "Admin", "Reporting"]
    }
  ];

  return withSearchFilter(jobs, search);
};

export const mockZipRecruiterScraper: MockScraper = async (search) => {
  const jobs: NormalizedJob[] = [
    {
      id: `ziprecruiter-${slugify("Senior ServiceNow Consultant CloudBridge")}`,
      title: "Senior ServiceNow Consultant",
      company: "CloudBridge Partners",
      location: "New York, NY",
      source: "ZipRecruiter",
      sourceUrl: providerSearchUrl(
        "ZipRecruiter",
        "Senior ServiceNow Consultant",
        "CloudBridge Partners",
        "New York, NY"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
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
      sourceUrl: providerSearchUrl(
        "ZipRecruiter",
        "ServiceNow Architect",
        "Meridian Federal",
        "Washington, DC"
      ),
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      salary: "$150k - $185k",
      workMode: "onsite",
      employmentType: "full-time",
      summary:
        "Define platform architecture, integrations, and governance for federal ServiceNow environments.",
      skills: ["ServiceNow", "Architecture", "Governance", "Security"]
    }
  ];

  return withSearchFilter(jobs, search);
};

export const mockScrapers = {
  LinkedIn: mockLinkedInScraper,
  Indeed: mockIndeedScraper,
  ZipRecruiter: mockZipRecruiterScraper
};
