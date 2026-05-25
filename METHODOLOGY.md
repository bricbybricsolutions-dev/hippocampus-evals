# METHODOLOGY.md

How the experiments behind the published numbers were designed and run.
The numbers themselves are in `results/summary.json` and the per-row
artifacts in `results/`. This document explains the discipline that
sits behind them — what we committed to *before* running each
experiment, and how we handled the inevitable surprises.

## Pre-committed falsifiers, in plain English

The single most important methodological choice in this work is also
the simplest one. **Before we run an experiment, we write down what
result would prove the hypothesis wrong.** Not the hypothesis itself —
the negation. We commit that statement to the project's documentation
branch and pin it to a git SHA, and then we run the experiment. If the
result fails the pre-committed bar, we publish the failure rather than
moving the goalpost.

In the project's internal documentation this is called the §S3
discipline. The reason it exists is that the easiest way to lie with a
benchmark is to design the scoring rule after seeing the data. By
fixing the falsifier in advance we make that move impossible without
visibly editing a committed file.

A concrete example. The role-token expansion included in the
headline Hippocampus run was proposed by an analysis (§6119 of the
project guide) that predicted exactly one fact would flip from
`contradiction_free=0` to `contradiction_free=1`:
*João Lourenço's birth place*. The three falsifiers were:

- **H1** — Lourenço-birth_place flips to `contradiction_free=1`, and
  Tebboune-birth_place (which already passes) stays at 1.
  *Disproof:* either flips the wrong way.
- **H2** — Non-list-tail contradiction-free rises from 32/38 to at
  least 33/38.
  *Disproof:* it stays at 32/38 or regresses.
- **H3** — A necessity ablation that disables the role-token expansion makes
  Lourenço-birth_place revert to `contradiction_free=0`.
  *Disproof:* it stays at 1 (meaning the mechanism wasn't the thing
  doing the work).

All three passed on the actual run. We did not move any bar after
seeing the data; the SHA of the prediction file (`882ccff` on the
internal docs branch) predates the SHA of the role-token implementation
commit (`06a4212`).

