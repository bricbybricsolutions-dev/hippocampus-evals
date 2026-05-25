# LIMITATIONS.md

What we are **not** claiming. Read this before quoting any number from
the blog post in another context — every limit below qualifies the
headline.

## 1. The accuracy number is Wikipedia-scoped

Every number in `results/summary.json` was measured on the same
44-fact Wikipedia corpus. We have not run the same engine on customer
support tickets, legal contract clauses, product reviews, or any
other genre of text. We have not run it on any non-English corpus.
We have not run it on any corpus larger than 44 facts.

The blog post's "10× token efficiency" claim, the "84.09%
contradiction-free recall" claim, and every cross-system comparison
are claims **about Wikipedia, on this 44-fact set, at the 2024-12-31
cutoff**. They are not claims about retrieval in general, about
temporal facts in general, or about any other corpus.

If you are evaluating Hippocampus for a use case outside Wikipedia,
the right move is to build a small alias map for your corpus and run
the same pipeline. We are happy to help. We are **not** willing to
let the Wikipedia number stand in for that work, and we are
publishing this repository in part to make it easy for skeptics to
verify exactly what is being claimed.

## 2. The alias map was built for this corpus

The query parser contains a deterministic
regex grammar that maps natural-English query vocabulary
("born", "succeeded", "honorific") to canonical infobox parameter
names (`birth_place`, `successor1`, `honorific_prefix`). That regex
grammar was **hand-tuned for the 25 articles in this corpus**. The
work to construct it was not zero — it is roughly two engineer-days
of corpus inspection, and we are not claiming that two engineer-days
is enough on every corpus.

For a different domain (medical infoboxes, financial filings, legal
clauses) the alias map would need to be rebuilt from scratch. We do
not have a measurement of how long that takes on those corpora; that
is the cross-corpus experiment we have not yet run.

## 3. Generalization to other corpora is untested

This is the same point as (1), restated in the affirmative. The
single largest open research question about Hippocampus is whether
the contradiction-free / token-cost curve holds on a corpus with a
structurally different shape from Wikipedia. We do not yet know. We
have a hypothesis (it should generalize for any corpus with
infobox-like structured facts; it should generalize less well for
free-form prose) but no measurement.

The blog post claim "every number in this post is inspectable from
public benchmark artifacts" applies **only** to this Wikipedia
benchmark. If a future post extends the claim to another corpus, the
expectation is that we will ship another `hippocampus-evals`-shaped
repository for that corpus, with the same level of artifact
inspectability.

## 4. The engine is not open-source

The retrieval ranking logic, the resolver implementation
(`resolveCurrentTruth` and its passes), the schema-cortex
construction, the alias-map tuning code, and the substrate the engine
sits on are all in a separate, currently private repository. What
you have in this repository are the **audited outputs** of running
that engine on the 44-fact corpus — not a runnable reproduction of
the engine.

This means:

- You can verify that the headline numbers in the blog post match
  the per-row data that was used to compute them. That is exactly
  what `scripts/score.ts` does and that does not need the engine.
- You **cannot** re-run the engine from this repository. To do
  that you would need access to the production code.
- You cannot independently fork and modify the retrieval logic from
  what is published here.

We considered open-sourcing the engine and chose not to at the time
of publication, primarily because the engine is still under active
development and we wanted to stabilize the public API surface before
inviting downstream forks. This decision may change; if it does, the
production repository will be released under the same Apache-2.0
license as the code in this repository.

## 5. Determinism is configuration-scoped

The determinism claim applies to the reported Hippocampus
configuration (`bridge-config=full m1-config=baseline` with
role-token expansion enabled). Other configurations of the engine — in particular
`schemaCorpusEnriched` and the no-bridge baseline — have measurable
within-state jitter (a single non-list-tail fact can flip between
trials on those configurations). We are reporting numbers from the
deterministic configurations only, and we have characterized the
non-deterministic configurations explicitly in the production
documentation (§11.5.7 and §11.5.8).

If you see a future result published from a non-deterministic
configuration, expect it to be reported as a multi-trial mean
(usually N=10) rather than a single-trial bar.

## 6. The list-tail slice is reported but is not the headline

6 of the 44 facts are list-tail facts (the changed value is one entry
in a multi-valued field). Hippocampus scores 4/6 (66.67%)
contradiction-free on this slice. We report this
slice separately because:

- It is a smaller-sample regime (n=6) where single-fact flips swing
  the percentage by 16.7 points each, so the slice is noisier even
  when the underlying mechanism is deterministic.
- List-tail retrieval is a structurally different problem from
  scalar-field retrieval; bundling them inflates the apparent
  difficulty of the easier slice.

The headline (84.09% overall, 86.84% non-list-tail) is the right
comparison point for the blog post. The list-tail slice is the right
comparison point if you are specifically evaluating retrieval over
multi-valued fields.

## 7. What "contradiction-free" specifically rules in and out

Contradiction-free is a **strict** metric. A fact scores
`contradiction_free=1` only when:

- The retrieved content contains the expected answer, **and**
- The retrieved content does not also contain a stale, prior value
  for the same field that would contradict the current answer.

It does **not** measure:

- Whether the system returned *only* the answer (a baseline that
  retrieves a whole article scoring `answer_correct=1` and
  `contradiction_free=0` could still be useful in some pipelines).
- Whether the system's full retrieved content is factually correct
  about everything in it (it might surface a correct current value
  while also surfacing an unrelated incorrect fact).
- Whether the system's retrieved content is timely with respect to
  the **live** Wikipedia article (the ground truth is frozen at the
  2024-12-31 cutoff).

If you are using this benchmark to inform a production decision,
contradiction-free is the right metric for use cases where the
downstream consumer is an LLM that will be confused by contradicting
context. It is the *wrong* metric for use cases where the consumer
will do its own contradiction resolution downstream.

## 8. The cost metrics are token counts, not dollars

`tokens_to_llm` measures the byte / token volume of retrieved
content that would be passed to a downstream LLM. It does not
include:

- The cost of the retrieval system itself (Hippocampus's substrate
  storage, BM25's index, MiniLM's embedding inference).
- The cost of writing to / maintaining the substrate (Hippocampus
  has a non-trivial ingest cost that BM25 does not).
- The latency or throughput cost of recall.

The "10× token efficiency" claim is specifically about LLM context
window cost — the dominant cost in most production RAG pipelines.
It is not a claim about total system cost. For a small static corpus,
BM25 is essentially free at retrieval time; Hippocampus has a
non-zero recall cost. We have not published a head-to-head total
cost comparison.
