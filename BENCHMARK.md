# BENCHMARK.md

What the benchmark measures, how it is scored, and what shape the data
takes. This document is descriptive — methodology choices (pre-committed
falsifiers, ablations, surprise handling) live in
[`METHODOLOGY.md`](METHODOLOGY.md).

## The dataset: Wikipedia 44-fact

A frozen snapshot of 44 fact-changes drawn from 25 English Wikipedia
articles. Each fact records a property that changed at some point in
the article's revision history — for example, "the CEO of 3M was
Michael F. Roman, then became William M. Brown" — and asks the system
the natural-English form: *"What is the current CEO of 3M?"*

The ground truth is the **post-change** value, anchored to a specific
Wikipedia revision ID. The full schema, the cutoff date (2024-12-31),
and the per-fact provenance live in
[`data/wikipedia-44/README.md`](data/wikipedia-44/README.md).

The 44 split into two slices:

- **38 non-list-tail facts.** The changed value occupies a single,
  scalar infobox field (e.g. `ceo`, `birth_place`, `revenue`). This is
  the primary scoring slice in the blog post.
- **6 list-tail facts.** The changed value is one entry inside a
  multi-valued field (e.g. `citizenship`, `otherparty`). List-tail
  retrieval is a separate engineering problem from temporal
  disambiguation and is reported separately so the headline is not
  contaminated by it. See `summary.json` for the per-slice numbers.

## Systems compared

Three systems are evaluated on the same 44-fact corpus, with the same
question text and the same scoring rules. Two of the three are
baselines:

| System | Description |
|---|---|
| **Hippocampus** | The retrieval engine under evaluation, in its headline configuration (`bridge-config=full`, `m1-config=baseline`, role-token expansion enabled). Source commit: `06a4212` of the production repository. The earlier `a00e8f8` baseline artifact is retained for auditability, not treated as a separate public system. |
| **MiniLM-filtered(2024)** | Dense-vector retrieval using `sentence-transformers/all-MiniLM-L6-v2` embeddings, with a date-aware filter that scores `(2024)`-marked passages higher than older ones. This is the strongest off-the-shelf baseline we found for this corpus. |
| **BM25-TFIDF** | Classical lexical-overlap retrieval. Included as a non-neural baseline so the dense-retrieval contribution can be isolated from the lexical-overlap contribution. |

The MiniLM and BM25 baselines were both invoked from the same bench
harness that ran Hippocampus, against the same 44-fact question list,
so the comparison is apples-to-apples on the input side.

## Scoring definitions

Every row in every JSONL in `results/` has two binary verdict fields:

- **`answer_correct`** — Did the retrieved content contain the
  expected answer? This is the loose "system got the right answer
  somewhere" metric. It can be 1 even if the system also retrieved
  contradicting information.
- **`contradiction_free`** — Did the retrieved content contain the
  expected answer **and** *not* also contain a stale, contradicting
  value? This is the strict metric and the one we headline. A
  document-native RAG that retrieves the whole article will often
  score `answer_correct=1` and `contradiction_free=0`, because the
  article itself contains both the current and prior values.

The blog post's "10× token efficiency" claim is grounded in the
**contradiction-free** metric, not raw accuracy. The point of
Hippocampus is to return *just the answer-bearing unit*, not the whole
article — which is why the token cost differs by an order of
magnitude.

For Hippocampus, the headline metric is `contradiction_free`. The
earlier baseline artifact has `answer_correct == contradiction_free`
on every fact; the headline artifact records one case where the
answer is present but a stale contradicting value is also retrieved.
That distinction is why this repo reports both fields instead of raw
accuracy alone.

## Per-row JSONL schema

Every row in `results/*.jsonl` follows this schema:

```jsonc
{
  // identifiers
  "id":              "3M-ceo",           // {article_slug}-{fact_type}
  "article_slug":    "3M",
  "fact_type":       "ceo",
  "query":           "What is the current CEO of 3M?",
  "expected_answer": "William M. Brown",

  // verdicts (the load-bearing fields for scoring)
  "answer_correct":     0,               // 0 or 1
  "contradiction_free": 0,               // 0 or 1

  // efficiency metrics
  "tokens_to_llm":   8,                  // tokens of retrieved content
                                          // that would be passed to a downstream LLM
  "retrieved_units": 1,                  // number of distinct retrieval units returned

  // dataset slicing
  "list_tail":       0,                  // 0 = scalar field, 1 = multi-valued field

  // failure tagging (null when contradiction_free == 1)
  "failure_category": null,              // one of lexical-seeding-gap,
                                          //         atom-coverage-gap,
                                          //         entity-slot-gap,
                                          //         out-of-scope
                                          // See FAILURES.md for derivation.

  // raw model output not available in the source artifact
  "prediction":      null,               // see "Honest schema gaps" below

  // provenance — every row carries its run context
  "system":          "Hippocampus",
  "config":          "bridge-config=full m1-config=baseline (default)",
  "commit_hash":     "a00e8f8521c75902a5aa24ee4f892518a5b48dd4",
  "run_timestamp":   1779577299293
}
```

## Honest schema gaps

Two fields in the schema deserve called-out honesty:

1. **`prediction` is always `null`.** The scoring artifacts
   (the source JSONLs that this repository's `results/*.jsonl` are
   derived from) record the verdict — was the answer correct?
   contradiction-free? — but they do **not** record the raw text
   string the system returned. So we cannot honestly publish the
   `prediction` field, and we set it to null rather than fabricate it.
   The verdict bits are what was actually scored against, audited at
   the source commit. To independently audit a single row, re-run the
   engine at the cited `commit_hash`. We chose null + this disclosure
   over reconstructing the prediction text post-hoc, which would have
   been a different artifact than the one originally evaluated.

2. **`tokens_to_llm` and `retrieved_units` are null-free for
   Hippocampus and the BM25 / MiniLM baselines.** All four systems
   were instrumented to log these fields in the same harness, so the
   token cost comparison is direct. If we had needed to import an
   external baseline with a different pipeline (e.g. a hosted dense
   retrieval API), `tokens_to_llm` would have been set to `null` with
   a `note` field — but for this benchmark every row has a real
   integer.

## Why these four metrics

For every system × slice we report:

- `n` — sample count (44 overall, 38 non-list-tail, 6 list-tail).
- `accuracy` — mean of `answer_correct`.
- `contradiction_free` — mean of `contradiction_free`. **The
  headline metric.**
- `mean_units` — mean of `retrieved_units`.
- `mean_tokens` — mean of `tokens_to_llm`. **The token-cost metric.**

The combination of contradiction-free recall and mean tokens is the
load-bearing pair: a system that retrieves more units will tend to
score higher accuracy and lower contradiction-free (because more units
means more chances to surface a stale value alongside the current one),
while costing more tokens. Hippocampus's claim is that an SDR-encoded
substrate with temporal disambiguation can score high
contradiction-free *and* low tokens simultaneously.

## How `summary.json` is built

`scripts/score.ts --write-summary` reads the public JSONLs in `results/`,
computes the per-system / per-slice statistics, and writes
`results/summary.json`. The "single source of truth" property follows:
every number in `summary.json` is the output of one specific
arithmetic step on one specific JSONL. Run `scripts/score.ts <file>`
on any of them to see that step explicitly.

The verification gate that the build is required to produce, on a
clean checkout, is documented in [`REPRODUCE.md`](REPRODUCE.md).
