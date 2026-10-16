# Security Policy

TricklePay's security-critical logic — the streaming contract, fund custody,
and vesting math — lives in **tricklepay-contracts**, not in this repository.
Please report any vulnerability through that repository's security policy
rather than opening a public issue here.

If you believe you've found a vulnerability anywhere in TricklePay and are
unsure which repository it belongs to, report it through
**tricklepay-contracts** and the maintainers will route it appropriately.

## Scope for this repository

This repository is the Next.js web client. On its own it never holds funds or
private keys, but issues here can still affect user safety. In scope:

- **Wallet connection and signing** — anything that could get a transaction
  signed without informed user consent, or that misrepresents what a
  transaction will do before it's signed in Freighter.
- **Transaction construction** — building a stream creation, withdrawal, or
  cancellation transaction that targets the wrong contract, recipient, token,
  or amount.
- **Dependency vulnerabilities** — known-vulnerable packages in
  `package.json` with a realistic exploitation path in this client (e.g. an
  XSS sink, a malicious transitive script).
- **Client-side data handling** — exposure of data that should stay local
  (e.g. anything derived from the connected wallet) to third parties the user
  didn't intend.

Out of scope: the streaming contract's on-chain logic and the backend
indexer/API — report those to **tricklepay-contracts** and
**tricklepay-backend** respectively.

## Reporting a vulnerability

Do not open a public GitHub issue for a security report. Instead, report it
privately through the **tricklepay-contracts** repository's security policy
(use GitHub's "Report a vulnerability" action under its Security tab).
Include:

- A description of the issue and its potential impact.
- Steps to reproduce, or a minimal proof of concept.
- The affected URL, commit, or deployed version, if known.

We'll acknowledge reports as quickly as we can and follow up once the issue
has been assessed.
