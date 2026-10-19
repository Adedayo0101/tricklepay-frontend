# Adding or changing a contract error message

When the stream contract reverts, the frontend turns its numeric
`Error(Contract, #N)` code into a sentence the user can act on. That mapping
is a hand-kept table, so it goes stale whenever the contract changes. This
guide is the checklist for keeping it current.

## Where things live

| What | Where |
| --- | --- |
| Authoritative list of codes | `StreamError` in the contract's [`contracts/stream/src/error.rs`](https://github.com/TricklePay/tricklepay-contracts/blob/main/contracts/stream/src/error.rs) |
| The frontend table | `CONTRACT_ERROR_MESSAGES` in [`lib/contract-errors.ts`](../lib/contract-errors.ts), plus the code list in the comment above it |
| Tests | [`lib/contract-errors.test.ts`](../lib/contract-errors.test.ts) — asserts the table's key set exactly |
| User-facing documentation | The code table in [api-error-handling.md](api-error-handling.md#contract-revert-errors-parsecontracterror) |

Codes are explicit discriminants in `error.rs`, not positions. Gaps are
deliberate (code 2 is no longer emitted but older deployments can still
return it), so never renumber or "fill in" a gap.

## Steps

1. **Read the contract change.** Open `error.rs` at the contract version the
   frontend targets and note the variant name, its number and where the
   contract returns it.
2. **Add or edit the entry** in `CONTRACT_ERROR_MESSAGES`, keyed by the
   number, and update the code list in the comment above the table.
3. **Removed variants stay mapped.** Contracts already deployed can still
   emit an old code, so keep its message unless every deployment is gone.
   Note in the comment why it is kept.
4. **Update the tests** in `lib/contract-errors.test.ts`: the expected key
   set, and a case for the new code's message if it needs special handling.
5. **Update the table** in [api-error-handling.md](api-error-handling.md) so
   the docs match the code.
6. **Run** `npm run lint`, `npm run typecheck` and `npm test`.

## Writing the message

Follow the copy rules in [CONTRIBUTING.md](../CONTRIBUTING.md#-user-facing-copy).
For an error message in particular:

- **Say what went wrong in the user's terms**, not the variant name:
  "Nothing to withdraw yet", not "NothingToWithdraw".
- **Say what to do next** when there is something to do: "choose an end time
  in the future".
- **Include the limit** when the error is about a limit, e.g. the maximum
  amount.
- **Keep it to one or two short sentences**, ending with a full stop.
- **Don't reuse a stream message for a token error.** Token contracts have
  their own numbering that overlaps the stream's; `parseContractError` uses
  `tokenFailureMessage` when diagnostic events show another contract raised
  the code. Don't change that behaviour when adding a stream code.

Unknown codes fall back to `GENERIC_FAILURE` with the raw code appended, so a
missing entry never shows an empty error — but it does show an unhelpful one.
See [transaction-write-path.md](transaction-write-path.md) for where in the
write path these messages are raised.
