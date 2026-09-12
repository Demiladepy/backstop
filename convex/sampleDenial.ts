import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

/** Fictional demo letter — same content as public/samples/sample-denial.html */
export const SAMPLE_DENIAL_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Fictional Aetna medical denial demonstration</title>
  </head>
  <body>
    <main>
      <p>FICTIONAL DEMO DOCUMENT — NOT A REAL PATIENT RECORD</p>
      <p>
        Aetna · FICTIONAL DEMONSTRATION LETTER<br />
        This document was not issued by Aetna and describes no real member.
      </p>
      <p>September 8, 2026</p>
      <h1>Notice of adverse benefit determination</h1>
      <p>
        Member: Casey Sample<br />
        Reference: DEMO-4821<br />
        Requested service: Outpatient MRI of the lumbar spine
      </p>
      <p>
        We denied the requested outpatient MRI because the information
        submitted did not show completion of six weeks of provider-directed
        conservative treatment. The request therefore does not meet the plan’s
        medical-necessity criteria for advanced imaging.
      </p>
      <h2>Your right to appeal</h2>
      <p>
        You or your authorized representative may submit a written appeal
        within 180 calendar days of this notice. Include this reference number,
        the reason you disagree, and any supporting clinical information.
      </p>
      <p>
        Send written appeals to appeals@example.com. This address and every
        organization in this document are fictional and intended only for the
        Backstop public hackathon demonstration.
      </p>
    </main>
  </body>
</html>
`;

export const seedSampleDenial = action({
  args: { caseId: v.id("cases") },
  returns: v.id("documents"),
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const bytes = new TextEncoder().encode(SAMPLE_DENIAL_HTML);
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: "text/html" }),
    );

    return await ctx.runMutation(api.cases.attachDocument, {
      caseId: args.caseId,
      storageId,
      fileName: "sample-denial.html",
    });
  },
});
