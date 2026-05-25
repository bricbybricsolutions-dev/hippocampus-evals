# FAILURES.md

The 7 facts where the headline Hippocampus run returns a
non-contradiction-free answer, named individually, categorized, and
traced back to the source artifacts.

This document exists because publishing a failure analysis is the
honest version of publishing the headline. Most retrieval papers
report aggregate accuracy and leave the failure cases as an exercise
for the skeptic. We do not. The failed rows are listed below by name,
and fixing any one of them is a known piece of work with a known cost.

## The 7 Hippocampus-failing facts

These are the facts where `contradiction_free=0` in
`results/hippocampus.jsonl`, the headline Hippocampus artifact.

| # | Fact ID                                  | Failure category       | Notes |
|---|------------------------------------------|------------------------|-------|
| 1 | `Abdelmadjid_Tebboune-primeminister`     | `out-of-scope`         | Answer is present, but not contradiction-free |
| 2 | `Air_Products-num_employees`             | role-expansion regression | Ranking shifted to a stale employee-count cell |
| 3 | `Alexander_Van_der_Bellen-citizenship`   | `atom-coverage-gap`    | List-tail temporal citizenship fact |
| 4 | `Bajram_Begaj-predecessor`               | `lexical-seeding-gap`  | Succession phrasing misses the indexed role token |
| 5 | `Hamad_bin_Isa_Al_Khalifa-regent`        | `out-of-scope`         | Every tested system fails contradiction-free |
| 6 | `Javier_Milei-office`                    | `out-of-scope`         | Every tested system fails contradiction-free |
| 7 | `Vahagn_Khachaturyan-successor1`         | `out-of-scope`         | Every tested system fails contradiction-free |

The earlier baseline artifact, `results/hippocampus-baseline.jsonl`, had 8
contradiction-free failures. The role-token expansion closed
`João_Lourenço-birth_place` and
`Mohammed_Shahabuddin-honorific_prefix`, but introduced the
`Air_Products-num_employees` regression. Net effect: 37/44
contradiction-free instead of 36/44.

## Failure categories

### `lexical-seeding-gap` (1 headline fact)

The query's English vocabulary does not share any token with the
canonical infobox parameter name that Hippocampus stores in the cell.
The lexical encoder is token-based; if no token overlaps, no cell is
seeded, and downstream temporal-disambiguation logic cannot help.

The remaining headline case is `Bajram_Begaj-predecessor`. It should
close via a regex extension to role detection covering phrasing such
as "who did X succeed", "preceded by", and similar forms.

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

1. **The 7-fact set.** Read every row of
   `results/hippocampus.jsonl`, filter
   `contradiction_free == 0`, and count the result. You can reproduce
   the count with:

   ```bash
   npx tsx scripts/score.ts results/hippocampus.jsonl
   ```

2. **The earlier baseline set.** Read every row of
   `results/hippocampus-baseline.jsonl` and filter `contradiction_free == 0`.
   That artifact has 8 failed rows and is retained so readers can see
   which facts changed.

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

## What fixing the remaining 7 looks like

The 4 `out-of-scope` facts require either a different corpus
selection or a mechanism that no retrieval system in this bench
currently has.

The 3 Hippocampus-specific fixes are:

- `Bajram_Begaj-predecessor`: extend role detection for succession
  phrasing.
- `Alexander_Van_der_Bellen-citizenship`: expand schema-cortex atom
  coverage for list-tail temporal citizenship.
- `Air_Products-num_employees`: fix the ranking path that lets the
  role-expanded query prefer a stale employee-count cell.
