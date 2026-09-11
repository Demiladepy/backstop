/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cases from "../cases.js";
import type * as draftAppeal from "../draftAppeal.js";
import type * as email from "../email.js";
import type * as externalApi from "../externalApi.js";
import type * as findPolicy from "../findPolicy.js";
import type * as http from "../http.js";
import type * as parseDocument from "../parseDocument.js";
import type * as replyDraft from "../replyDraft.js";
import type * as workflowModel from "../workflowModel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cases: typeof cases;
  draftAppeal: typeof draftAppeal;
  email: typeof email;
  externalApi: typeof externalApi;
  findPolicy: typeof findPolicy;
  http: typeof http;
  parseDocument: typeof parseDocument;
  replyDraft: typeof replyDraft;
  workflowModel: typeof workflowModel;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  agentmail: import("@agentmail/convex/_generated/component.js").ComponentApi<"agentmail">;
};
