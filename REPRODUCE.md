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
git clone https://github.com/<org>/hippocampus-evals.git
cd hippocampus-evals
npm install
npx tsx scripts/score.ts results/hippocampus.jsonl
```

The output will be a JSON dump containing the metrics for every
system in that JSONL. The Hippocampus canonical block must match the
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
    "contradiction_free": 0.8181818181818182,    // 36/44 = 81.82%
    "mean_tokens": 11.545454545454545,            // ≈ 11.55
    "mean_units": 1,
    "accuracy": 0.8181818181818182                // 36/44 — equal to CF for Hippocampus
  },
  "non_list_tail": {
    "n": 38,
    "contradiction_free": 0.8421052631578947,    // 32/38 = 84.21%
    "mean_tokens": 12
  },
  "list_tail": {
    "n": 6,
    "contradiction_free": 0.6666666666666666,    // 4/6 = 66.67%
    "mean_tokens": 8.666666666666666
  }
}
```

### From `results/hippocampus-open6.jsonl`

```
$ npx tsx scripts/score.ts results/hippocampus-open6.jsonl
```

Expected fields for `Hippocampus`:

```jsonc
{
  "overall": {
    "n": 44,
    "contradiction_free": 0.8409090909090909,    // 37/44 = 84.09%
    "mean_tokens": 12.181818181818182             // ≈ 12.18
  },
  "non_list_tail": {
    "n": 38,
    "contradiction_free": 0.868421052631579      // 33/38 = 86.84%
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

This reads all four `results/*.jsonl` files and rewrites
`results/summary.json` in place. The resulting `summary.json` should
be byte-identical to the one already committed to the repository
(modulo trailing newline conventions on Windows vs POSIX). The
`headline.hippocampus_canonical.overall_cf` field must be exactly
`"36/44"`; the `token_efficiency.minilm_filtered_over_hippocampus`
field must be `10.5217`.

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
- **The necessity ablation for OPEN-6.** The ablation involved
  running the engine with the `--open6=enabled` flag off (the
  baseline `o60` run) and comparing per-fact verdicts. Both
  `o60` and the canonical `a00e8f8` artifact are byte-identical on
  the metrics we report, so the published `results/hippocampus.jsonl`
  serves as the ablation baseline. The user of this repository can
  verify that disabling the OPEN-6 mechanism (i.e., loading
  `hippocampus.jsonl` instead of `hippocampus-open6.jsonl`) causes
  Lourenço-birth_place to revert to `contradiction_free=0`. That
  verification *is* possible without engine access:

  ```bash
  # Find Lourenço in both files
  grep "João_Lourenço-birth_place" results/hippocampus.jsonl
  grep "João_Lourenço-birth_place" results/hippocampus-open6.jsonl
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
