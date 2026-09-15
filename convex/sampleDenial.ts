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

/** Fictional EOB — same content as public/samples/sample-eob.html */
export const SAMPLE_EOB_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Fictional explanation of benefits demonstration</title>
  </head>
  <body>
    <main>
      <p>FICTIONAL DEMO DOCUMENT — NOT A REAL PATIENT RECORD</p>
      <p>
        Northstar Sample Health Plan · FICTIONAL EOB<br />
        This document was not issued by a real insurer and describes no real member.
      </p>
      <p>September 10, 2026</p>
      <h1>Explanation of benefits (sample)</h1>
      <p>
        Member: Casey Sample<br />
        Claim reference: DEMO-4821-EOB<br />
        Service: Outpatient MRI lumbar spine<br />
        Date of service: August 22, 2026
      </p>
      <p>
        Billed amount: $1,840.00 (fictional)<br />
        Plan allowed: $0.00<br />
        Member responsibility shown: $1,840.00 (fictional)
      </p>
      <p>
        Remark: Service denied as not medically necessary because the claim
        file did not document six weeks of provider-directed conservative
        treatment before advanced imaging. See denial notice DEMO-4821.
      </p>
      <p>
        This EOB is fictional sample material for the Backstop hackathon demo.
        Do not treat amounts, remarks, or member details as real.
      </p>
    </main>
  </body>
</html>
`;

async function storeHtml(ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } }, html: string) {
  const bytes = new TextEncoder().encode(html);
  return await ctx.storage.store(new Blob([bytes], { type: "text/html" }));
}

/** @deprecated Prefer seedSamplePacket — kept for compatibility. */
export const seedSampleDenial = action({
  args: { caseId: v.id("cases") },
  returns: v.id("documents"),
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const storageId = await storeHtml(ctx, SAMPLE_DENIAL_HTML);
    return await ctx.runMutation(api.cases.attachDocument, {
      caseId: args.caseId,
      storageId,
      fileName: "sample-denial.html",
      kind: "denial_letter",
    });
  },
});

/** Attaches fictional denial + EOB so the draft can cite both documents. */
export const seedSamplePacket = action({
  args: { caseId: v.id("cases") },
  returns: v.object({
    denialId: v.id("documents"),
    eobId: v.id("documents"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ denialId: Id<"documents">; eobId: Id<"documents"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const denialStorageId = await storeHtml(ctx, SAMPLE_DENIAL_HTML);
    const denialId: Id<"documents"> = await ctx.runMutation(
      api.cases.attachDocument,
      {
        caseId: args.caseId,
        storageId: denialStorageId,
        fileName: "sample-denial.html",
        kind: "denial_letter",
      },
    );

    const eobStorageId = await storeHtml(ctx, SAMPLE_EOB_HTML);
    const eobId: Id<"documents"> = await ctx.runMutation(
      api.cases.attachDocument,
      {
        caseId: args.caseId,
        storageId: eobStorageId,
        fileName: "sample-eob.html",
        kind: "eob",
      },
    );

    return { denialId, eobId };
  },
});
