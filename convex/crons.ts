import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check Firecrawl monitors and appeal deadlines",
  { hours: 1 },
  internal.depth.checkMonitors,
  {},
);

export default crons;
