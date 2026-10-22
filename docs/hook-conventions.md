# Hook conventions

This document describes the conventions the hooks in `hooks/` follow. Read it
alongside [component-conventions.md](component-conventions.md), which covers the
boundary between the two layers; this one is about the shape of a hook itself.

## The core shape: state plus actions, never setters

A hook that owns state returns a **single plain object** holding the values a
component needs to render and the functions that change them. It does **not**
hand the component its `setState` functions. A component can read the state and
invoke an action; it cannot reach in and mutate the hook's internals, so the
hook stays the single owner of how that state changes.

`useStreamActions` is the fullest example — it exposes the withdrawable balance,
the in-flight flag, the transaction stage, the timeout hash, the amount field and
its error, and the cancel-confirmation flag, alongside the actions that change
them (`changeAmount`, `runWithdraw`, `runCancel`, `recoverTimeout`, …):

```ts
// hooks/use-stream-actions.ts
export interface StreamActionsState {
  withdrawable: bigint;
  busy: "withdraw" | "cancel" | null;
  stage: TxStage | null;
  timeoutHash: string | null;
  error: string | null;
  // …
  runWithdraw: () => Promise<void>;
  recoverTimeout: () => Promise<void>;
  // …
}

export function useStreamActions(
  stream: StreamView,
  walletAddress: string | null,
  onComplete: () => void,
): StreamActionsState {
  // …owns the state, the async work, and the transactions…
  return { withdrawable, busy, stage, timeoutHash, error, /* … */ runWithdraw, /* … */ };
}
```

The component that consumes it (`StreamActions`) destructures the object, renders
the values, and wires the actions to buttons. It holds none of that state itself.

A hook does not have to return an object. It only has to avoid leaking setters:

- **Object of state + actions** — `useStreamActions`, `useCreateStreamForm`,
  `useStreamPage` (the workhorses).
- **A derived value** — `useAccrual` returns `Accrual` (`{ vested, withdrawable }`),
  `useNetworkGuard` returns `NetworkGuard` (`{ mismatch, walletNetwork, expectedNetwork }`).
  Read-only, nothing to set.
- **A bare value** — `useNow` returns a `number` (a ticking clock).
- **`void` for a pure side effect** — `useFormNavigationWarning` and
  `useStreamTitle` exist only for what they do (register a listener, set the
  document title); they expose no state at all.

## When logic belongs in a hook rather than a component

Reach for a hook when the logic is **stateful, asynchronous, or tied to the
environment** — anything that should not be re-derived (or cannot be re-derived)
on every render:

- It fetches from the backend or the chain, or runs a write transaction
  (`useStreamPage`, `useCreateStreamForm`, `useStreamActions`).
- It owns a value that changes over time — a ticking accrual, a relative-time
  label (`useAccrual`, `useNow`).
- It talks to the browser or the DOM: a `beforeunload` guard, the document title,
  a visibility listener (`useFormNavigationWarning`, `useStreamTitle`).
- It is needed by more than one component, so it must not be duplicated.

Keep it in the **component** when the logic is purely presentational — deciding
what to render, laying out a card, formatting a label for display.

Keep it in **`lib/`** when the logic is a pure function with no React at all. A
hook should orchestrate; the rules it applies should be plain, independently
testable functions. The create form is the model: `lib/create-stream-validation.ts`
holds every message and rule, `lib/create-stream-submission.ts` holds the
transaction call, and `useCreateStreamForm` is the thin React layer that wires
state to those two. The same split keeps the logic testable without mounting a
component.

The tie-breaker: **if a component starts growing its own `useState`/`useEffect`
to hold data it fetched, that data belongs in a hook named after the component**
— `StreamActions` → `useStreamActions`, `CreateForm` → `useCreateStreamForm`.

## Naming and file layout

- One hook per file, file named after the export: `useAccrual` lives in
  `hooks/use-accrual.ts`.
