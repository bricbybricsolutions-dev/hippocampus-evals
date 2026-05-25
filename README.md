# hippocampus-evals

Public benchmark artifacts and scoring script for the Hippocampus
Wikipedia 44-fact eval. The point of this repository is to make every
number we cite about that benchmark independently inspectable.

> If you're reading this from the blog post: every headline number in
> the post is either listed in [`results/summary.json`](results/summary.json)
> or is derivable by running [`scripts/score.ts`](scripts/score.ts)
> against one of the JSONLs in [`results/`](results/). If you find a
> number in the post that doesn't anchor to one of those, please open
> an issue.

## What this repository is

A self-contained evaluation harness containing:

- **The dataset** ([`data/wikipedia-44/`](data/wikipedia-44/)) — 44
  temporal-fact questions drawn from 25 English Wikipedia articles,
  with the Wikipedia revision IDs that supplied each ground-truth
  value. License: CC-BY-SA-4.0 (matches Wikipedia).
- **The results** ([`results/`](results/)) — per-row JSONLs for the
  four systems evaluated (Hippocampus, Hippocampus + OPEN-6,
  MiniLM-filtered, BM25-TFIDF), plus a `summary.json` of the headline
  metrics.
- **The scorer** ([`scripts/score.ts`](scripts/score.ts)) — a small
  TypeScript program that reads any result JSONL and prints / writes
  the same metrics that appear in `summary.json`. Single source of
  truth for "how a result file becomes a headline number." License:
  Apache-2.0.
- **The docs** — six markdown files that explain the methodology, the
  failure analysis, and what we are explicitly *not* claiming. See the
  table of contents below.

## What this repository is *not*

This is **not** the production Hippocampus engine. The retrieval
ranking logic, the resolver implementation, the schema-cortex
construction, and the alias-map tuning code all live in a separate
private repository and are not in this repo. What you have here are
the *audited outputs* of running that engine on the 44-fact corpus —
not a runnable reproduction of the engine itself.

If you want to re-run the engine, you would need access to the
production code. If you want to verify that the headline numbers in
the blog post match the per-row data that was used to compute them,
that is exactly what `scripts/score.ts` does, and it does not need
the engine.

## Quick start

Requires Node.js ≥ 20. Install once:

```bash
npm install
```

Then score any result file:

```bash
npx tsx scripts/score.ts results/hippocampus.jsonl
```

Or rebuild `results/summary.json` from all four JSONLs:

```bash
npx tsx scripts/score.ts --write-summary
```

Full reproduction recipe — including the exact gate values the build
script is required to produce — is in [`REPRODUCE.md`](REPRODUCE.md).

## Headline result

| System                        | Contradiction-free | Mean tokens to LLM |
| ----------------------------- | ------------------ | ------------------ |
| Hippocampus (canonical)       | **36/44 (81.82%)** | **11.55**          |
| Hippocampus + OPEN-6          | **37/44 (84.09%)** | 12.18              |
| MiniLM-filtered(2024)         | 33/44 (75.00%)     | 121.48             |
| BM25-TFIDF                    | 14/44 (31.82%)     | 495.25             |

Token-efficiency ratio versus the strongest baseline (MiniLM-filtered):

- Hippocampus canonical: **10.52×** fewer tokens to the LLM.
- Hippocampus + OPEN-6: 9.97× (OPEN-6 trades a small token bump for
  +1 correct answer; see [`METHODOLOGY.md`](METHODOLOGY.md)).

All four numbers in the table and both ratios are derivable by running
`scripts/score.ts` on the corresponding JSONL in `results/`. The
non-list-tail slice, the list-tail slice, the per-system accuracy, and
the failure-category breakdown live in `results/summary.json` and in
[`FAILURES.md`](FAILURES.md).

## Documentation

- [`BENCHMARK.md`](BENCHMARK.md) — dataset description, systems
  compared, scoring definition, slicing rules.
- [`METHODOLOGY.md`](METHODOLOGY.md) — pre-committed falsifiers,
  necessity ablations, how we handled surprises and regressions.
- [`FAILURES.md`](FAILURES.md) — the 8 Hippocampus-failure facts by
  name, the four-category taxonomy, and per-fact derivation back to
  the source artifacts.
- [`LIMITATIONS.md`](LIMITATIONS.md) — what we are *not* claiming.
  Read this before quoting any number from the blog post.
- [`REPRODUCE.md`](REPRODUCE.md) — exact commands from clone to
  scored output. Includes the verification gate (the four numbers
  the scorer is required to produce on a clean checkout).

## License

The code, scripts, and documentation in this repository are licensed
under Apache-2.0 (see [`LICENSE`](LICENSE)). The dataset in
[`data/wikipedia-44/`](data/wikipedia-44/) is licensed separately
under CC-BY-SA-4.0 (see [`data/wikipedia-44/LICENSE`](data/wikipedia-44/LICENSE)).
The split is required by the source attribution: Wikipedia content
itself carries CC-BY-SA-4.0, and a derived dataset must inherit that
license. The Apache-2.0 license on the code is independent and lets
downstream users reuse the scorer without inheriting share-alike
obligations on their own code.

## Related repository

The production Hippocampus engine lives in a separate, currently
private repository. If you are evaluating Hippocampus for a use case
and want access to the engine, contact us.
