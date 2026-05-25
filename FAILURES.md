# FAILURES.md

The 5 facts where the headline Hippocampus run returns a
non-contradiction-free answer, named individually, categorized, and
traced back to the source artifacts.

This document exists because publishing a failure analysis is the
honest version of publishing the headline. Most retrieval papers
report aggregate accuracy and leave the failure cases as an exercise
for the skeptic. We do not. The failed rows are listed below by name,
and fixing any one of them is a known piece of work with a known cost.

## The 5 Hippocampus-failing facts

These are the facts where `contradiction_free=0` in
`results/hippocampus.jsonl`, the headline Hippocampus artifact.

| # | Fact ID                                  | Failure category       | Notes |
|---|------------------------------------------|------------------------|-------|
| 1 | `Abdelmadjid_Tebboune-primeminister`     | `out-of-scope`         | Every tested system fails contradiction-free |
| 2 | `Alexander_Van_der_Bellen-citizenship`   | `atom-coverage-gap`    | List-tail temporal citizenship fact (needs at-birth temporal operator) |
| 3 | `Hamad_bin_Isa_Al_Khalifa-regent`        | `out-of-scope`         | Every tested system fails contradiction-free |
| 4 | `Javier_Milei-office`                    | `out-of-scope`         | Every tested system fails contradiction-free |
| 5 | `Vahagn_Khachaturyan-successor1`         | `out-of-scope`         | Every tested system fails contradiction-free |

`Bajram_Begaj-predecessor` was on this list before §7.22 closed it
via a past-tense `succeed` regex extension. `Air_Products-num_employees`
was on this list before §7.23 closed it via the pt2qm Pass-2
query-word tiebreak. Both wins are in
`results/hippocampus.jsonl` (the current headline, 39/44); the
audit trail preserves the prior states:

- `results/hippocampus-pt-succeed.jsonl` (38/44) — post-§7.22, pre-§7.23.
  Air_Products is still failing in this artifact.
- `results/hippocampus-open6.jsonl` (37/44) — post-§7.18 (OPEN-6 phase 1),
  pre-§7.22. Both Bajram and Air_Products are failing.
- `results/hippocampus-baseline.jsonl` (36/44) — original canonical run
  (`a00e8f8`), before any role-token expansion.

The chain of mechanism-attributable per-fact closures is then:
`João_Lourenço-birth_place` and `Mohammed_Shahabuddin-honorific_prefix`
closed by §7.18; `Bajram_Begaj-predecessor` closed by §7.22;
`Air_Products-num_employees` closed by §7.23. Net: **36 → 39** across
three §S3-disciplined mechanism additions, with zero per-fact
regression accumulated.

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

### Role-expansion regression (0 headline facts)

`Air_Products-num_employees` was the OPEN-6 phase 1 regression: with
`num_employees` appended to the query string, ranking shifted and a
stale value won. The §7.23 pt2qm mechanism (Pass-2 query-word
tiebreak in `resolveCurrentTruth`) closes it cleanly, with zero
per-fact regression on the other 43 facts under the new canonical
config. The earlier state is preserved in
`results/hippocampus-pt-succeed.jsonl` (38/44) and
`results/hippocampus-open6.jsonl` (37/44) — both audit artifacts
contain the failing Air_Products row.

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

## What fixing the remaining 5 looks like

The 4 `out-of-scope` facts require either a different corpus
selection or a mechanism that no retrieval system in this bench
currently has.

The 1 remaining Hippocampus-specific fix is:

- `Alexander_Van_der_Bellen-citizenship`: expand schema-cortex atom
  coverage for list-tail temporal citizenship. Also requires an
  `at_birth` temporal-operator implementation in the resolver
  (the query's temporal classifier already extracts `at_birth`,
  but the bridge precondition rejects anything other than `current`).
  This is a real new substrate primitive with its own §S4 falsifier
  bar, not a regex tweak.
