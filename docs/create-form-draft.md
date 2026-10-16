# Create-stream form drafts

The create-stream form saves what you type as you type, so a reload, a closed
tab, or a detour to the dashboard does not cost you a half-finished stream. The
form you see when you open `/create` may therefore already be filled in.

This document covers what is stored, when a draft comes back, and how to get rid
of it.

- [1. What is stored](#1-what-is-stored)
- [2. When a draft is saved](#2-when-a-draft-is-saved)
- [3. When a draft is restored](#3-when-a-draft-is-restored)
- [4. How a draft is discarded](#4-how-a-draft-is-discarded)
- [5. Edge cases](#5-edge-cases)
- [Related documentation](#related-documentation)

---

## 1. What is stored

One JSON object in the browser's `localStorage`, under the key
`tricklepay-create-form-draft` (`lib/create-form-draft.ts`):

```json
{
  "recipient": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  "token": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  "amount": "100",
  "start": "2026-10-01T09:00",
  "end": "2026-11-01T09:00",
  "cliff": "",
  "durationAmount": "30",
  "durationUnit": "days"
}
```

| Field | Stored as | Notes |
|---|---|---|
| `recipient` | the raw string you typed | Not parsed into a `ScAddress`; the SDK's address check runs on the restored value. |
| `token` | the raw contract id | |
| `amount` | the raw decimal string | **Not** converted to 7-decimal base units. Conversion happens at submit time. |
| `start`, `end`, `cliff` | the raw `datetime-local` strings | **Not** converted to Unix seconds. |
| `durationAmount`, `durationUnit` | duration shortcut amount and unit | Stored as typed or derived from End, keeping both controls in sync (see [create-form-validation.md](create-form-validation.md#duration-optional)). |
| — | no field for the sender | The connected account is not part of the draft. |

Only the public parameters of a stream you are about to create are written. No
key, signature, or session token is ever stored, and the draft is never sent to
the backend — it stays in this browser.

Two consequences worth knowing:

- **A draft is per browser and per origin, not per account or network.** A draft
  typed while account A was connected is restored while account B is connected,
  and it is not namespaced by `NEXT_PUBLIC_NETWORK`. `localhost:3000` and a
  deployed build keep separate drafts.
- **`localStorage` is not encrypted** and is readable by any script running on
  this origin. The contents are public stream parameters, but treat the key as
  visible rather than private.

---

## 2. When a draft is saved

A `useEffect` in `useCreateStreamForm` (`hooks/use-create-stream-form.ts`) runs on
mount and again whenever any of the eight field values changes, rewriting the
whole object from the current values.

- **Every change is written immediately.** There is no debounce and no save
  button; the key is up to date as of the last keystroke.
- **Only if at least one field is non-empty.** Whitespace does not count, and
  `durationUnit` doesn't either — its `<select>` always holds a value, so alone
  it is never "something was entered". When every other field is blank or
  whitespace-only, the key is *removed* rather than written with empty strings.
- **The whole object is written each time**, so a field you clear in the UI is
  also cleared in storage.
- **Storage failures are swallowed.** If `localStorage` throws — private
  browsing, quota exceeded, storage disabled — the form keeps working and only
  the persistence is lost. Nothing is shown to the user.

---

## 3. When a draft is restored

The draft is read in the `useState` initialiser, so it is applied on **every
mount of the create page**:

- the first visit in a new tab,
- a reload (F5) of `/create`,
- navigating back to `/create` from the dashboard or a stream page (including
  the browser's back button),
- closing the tab and reopening it later,
- a crash or a lost connection followed by a reload.

Restored values are **not re-validated on load**. The error state starts empty,
so a stale draft lands on screen without field messages; they reappear when you
edit that field or press "Review stream". The live previews (duration and
vesting rate) *do* appear straight away, because they are computed from the
restored values.

The draft is restored regardless of which wallet is connected, but the form is
still only usable once a wallet is connected — until then it shows "Connect your
wallet to create a stream."

There is exactly one draft per origin. Two create tabs open side by side do not
stay in sync: each holds its own copy, and the last keystroke in either tab
overwrites the stored object (nothing listens for the `storage` event).

---

## 4. How a draft is discarded

| Trigger | What happens |
|---|---|
| A stream is created successfully | `handleConfirm` calls `clearFormDraft()` and then redirects to the dashboard, so the next visit to `/create` is empty. |
| A timed-out create is recovered and confirms | `handleRecoverTimeout` also calls `clearFormDraft()` before redirecting. |
| You empty every field in the form | The save effect in section 2 sees no non-whitespace value and removes the key. |
| You want to be rid of it right now | Clear the six inputs, or remove the key by hand — see below. |

There is **no explicit "Discard draft" control** in the UI; the form's only
controls are the six inputs and "Review stream". Clearing the fields is the
in-app way to discard a draft, and removing the key is the out-of-band way:

```js
// devtools console, or any script on this origin
localStorage.removeItem("tricklepay-create-form-draft");
```

Two things that deliberately **do not** discard the draft:

- **A failed or timed-out create.** The draft survives so you can fix one field
  and try again.
- **Navigating away.** The "unsaved changes" browser warning is a separate
  mechanism (`useFormNavigationWarning`): it arms on `beforeunload` — reload or
  tab close — while any field is non-empty or the review step is open, and it
  never reads or writes storage. Because the draft is what you come back to, the
  warning is conservative rather than a promise that the work is lost.

---

## 5. Edge cases

- **Unreadable storage.** If the stored value is not valid JSON, `readFormDraft`
  returns `null` and the form opens empty — no error is shown. Missing keys in an
  otherwise valid object default to `""` (`durationUnit` defaults to `"days"`,
  since its `<select>` always has a value); unknown extra keys are ignored.
- **Whitespace-only input is treated as empty**, so a form where you typed only
  spaces is not saved.
- **A restored draft can be invalid.** An address that has since gone stale, or an
  amount with eight decimals, comes back as typed. Nothing is submitted until the
  rules in [create-form-validation.md](create-form-validation.md) pass again, and
  "Review stream" stays disabled until both addresses are valid.
- **Clearing whitespace does not clear storage on its own.** The key is only
  removed once *every* field is blank, so a draft with one field still filled is
  kept.

---

## Related documentation

- [create-form-validation.md](create-form-validation.md) — the rules a restored
  draft has to pass again before anything is submitted.
- [timeout-recovery.md](timeout-recovery.md) — why a create that timed out keeps
  its draft, and how to find out whether the transaction landed.
- [api-contract.md](api-contract.md#2-on-chain-contract-surface) — what the
  restored values are eventually converted into.
- [`lib/create-form-draft.ts`](../lib/create-form-draft.ts) — the storage
  functions themselves.
