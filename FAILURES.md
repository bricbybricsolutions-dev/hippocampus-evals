# FAILURES.md

The 8 facts where Hippocampus returns a non-contradiction-free answer,
named individually, categorized into 4 buckets, and with the
derivation traced back to the source artifacts.

This document exists because publishing a failure analysis is the
honest version of publishing the headline. Most retrieval papers
report aggregate accuracy and leave the failure cases as an exercise
for the skeptic. We will not — the 8 are listed below by name, and
fixing any one of them is a known piece of work with a known cost.

## The 8 Hippocampus-failing facts (canonical run, `a00e8f8`)

These are the facts where `contradiction_free=0` in
`results/hippocampus.jsonl`. The set is **deterministic** — across
N=10 trials on the canonical configuration the same 8 facts fail
every run, with zero facts flipping between runs (PROJECT-GUIDE.md
§11.5.8 in the production repo, stdev=0.0000).

| # | Fact ID                                  | Failure category       | Status under OPEN-6 |
|---|------------------------------------------|------------------------|---------------------|
| 1 | `Abdelmadjid_Tebboune-primeminister`     | `out-of-scope`         | Still fails (every system fails) |
| 2 | `Alexander_Van_der_Bellen-citizenship`   | `atom-coverage-gap`    | Still fails         |
| 3 | `Bajram_Begaj-predecessor`               | `lexical-seeding-gap`  | Still fails         |
| 4 | `Hamad_bin_Isa_Al_Khalifa-regent`        | `out-of-scope`         | Still fails (every system fails) |
| 5 | `Javier_Milei-office`                    | `out-of-scope`         | Still fails (every system fails) |
| 6 | `João_Lourenço-birth_place`              | `lexical-seeding-gap`  | **Closed by OPEN-6** |
| 7 | `Mohammed_Shahabuddin-honorific_prefix`  | `atom-coverage-gap`    | **Closed by OPEN-6** (unpredicted bonus — see METHODOLOGY.md) |
| 8 | `Vahagn_Khachaturyan-successor1`         | `out-of-scope`         | Still fails (every system fails) |

After OPEN-6: 6 still fail (2 closed). The 4 `out-of-scope` failures
remain — they are not Hippocampus-specific.

## The four failure categories

### `lexical-seeding-gap` (2 facts)

The query's English vocabulary does not share any token with the
canonical infobox parameter name that Hippocampus stores in the cell.
The lexical encoder is token-based; if no token overlaps, no cell is
seeded, and downstream temporal-disambiguation logic cannot help —
the right cell was never reached.

> **What fixing it costs.** This is exactly what OPEN-6 fixes for one
> class of these (the `birth_place` family — the query says "born",
> the cell says "birth_place"). The fix is a small deterministic
> regex that maps known English vocabulary to canonical fact_type
> tokens at recall time. It closes 2 of the 8 failures (Lourenço and
> Shahabuddin) at the cost of one regression (Air_Products), net +1.
> Extending the regex to cover "succeed" / "succeeded" / "preceded
> by" would close Bajram_Begaj-predecessor on the same mechanism.

### `atom-coverage-gap` (2 facts)

The query parser correctly identifies the container (e.g. country,
office) and the role (e.g. `honorific_prefix`), and the bridge fires —
but no atom is indexed in the schema cortex for that (container, role)
pair. The mechanism is present; the data isn't.

> **What fixing it costs.** Schema-cortex expansion: index more atoms
> during ingest. Either by extending the static set of role-anchor
> patterns, or by learning them from the corpus at index time. The
> work is well-scoped but is in a separate research thread (§OPEN-9
> in the production docs) and was not in scope for the published
> result.

### `entity-slot-gap` (0 facts after empirical reassignment)

Originally we expected several facts to fall here — the structural
mismatch where the query names a country or office and the cell is
keyed on the office-holder's name. These cases are the OPEN-7 thread
in the production docs (closes via "atom-bridge" retrieval, not
lexical fallback).

After cross-system inspection (see below) all four facts we initially
classified here turned out to be `out-of-scope` — i.e. *no* system on
the bench answers them. That makes the failure mode a corpus-level
defeat rather than a Hippocampus-level one. We have left
`entity-slot-gap` in the taxonomy as a defined category because the
underlying retrieval defeat is real, but on this 44-fact corpus no
fact lives under that label in `results/hippocampus.jsonl`.

### `out-of-scope` (4 facts)

A fact is `out-of-scope` if `contradiction_free=0` for **every**
system tested (Hippocampus, BM25-TFIDF, MiniLM-unfiltered,
MiniLM-filtered(2024)) in the canonical run. The interpretation: the
question is structurally unanswerable from the 44-fact corpus as we
prepared it. This is not a Hippocampus-specific failure; we list it
here for honesty, not as a Hippocampus deficiency.

