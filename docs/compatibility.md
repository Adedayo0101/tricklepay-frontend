# Compatibility Matrix: Client, API, and Contract

The TricklePay frontend depends on two independent backend systems:
1. **The REST API (`tricklepay-backend`)**: provides read access to indexed stream lists, individual stream metadata, precomputed vesting progress, and totals.
2. **The Soroban Stream Contract (`tricklepay-contracts`)**: executes on-chain transactions (`create_stream`, `withdraw`, `cancel`) and emits numeric revert error codes.

Both interfaces evolve over time. This document tracks which client versions are compatible with which API and contract versions, describes the failure modes when mismatched, catalogues all contract error codes the client understands, and provides a maintenance checklist for version updates.

---

## 1. Compatibility Matrix

| Client Version | Backend API Version | Contract Version | Status | Failure Modes & What Breaks Otherwise |
|---|---|---|---|---|
| **v0.1.x** (Current) | **v0.1.x** | **v0.1.x** (with or without error code 2) | **Compatible** | Full support for all features: stream indexing, pagination, live status, withdrawals, cancellation, and creation. |
| **v0.1.x** | < v0.1.0 | Any | **Incompatible** | Early API versions returned flat arrays rather than `{ streams, total, limit, offset }` pagination envelopes. Client fails to parse stream lists or renders empty dashboard with type errors. |
| **v0.1.x** | API lacking `cliffTime` | Any | **Degraded** | Streams with cliffs omit the cliff marker and countdown, falling back to treating start time as withdrawal inception. |
| **v0.1.x** | Any | Contract without error code 13 | **Partially Compatible** | Self-streaming or invalid participant checks only trigger generic revert errors on-chain rather than descriptive input validation feedback. |
| **v0.1.x** | Any | Future contract (ABI changes to `create_stream` / `withdraw`) | **Incompatible** | Client transaction builder fails simulation (`invoke_host_function` argument count or type mismatch). Users cannot submit write actions. |

### API Response Shape Dependencies

The client expects responses from the REST API to adhere to the following contracts:

- **`GET /streams`**: Returns `{ streams: StreamView[], total: number, limit: number, offset: number }`.
  - Stroop amounts (`totalAmount`, `withdrawable`, `senderRemaining`, `recipientWithdrawn`) must be serialized as decimal strings (to avoid JS 64-bit float precision loss).
  - Timestamps (`startTime`, `endTime`, `cliffTime`) must be Unix second strings or numbers.
  - `progress` must be basis points (`0` to `10000`).
- **`GET /streams/:id`**: Returns a single `StreamView` matching the schema above.

### Contract Interface Dependencies

The client builds Soroban transaction invocations targeting:
- **`create_stream(sender, recipient, token, total_amount, start_time, end_time, cliff_time)`**
- **`withdraw(stream_id, amount)`**
- **`cancel(stream_id)`**

All amounts are 7-decimal stroops passed as `i128`. Timestamps are Unix seconds passed as `u64`.

---

## 2. Contract Error Codes Understood by the Client

When a transaction reverts on-chain, Soroban returns diagnostic events containing `Error(Contract, #N)`. The frontend extracts this code via `lib/contract-errors.ts` and maps it to a clear, actionable user message.

The table below lists every contract error code recognized by the client:

