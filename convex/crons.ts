import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();

crons.hourly(
  "prune old events",
  { minuteUTC: 7 },
  makeFunctionReference<"mutation">("events:prune"),
);

export default crons;