Two surprises showed up that the falsifiers did not predict, and they
are dealt with explicitly below ("Shahabuddin bonus" and "Air_Products
YELLOW").

## Necessity ablations

A pre-committed falsifier alone is not enough — you also have to show
that the new mechanism is *necessary* for the win. Without the
necessity ablation, you could be claiming credit for a change that
isn't doing what you think it's doing.

For the role-token expansion, the necessity ablation was H3 above:
disable the role-token injection, re-run the same 44-fact bench, and
check that the predicted flip reverts. The baseline run on commit
`06a4212` (the `o60` JSONL in the production artifacts; flag absent)
is byte-identical to the earlier `a00e8f8` run on the metrics we
report. Lourenço-birth_place is `contradiction_free=0` in the
baseline and `contradiction_free=1` with the role-token expansion on
the same commit. That is the cleanest
necessity test possible: same code, same corpus, single flag toggle,
predicted fact flips.

For Hippocampus itself versus the baselines, the necessity argument is
structural: the baselines run on the same 44 questions and the same
ground-truth answers, and they retrieve more units and more tokens to
achieve worse contradiction-free recall. There is no parameter to
ablate; you turn the engine on or off.

## How we handled the Shahabuddin surprise

When we ran the role-token expansion, a *second* fact flipped that the pre-committed
falsifier did not predict: *Mohammed Shahabuddin's honorific prefix*.
The §6119 analysis had classified this fact as schema-expansion territory —
the bridge attempted but found no atom in the schema cortex, which we
thought meant a different mechanism was needed.

We were wrong about the workaround pathway. Even without an atom, the
lexical fallback found the right cell once the canonical role token
was injected into the query string. The role-token expansion closed
**2 of the 4** failure cases that §6125 had originally enumerated, not
the 1 the prediction had locked in.

The honest response was to publish both: the predicted flip and the
unpredicted bonus. We did **not** retroactively rewrite the falsifier
to claim "we predicted both" — the pre-committed prediction document
still says "Lourenço only," and the post-hoc update to that document
explicitly notes the surprise. This matters because the credibility of
the *predicted* flip is what's load-bearing; the bonus is real but it
doesn't validate the prediction more than it already was validated.

In the per-fact failure tagging, Shahabuddin-honorific_prefix is
categorized as `atom-coverage-gap` (the original §6119 classification),
not as a victory for that mechanism specifically. The recovery by lexical
fallback is documented in [`FAILURES.md`](FAILURES.md) under that fact.

## How we handled the Air_Products regression (YELLOW)

The role-token expansion also flipped one fact in the *wrong* direction:
*Air_Products's number of employees* went from
`contradiction_free=1` (baseline) to `0` in the headline run. With
"num_employees" appended to the query string, the ranking shifted and
a different cell — one containing a stale value — won.

Net effect across all 44 facts was still +1 (Lourenço +1,
Shahabuddin +1, Air_Products −1). The pre-committed H2 bar passed
*exactly* at 33/38, with no slack. But the mechanism was now
demonstrably **not regression-free**.

The project's internal §S4 ("load-bearing vs decorative") discipline
classifies this as **YELLOW on regression-safety, GREEN on the net
metric**. Both colors are reported. Promotion of the role-token expansion
into the core engine was blocked until the regression was attributed
to a specific subsystem (the `resolveCurrentTruth` Pass-2 entity
clustering, separately from the lexical-seed change) and a fix was
landed. The fix is on a separate commit and is not in the
`hippocampus.jsonl` artifact in this repo — that artifact is
the headline Hippocampus run with the regression *present*. We are
publishing it as it was scored, not as it would score with the
follow-up fix applied.

If we were publishing the post-fix numbers we would say so. We are
not — the headline Hippocampus result is +1 net, with one regression
identified and documented, and the engine fix is part of a separate
work stream.

## Why the headline metric is contradiction-free recall, not accuracy

A document-native baseline like MiniLM-filtered scores 95% on raw
`answer_correct` — it almost always retrieves a document that
contains the right answer somewhere. But on the same 44 facts it
scores 75% contradiction-free: in 25% of cases it also retrieves a
contradicting prior value (because the article contains both).

For a downstream LLM, the difference matters. A retrieved unit that
says "the CEO of 3M is X" and a unit that says "the CEO of 3M was Y"
in the same context window induces the LLM to either pick one
(possibly wrong) or hedge ("X or Y"). Hippocampus's design point is
to return a single, current-truth-resolved unit — which is why we
report contradiction-free as the headline and tokens-to-LLM as the
cost.

## Where the determinism claim comes from

The headline Hippocampus configuration has been characterized at N=4
trials and is byte-identical across runs. The earlier baseline
configuration was characterized at N=10 trials and was also
byte-identical: 36 facts pass in 10/10 runs, 8 fail in 10/10, and
zero facts flip. So the single-run numbers we report are not
single-trial noise under the reported configurations.

The MiniLM-filtered and BM25 baselines are deterministic by
construction (no learned components evaluated at recall time, no
randomized rerankers). We did not formally characterize their N=10
variance because there is no plausible source of nondeterminism in
their recall paths; that conclusion is structural, not empirical.

## What we did not do (deliberately)

- **No held-out test set / dev split.** With only 44 facts, the
  statistical case for splitting was weak. Instead, every design
  iteration that touched the engine had to clear a pre-committed
  falsifier on the full 44 facts; the falsifier acts as the
  out-of-distribution guard. This is a research-grade discipline,
  not a production-grade benchmarking practice. We are not claiming
  generalization to held-out data; see
  [`LIMITATIONS.md`](LIMITATIONS.md).
- **No cross-corpus validation.** Every number in this repository is
  Wikipedia-scoped. Whether the same engine produces the same
  retrieval cost / accuracy curve on (say) customer support tickets
  or contract clauses is untested. This is the single largest
  open question about generalization and is also called out in
  [`LIMITATIONS.md`](LIMITATIONS.md).
- **No retraining of the baselines.** The baselines (MiniLM,
  BM25-TFIDF) were used out-of-the-box with their default
  configurations. We did not tune them for this corpus — both
  because that would have made the comparison unfair and because
  the goal is to compare against the *off-the-shelf* tools a
  practitioner would actually reach for.