| Code | Variant Name in `error.rs` | Client Message | Description & Cause |
|---|---|---|---|
| **1** | `StreamNotFound` | "Stream not found." | The stream ID passed to `withdraw` or `cancel` does not exist on-chain. |
| **2** | `Unauthorized` *(legacy)* | "You are not authorized to perform this action." | Retained for backwards compatibility. In newer contracts, Soroban's `require_auth` traps before contract code returns this discriminant. |
| **3** | `InvalidTimeRange` | "Invalid time range — the stream must start before it ends." | `end_time` is less than or equal to `start_time`. |
| **4** | `InvalidAmount` | "Invalid amount — the total must be greater than zero." | `total_amount` is zero or negative. |
| **5** | `InvalidCliff` | "Invalid cliff — the cliff must fall between the start and end times." | `cliff_time` is before `start_time` or after `end_time`. |
| **6** | `AlreadyCancelled` | "This stream has already been cancelled." | Attempting to withdraw from or cancel a previously cancelled stream. |
| **7** | `NothingToWithdraw` | "Nothing to withdraw yet — no tokens have vested since your last withdrawal." | Time elapsed has not yielded any newly vested unwithdrawn tokens. |
| **8** | `InsufficientBalance` | "That is more than you can withdraw right now." | Requested withdrawal amount exceeds the stream's current withdrawable balance. |
| **9** | `StreamAlreadyCompleted` | "This stream has already completed and can no longer be cancelled." | The stream has reached its end time and fully vested. |
| **10** | `AmountTooLarge` | "That amount is too large. The total must not exceed 9223372036854775807." | Amount exceeds the contract's maximum integer limit (`i64::MAX` or `i128` safe bound). |
| **11** | `StreamWindowInPast` | "The stream's end time has already passed — choose an end time in the future." | Attempted to create a stream whose scheduled end time is in the past. |
| **12** | `StreamCountExhausted` | "No new streams can be created on this contract — it has run out of stream ids." | Contract instance stream counter overflow. Requires deploying a new contract instance. |
| **13** | `InvalidParticipant` | "Invalid participants — the sender and recipient must be different accounts, and neither can be the token or the stream contract." | Sender equals recipient, or participant address is a blacklisted contract. |

### Token Contract Errors vs Stream Errors

The Stellar Asset Contract (SAC) uses its own error codes that overlap with stream codes (for example, token `BalanceError` is also code `10`). The client checks diagnostic event topics:
- If the event emitter matches the token contract rather than the configured stream contract, `tokenFailureMessage(code)` is displayed instead:
  > *"The token contract rejected the transfer. Check that your balance covers the amount, then try again. (token error code N)"*

### Unrecognized Error Codes

Any contract error code not in the table falls back to:
> *"The transaction failed on-chain. (error code N)"*
Surfacing the raw code ensures users can report the exact issue.

---

## 3. How to Update When Versions Change

### When the Contract Changes

1. **Review Contract Diff**: Check [`contracts/stream/src/error.rs`](https://github.com/TricklePay/tricklepay-contracts/blob/main/contracts/stream/src/error.rs) for new or removed error codes.
2. **Update `lib/contract-errors.ts`**:
   - Add new error codes to `CONTRACT_ERROR_MESSAGES`.
   - Never remove older codes if deployed instances might still emit them (such as code `2`).
   - Keep the numeric code list comment synchronized.
3. **Update Contract Invocations**: If function parameters changed (e.g. in `create_stream` or `withdraw`), update transaction builders in `lib/contract.ts`.
4. **Update Unit Tests**: Update `lib/contract-errors.test.ts` to assert the updated error code set and specific messages.
5. **Update Documentation**: Update this document (`docs/compatibility.md`) and `docs/api-error-handling.md`.

### When the Backend API Changes

1. **Update Types**: Modify `types/stream.ts` to reflect added or altered response fields.
2. **Update Client Fetchers**: Update `lib/api.ts` parsing logic and validation.
3. **Update Mock Data**: Update fixtures in `lib/mock-api.ts` to supply any new required fields so mock development mode remains accurate.
4. **Update Tests**: Run and update `app/page.test.tsx` and detail page tests.

### When Tagging a Frontend Release

1. Verify and test the frontend against the current testnet deployments of `tricklepay-backend` and `tricklepay-contracts`.
2. Add a new row to the **Compatibility Matrix** table above recording the tested version triple.
3. Run `npm run check` (or lint, typecheck, and unit test suites) to ensure all contracts and types align.