The 4 facts: `Abdelmadjid_Tebboune-primeminister`,
`Hamad_bin_Isa_Al_Khalifa-regent`, `Javier_Milei-office`,
`Vahagn_Khachaturyan-successor1`. All four are entity-slot-shaped
queries where the question names the country / office and the answer
is the office-holder. The lexical-overlap baselines have no path to
those cells, and the MiniLM-filtered dense retrieval also doesn't
recover them on this corpus.

## Derivation manifest

Every category assignment above is traceable to a specific section of
the project's internal documentation **and** to a specific row in a
specific JSONL. The derivation rules are:

1. **The 8-fact set.** Read every row of `results/hippocampus.jsonl`,
   filter `contradiction_free == 0`. The result is exactly the 8
   listed above. This is reproducible: any reader can run
   `npx tsx scripts/score.ts results/hippocampus.jsonl` and count
   8 rows where `contradiction_free` is 0.

2. **The `out-of-scope` set.** For each fact ID in the 8, check the
   `contradiction_free` field in `results/bm25.jsonl`,
   `results/minilm-filtered.jsonl`, and — in the source bundle the
   results were filtered from — the MiniLM-unfiltered row. A fact is
   `out-of-scope` if and only if every system has
   `contradiction_free == 0` for that ID. This gave us the four
   listed above.

3. **`lexical-seeding-gap` vs `atom-coverage-gap`.** Source:
   §6125 + §7.18.3 of the project guide on the production repository.
   The §6125 table enumerates the failure modes by query shape and
   maps each to one of the categories above. Specifically:

   - `birth_place` queries → `lexical-seeding-gap` (the canonical
     parameter name is `birth_place`, the query word is "born").
     This category was the load-bearing prediction of §6119 (commit
     `882ccff` on the internal docs branch). Closes via OPEN-6.
   - `predecessor` / `successor` queries → `lexical-seeding-gap` for
     the cases where `detectRole` would resolve the role if the regex
     were extended; `entity-slot-gap` for the cases where the query
     names a country and not a person.
   - `honorific_prefix` query with container parsed but no atom →
     `atom-coverage-gap`. Lexical fallback recovered Shahabuddin
     under OPEN-6 anyway; the category still applies, because the
     mechanism that was *expected* to fix it (schema-cortex
     atom-coverage extension) is the one still owed.

4. **Per-fact assignment.** Hard-coded in the build script
   (`.evals-build.py` in the source repo, not committed here) and
   reflected in the `failure_category` field of every row in
   `results/hippocampus.jsonl`. The mapping prior was derived from
   §6119 and §6125; the empirical cross-system check (rule 2)
   overrode the prior for `Tebboune`, `Hamad_bin_Isa`, and
   `Khachaturyan` (we expected these to be `entity-slot-gap` but
   they fail across all systems, so the empirical signal makes them
   `out-of-scope`). One disagreement went the other way —
   `Alexander_Van_der_Bellen-citizenship` was hypothesized
   `out-of-scope` but is empirically answered by at least one
   baseline, so we reassigned it to `atom-coverage-gap` per §6125's
   nearest-match rule. Both deviations are surfaced rather than
   silently applied.

## What fixing the remaining 6 looks like

The 4 `out-of-scope` facts are not Hippocampus-fixable in isolation —
fixing them requires either a different corpus selection or a
mechanism that no retrieval system in our bench currently has. We
report them honestly rather than excluding them from the denominator.

The 2 remaining Hippocampus-specific failures after OPEN-6:

- **`Bajram_Begaj-predecessor`** (`lexical-seeding-gap`) — closes via
  a regex extension to `detectRole` covering "who did X succeed",
  "preceded by", and similar phrasings. Estimated work: small. Not
  yet implemented because the load-bearing prediction was
  `birth_place` and we did not want to bundle extensions into the
  same falsifier window.
- **`Alexander_Van_der_Bellen-citizenship`** (`atom-coverage-gap`) —
  list-tail fact with an at-birth temporal operator. The
  schema-cortex atom for `(Austria, citizenship-at-birth)` does not
  exist in the current cortex build. Closes via OPEN-9 schema
  acquisition work (separate research thread).

## A note on the count

The blog post may quote the "8 always-failing facts" as a headline
number. That is correct for the canonical run. After OPEN-6, the
8 becomes 6 (Lourenço and Shahabuddin close); after the
hypothetical regex extension and the OPEN-9 schema work, the 6 would
become 4 (the four `out-of-scope` facts, which neither OPEN-6 nor
OPEN-9 can address). We are not publishing the latter as a result —
this is a roadmap statement, not a measured number.
