# REPRODUCE.md

Exact commands to go from a clean clone to scored output.

## Prerequisites

- **Node.js** ≥ 20.0.0. Tested with Node 22.14.0 on Windows. Earlier
  versions of Node 20+ should also work; if you are on Node 18 or
  below, upgrade.
- **npm** (bundled with Node). We do not require pnpm — the
  production repository uses pnpm, but this evaluation repository is
  small and uses plain npm.
- **git** (any recent version) to clone the repo. Optional for the
  reproduction itself — once cloned, no further git is needed.

You do **not** need:

- A working Hippocampus engine installation. The whole point of this
  repository is to make the numbers inspectable *without* the engine.
- Python. The reshape build script lives in the source repository and
  is not republished here. The published `results/*.jsonl` files are
  the already-built artifacts.
- Access to the production Hippocampus repository.

## Minimal reproduction (from clean clone)

```bash
git clone https://github.com/bricbybricsolutions-dev/hippocampus-evals.git
cd hippocampus-evals
npm install
npx tsx scripts/score.ts results/hippocampus.jsonl
```

The output will be a JSON dump containing the metrics for every
system in that JSONL. The Hippocampus block must match the
values in the verification gate below.

## Verification gate

A clean reproduction must produce exactly these values. If any of
them differ on your machine, please open an issue — the artifacts in
`results/` are not supposed to be machine-dependent, and a
discrepancy points to a corruption issue we want to investigate.

### From `results/hippocampus.jsonl`

```
$ npx tsx scripts/score.ts results/hippocampus.jsonl
```

Expected fields in the printed output for `Hippocampus`:

```jsonc
{
  "overall": {
    "n": 44,
    "contradiction_free": 0.8863636363636364,    // 39/44 = 88.64%
    "mean_tokens": 12.090909090909092,            // ≈ 12.09
    "mean_units": 1,
    "accuracy": 0.9090909090909091                // 40/44 raw answer correctness
  },
  "non_list_tail": {
    "n": 38,
    "contradiction_free": 0.9210526315789473,    // 35/38 = 92.11%
    "mean_tokens": 12.052631578947368
  },
  "list_tail": {
    "n": 6,
    "contradiction_free": 0.6666666666666666,    // 4/6 = 66.67%
    "mean_tokens": 12.333333333333334
  }
}
```

### From `results/hippocampus-pt-succeed.jsonl` (pre-pt2qm audit artifact)

```
$ npx tsx scripts/score.ts results/hippocampus-pt-succeed.jsonl
```

This is the state after §7.22 (past-tense `succeed` regex) but before
§7.23 (pt2qm canonical promotion): 38/44 overall, 34/38 non-list-tail.
`Air_Products-num_employees` is still failing in this artifact.

### From `results/hippocampus-open6.jsonl` (intermediate audit artifact)

```
$ npx tsx scripts/score.ts results/hippocampus-open6.jsonl
```

This is the OPEN-6 phase 1 result, before either the §7.22 past-tense
`succeed` extension or the §7.23 pt2qm canonical promotion (37/44 overall,
33/38 non-list-tail). Both `Bajram_Begaj-predecessor` and
`Air_Products-num_employees` are failing in this artifact.

### From `results/hippocampus-baseline.jsonl`

```
$ npx tsx scripts/score.ts results/hippocampus-baseline.jsonl
```

This earlier baseline artifact is retained for auditability. Expected
fields for `Hippocampus`:

```jsonc
{
  "overall": {
    "n": 44,
    "contradiction_free": 0.8181818181818182,    // 36/44 = 81.82%
    "mean_tokens": 11.545454545454545             // ≈ 11.55
  },
  "non_list_tail": {
    "n": 38,
    "contradiction_free": 0.8421052631578947     // 32/38 = 84.21%
  }
}
```

### From `results/minilm-filtered.jsonl` and `results/bm25.jsonl`

```
$ npx tsx scripts/score.ts results/minilm-filtered.jsonl
$ npx tsx scripts/score.ts results/bm25.jsonl
```

Expected headline fields:

| File                       | System                  | CF (overall)        | Mean tokens |
| -------------------------- | ----------------------- | ------------------- | ----------- |
| `minilm-filtered.jsonl`    | `MiniLM-filtered(2024)` | 0.75 (33/44)        | 121.4773    |
| `bm25.jsonl`               | `BM25-TFIDF`            | 0.3181... (14/44)   | 495.25      |

### Rebuilding `results/summary.json`

```bash
npx tsx scripts/score.ts --write-summary
```

This reads the four primary `results/*.jsonl` files (hippocampus,
hippocampus-baseline, minilm-filtered, bm25) and rewrites
`results/summary.json` in place. The resulting `summary.json` should
be byte-identical to the one already committed to the repository
(modulo trailing newline conventions on Windows vs POSIX). The
`headline.hippocampus.overall_cf` field must be exactly `"39/44"`;
the `token_efficiency.minilm_filtered_over_hippocampus` field must
be `10.047`. The `hippocampus-pt-succeed.jsonl` and
`hippocampus-open6.jsonl` audit artifacts are not loaded by
`--write-summary` — they are scoreable individually via
`scripts/score.ts results/<file>.jsonl`.

## What is *not* reproducible from this repository alone

A small number of statements in the blog post require running the
production engine and are not reproducible from this repository:

- **The N=10 byte-identical determinism characterization.** This
  required running the engine 10 times against the same corpus and
  diffing the resulting JSONLs. We publish the **conclusion** of that
  characterization (stdev=0.0000 across N=10) but not the 10 raw
  JSONLs, because they are byte-identical by definition — the second
  through tenth would just be copies of the first. If a skeptic wants
  to verify the determinism claim, they would need engine access and
  the ability to run 10 trials. We document this honestly here rather
  than imply that determinism is verifiable from this repo.
- **The necessity ablation for the role-token expansion.** The
  ablation involved running the engine with the role-token expansion
  off and comparing per-fact verdicts. The published
  `results/hippocampus-baseline.jsonl` serves as the ablation baseline. The
  user of this repository can verify that disabling the mechanism
  causes Lourenço-birth_place to revert to `contradiction_free=0`.
  That verification *is* possible without engine access:

  ```bash
  # Find Lourenço in both files
  grep "João_Lourenço-birth_place" results/hippocampus-baseline.jsonl
  grep "João_Lourenço-birth_place" results/hippocampus.jsonl
  ```

  The first row will show `"contradiction_free": 0`; the second will
  show `"contradiction_free": 1`. That is the necessity ablation,
  inspectable from this repository.
- **The §11.5.7 / §11.5.8 jitter characterizations of
  non-canonical configurations.** These are documented in the
  production project guide (`docs/PROJECT-GUIDE.md` in the production
  repository) and not republished here, because they describe
  configurations that are not part of the headline result.

## Environment specifics

This repository has been tested on:

- Windows 11, Node 22.14.0, npm 10.9.2 (the development environment).
- We expect Linux and macOS reproductions to produce byte-identical
  JSONL outputs from `scripts/score.ts`. Line-ending conventions for
  the JSON output of `--write-summary` may differ (LF vs CRLF) on
  Windows; the floating-point values do not.

If a reproduction is failing on a specific environment, please open
an issue with the Node version, OS, and the actual vs expected
output.
