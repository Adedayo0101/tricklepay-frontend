// The dashboard is wallet-specific: every URL is personalised content that
// depends on the connected address and carries no value to a search index.
// Creating a new stream (/create) is also gated behind wallet connection.
// There is no public landing page in this app that would benefit from indexing,
// so all crawlers are blocked from the entire site.
//
// If a public landing page is added in the future, adjust the rules to allow
// only that path (e.g. { userAgent: "*", allow: "/" } with disallow entries
// for /streams and /create).
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
