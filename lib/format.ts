
import { getCachedTokenDecimals } from "@/lib/token-decimals";
import {
  getCachedTokenMetadata,
  KNOWN_TOKEN_METADATA,
  type TokenMetadata,
} from "@/lib/token-metadata";

export type { TokenMetadata };

// Characters kept from each end of a truncated address: enough to tell
// addresses apart at a glance while fitting cards and table cells.
const ADDRESS_EDGE_LENGTH = 4;

// Unit conversions for the countdowns. Timestamps are Unix seconds; Date works
// in milliseconds.
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
