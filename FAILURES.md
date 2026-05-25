# FAILURES.md

The 6 facts where the headline Hippocampus run returns a
non-contradiction-free answer, named individually, categorized, and
traced back to the source artifacts.

This document exists because publishing a failure analysis is the
honest version of publishing the headline. Most retrieval papers
report aggregate accuracy and leave the failure cases as an exercise
for the skeptic. We do not. The failed rows are listed below by name,
and fixing any one of them is a known piece of work with a known cost.

## The 6 Hippocampus-failing facts

These are the facts where `contradiction_free=0` in
`results/hippocampus.jsonl`, the headline Hippocampus artifact.

| # | Fact ID                                  | Failure category       | Notes |
|---|------------------------------------------|------------------------|-------|
| 1 | `Abdelmadjid_Tebboune-primeminister`     | `out-of-scope`         | Every tested system fails contradiction-free |
| 2 | `Air_Products-num_employees`             | role-expansion regression | Ranking shifted to a stale employee-count cell |
| 3 | `Alexander_Van_der_Bellen-citizenship`   | `atom-coverage-gap`    | List-tail temporal citizenship fact |
| 4 | `Hamad_bin_Isa_Al_Khalifa-regent`        | `out-of-scope`         | Every tested system fails contradiction-free |
| 5 | `Javier_Milei-office`                    | `out-of-scope`         | Every tested system fails contradiction-free |
| 6 | `Vahagn_Khachaturyan-successor1`         | `out-of-scope`         | Every tested system fails contradiction-free |

`Bajram_Begaj-predecessor` was on this list in the prior headline
artifact (`results/hippocampus-open6.jsonl`, 37/44). It now passes —
closed by the past-tense `succeed` regex extension landed on
`primitive/code-hippo/prodV1` (commit `3d349af`, documented as §7.21 in
the production project guide). The new alias matches the past-tense
bare-infinitive form "did X succeed" and routes the lexical seed to
the `predecessor` cell; necessity ablation reverts Bajram to CF=0
cleanly. Per-fact zero-regression bar held (strict, not net) — the
mechanism touches only the Bajram query across the 44-fact corpus.

The earlier baseline artifact, `results/hippocampus-baseline.jsonl`, had 8
contradiction-free failures. The role-token expansion closed
`João_Lourenço-birth_place` and
`Mohammed_Shahabuddin-honorific_prefix`, but introduced the
`Air_Products-num_employees` regression — net 37/44 (preserved in
`results/hippocampus-open6.jsonl` for audit). The past-tense `succeed`
extension closed `Bajram_Begaj-predecessor` on top of that — net
**38/44**.

## Failure categories

### `lexical-seeding-gap` (0 headline facts)

The query's English vocabulary does not share any token with the
canonical infobox parameter name that Hippocampus stores in the cell.
The lexical encoder is token-based; if no token overlaps, no cell is
seeded, and downstream temporal-disambiguation logic cannot help.

The two original `lexical-seeding-gap` facts — `João_Lourenço-birth_place`
and `Bajram_Begaj-predecessor` — both close under the headline artifact.
Lourenço closed via OPEN-6 phase 1's role-token expansion in the
`birth_place` alias; Bajram closed via the §7.21 past-tense `succeed`
extension. The mechanism in both cases is the same: append the
canonical `fact_type` token to the lexical seed cue when the parser
detects a known role pattern in the query.

The category is preserved in the taxonomy because the underlying
retrieval defeat is real and corpus-dependent — a new corpus with
different verb conjugations or property names could surface new
`lexical-seeding-gap` facts that the current alias map does not cover.

### `atom-coverage-gap` (1 headline fact)

The query parser identifies the container and role, and the bridge
fires, but no atom is indexed in the schema cortex for that
container-role pair. The remaining headline case is
`Alexander_Van_der_Bellen-citizenship`, a list-tail fact with an
at-birth temporal operator.

Fixing it requires schema-cortex expansion: index more atoms during
ingest, either through a broader static set of role-anchor patterns
or through learned corpus-specific acquisition.

### `out-of-scope` (4 headline facts)

A fact is `out-of-scope` if `contradiction_free=0` for every system
tested: Hippocampus, BM25-TFIDF, MiniLM-unfiltered, and
MiniLM-filtered(2024). The interpretation is that the question is
structurally unanswerable from the 44-fact corpus as prepared. This
is not a Hippocampus-specific deficiency; we list it here for
honesty rather than exclude it from the denominator.

The 4 facts are `Abdelmadjid_Tebboune-primeminister`,
`Hamad_bin_Isa_Al_Khalifa-regent`, `Javier_Milei-office`, and
`Vahagn_Khachaturyan-successor1`.

### Role-expansion regression (1 headline fact)

`Air_Products-num_employees` passed in the earlier baseline artifact
and failed in the headline artifact. With `num_employees` appended to
the query string, ranking shifted and a stale value won. This is a
real regression, and it is why the methodology labels the mechanism
GREEN on net metric but YELLOW on regression safety.

## Derivation manifest

1. **The 6-fact set.** Read every row of
   `results/hippocampus.jsonl`, filter
   `contradiction_free == 0`, and count the result. You can reproduce
   the count with:

   ```bash
   npx tsx scripts/score.ts results/hippocampus.jsonl
   ```

2. **The earlier baseline set.** Read every row of
   `results/hippocampus-baseline.jsonl` and filter `contradiction_free == 0`.
   That artifact has 8 failed rows (the original canonical run at
   `a00e8f8`) and is retained so readers can see which facts changed
   under the role-token expansion. The intermediate artifact
   `results/hippocampus-open6.jsonl` (7 failures, 37/44) shows the
   state after OPEN-6 phase 1 but before the §7.21 past-tense extension.

3. **The `out-of-scope` set.** For each failed fact, check the
   `contradiction_free` field in `results/bm25.jsonl`,
   `results/minilm-filtered.jsonl`, and, in the source bundle the
   results were filtered from, the MiniLM-unfiltered row. A fact is
   `out-of-scope` only when every system has
   `contradiction_free == 0` for that ID.

4. **Per-fact assignment.** The `failure_category` field in the JSONL
   artifacts reflects the source build mapping. The Air Products row
   has `failure_category: null` because it is a regression introduced
   by the role-token expansion rather than one of the original
   baseline failure buckets.

## What fixing the remaining 6 looks like

The 4 `out-of-scope` facts require either a different corpus
selection or a mechanism that no retrieval system in this bench
currently has.

The 2 remaining Hippocampus-specific fixes are:

- `Alexander_Van_der_Bellen-citizenship`: expand schema-cortex atom
  coverage for list-tail temporal citizenship. Also requires an
  `at_birth` temporal-operator implementation in the resolver
  (the query's temporal classifier already extracts `at_birth`,
  but the bridge precondition rejects anything other than `current`).
- `Air_Products-num_employees`: fix the ranking path that lets the
  role-expanded query prefer a stale employee-count cell. The
  `--pt2qm` (Pass-2 query-word tiebreak) fix on `primitive/code-hippo/prodV1`
  closes this in the source repo, but is not yet enabled in the
  headline artifact in this evals repo — a separate productization
  decision.