- File name, export name, and the prefix all use the same kebab/camel pair.
- A hook is named for **what it owns**, not for the component that happens to
  use it first (`useStreamPage`, not `useIncomingStreams`) — several call sites
  share each of them.

## Return an annotated, named type

Every hook that returns more than a bare value declares an exported `interface`
(or `type`) for its return, right next to the hook, and annotates the function's
return type with it. This documents the shape at the definition and gives call
sites a real type instead of an inferred one.

```ts
// hooks/use-stream-page.ts
export interface StreamPage {
  streams: StreamView[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useStreamPage(
  role: StreamRole,
  address: string | null,
  status: StreamStatus | "all" = "all",
): StreamPage { /* … */ }
```

## Derive during render; tick only when you must

If a value is a pure function of the hook's own state and props, **compute it in
the body of the hook and return it** — do not mirror it into extra state fed by
an effect. This avoids a render where the derived value is stale, and avoids the
effect entirely:

- `useStreamPage` returns `hasMore: fetched < total` as a plain expression.
- `useCreateStreamForm` returns `previewRate`, `previewDuration`, and
  `addressesValid` as expressions over its `values`/`errors` state.

Only a value that changes with **time or the network** justifies a tick or a
fetch, and then the tick/fetch *is* the hook's job (`useAccrual`'s one-second
interval, `useStreamPage`'s polling and auto-refresh, `useNow`'s interval).

## Every effect cleans up after itself

Any interval, event listener, or subscription a hook registers must be torn down
when the effect re-runs or the component unmounts — return a cleanup function
from the `useEffect`. A hook that leaves a listener or timer behind keeps it
running after unmount and can write state into a dead tree.

- `useAccrual` returns `() => clearInterval(id)` and only starts the interval for
  streaming streams.
- `useStreamPage` removes its `focus` and `visibilitychange` listeners, clears
  its refresh interval, and aborts in-flight requests on cleanup.
- `useFormNavigationWarning` removes the `beforeunload` listener; `useStreamTitle`
  removes its `visibilitychange` listener and restores the previous document title.

## Keep hooks parameterised and reusable

A hook takes everything it needs as arguments and keeps no cross-call shared
state, so two calls in the same tree are independent. The dashboard relies on
this: it calls `useStreamPage` twice — once for incoming, once for outgoing — and
the two lists page, refresh, and error independently. `useAccrual(stream)` and
`useStreamActions(stream, walletAddress, onComplete)` are parameterised the same
way. A hook that needs to share genuinely global state belongs behind a context
provider, as the wallet and theme do.

## "use client"

Every file in `hooks/` begins with `"use client"`. Hooks use `useState`,
`useEffect`, or `useContext`, so they always need it.

## Testing a hook

Hooks are tested directly, without a component tree, by rendering them inside a
tiny `createRoot` harness with `act` (see `hooks/use-now.test.tsx`,
`hooks/use-stream-actions.test.tsx`). For a hook whose value is really a pure
computation, test the underlying `lib/` function it delegates to instead of
mounting React at all (`hooks/use-accrual.test.ts` exercises the vesting math in
`lib/vesting.ts` — the same path `useAccrual` takes). Match whichever is being
asserted: the hook's wiring, or the rule it calls.

## Checklist for a new hook

- [ ] One hook per file, named after what it owns, in `hooks/`.
- [ ] Starts with `"use client"`.
- [ ] Returns state + actions — never a raw setter.
- [ ] The return type is an exported, annotated `interface`/`type`.
- [ ] Async / time-based values are the hook's job; purely derived values are
      computed in the body, not mirrored into state.
- [ ] Every effect that registers something returns a cleanup.
- [ ] Takes its inputs as arguments and shares no state across calls.
- [ ] Has a sibling `*.test.ts(x)` covering its wiring or its delegated rule.
- [ ] Any rule or message it applies lives in `lib/`, not inline in the hook.
