#!/usr/bin/env -S npx tsx
// score.ts — read a result JSONL and emit headline metrics.
//
// Usage:
//   npx tsx scripts/score.ts results/hippocampus.jsonl
//   npx tsx scripts/score.ts results/hippocampus.jsonl results/minilm-filtered.jsonl ...
//   npx tsx scripts/score.ts --write-summary    (rebuilds results/summary.json from
//                                                 the public result JSONLs)
//
// Every number in results/summary.json must be reproducible by running this
// script. If you change the JSONLs and run --write-summary, the summary.json
// is regenerated; if you run with no --write-summary the metrics are printed
// to stdout in the same shape as summary.json.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

type Row = {
  id: string;
  query: string | null;
  expected_answer: string | null;
  prediction: string | null;
  answer_correct: 0 | 1;
  contradiction_free: 0 | 1;
  tokens_to_llm: number;
  retrieved_units: number;
  list_tail: 0 | 1;
  failure_category: string | null;
  system: string;
  config: string;
  commit_hash: string;
  run_timestamp: number;
};

type SystemStats = {
  n: number;
  accuracy: number;
  contradiction_free: number;
  mean_units: number;
  mean_tokens: number;
};

type SystemBlock = {
  overall: SystemStats;
  non_list_tail: SystemStats;
  list_tail: SystemStats;
};

function loadJsonl(path: string): Row[] {
  const text = readFileSync(path, "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Row);
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function statsFor(rows: Row[]): SystemStats {
  return {
    n: rows.length,
    accuracy: mean(rows.map((r) => r.answer_correct)),
    contradiction_free: mean(rows.map((r) => r.contradiction_free)),
    mean_units: mean(rows.map((r) => r.retrieved_units)),
    mean_tokens: mean(rows.map((r) => r.tokens_to_llm)),
  };
}

function blockFor(rows: Row[]): SystemBlock {
  return {
    overall: statsFor(rows),
    non_list_tail: statsFor(rows.filter((r) => r.list_tail === 0)),
    list_tail: statsFor(rows.filter((r) => r.list_tail === 1)),
  };
}

function scoreFile(path: string): {
  file: string;
  systems: Record<string, SystemBlock>;
  meta: {
    commit_hash: string | null;
    run_timestamp: number | null;
    config: string | null;
  };
} {
  const rows = loadJsonl(path);
  const bySystem = new Map<string, Row[]>();
  for (const r of rows) {
    if (!bySystem.has(r.system)) bySystem.set(r.system, []);
    bySystem.get(r.system)!.push(r);
  }
  const systems: Record<string, SystemBlock> = {};
  for (const [name, sysRows] of bySystem) {
    systems[name] = blockFor(sysRows);
  }
  const first = rows[0];
  return {
    file: basename(path),
    systems,
    meta: {
      commit_hash: first?.commit_hash ?? null,
      run_timestamp: first?.run_timestamp ?? null,
      config: first?.config ?? null,
    },
  };
}

function tokenRatio(numerator: SystemStats, denominator: SystemStats): number {
  if (denominator.mean_tokens === 0) return 0;
  return numerator.mean_tokens / denominator.mean_tokens;
}

function buildHeadline(allFiles: Record<string, ReturnType<typeof scoreFile>>) {
  // summary.json shape — keyed by file/system so every number is anchored.
  const hippo = allFiles["hippocampus.jsonl"];
  const hippoBaseline = allFiles["hippocampus-baseline.jsonl"];
  const minilm = allFiles["minilm-filtered.jsonl"];
  const bm25 = allFiles["bm25.jsonl"];

  const hippoBaselineStats = hippoBaseline.systems["Hippocampus"];
  const hippoStats = hippo.systems["Hippocampus"];
  const minilmStats = minilm.systems["MiniLM-filtered(2024)"];
  const bm25Stats = bm25.systems["BM25-TFIDF"];

  return {
    schema_version: 1,
    description:
      "Headline metrics for hippocampus-evals. Every value here is reproducible by running scripts/score.ts on the corresponding file in results/.",
    files: allFiles,
    headline: {
      hippocampus: {
        overall_cf: `${Math.round(hippoStats.overall.contradiction_free * hippoStats.overall.n)}/${hippoStats.overall.n}`,
        overall_cf_pct: +(hippoStats.overall.contradiction_free * 100).toFixed(2),
        non_list_tail_cf: `${Math.round(hippoStats.non_list_tail.contradiction_free * hippoStats.non_list_tail.n)}/${hippoStats.non_list_tail.n}`,
        non_list_tail_cf_pct: +(hippoStats.non_list_tail.contradiction_free * 100).toFixed(2),
        list_tail_cf: `${Math.round(hippoStats.list_tail.contradiction_free * hippoStats.list_tail.n)}/${hippoStats.list_tail.n}`,
        list_tail_cf_pct: +(hippoStats.list_tail.contradiction_free * 100).toFixed(2),
        mean_tokens: +hippoStats.overall.mean_tokens.toFixed(4),
        commit_hash: hippo.meta.commit_hash,
      },
      hippocampus_baseline: {
        overall_cf: `${Math.round(hippoBaselineStats.overall.contradiction_free * hippoBaselineStats.overall.n)}/${hippoBaselineStats.overall.n}`,
        overall_cf_pct: +(hippoBaselineStats.overall.contradiction_free * 100).toFixed(2),
        non_list_tail_cf: `${Math.round(hippoBaselineStats.non_list_tail.contradiction_free * hippoBaselineStats.non_list_tail.n)}/${hippoBaselineStats.non_list_tail.n}`,
        non_list_tail_cf_pct: +(hippoBaselineStats.non_list_tail.contradiction_free * 100).toFixed(2),
        list_tail_cf: `${Math.round(hippoBaselineStats.list_tail.contradiction_free * hippoBaselineStats.list_tail.n)}/${hippoBaselineStats.list_tail.n}`,
        list_tail_cf_pct: +(hippoBaselineStats.list_tail.contradiction_free * 100).toFixed(2),
        mean_tokens: +hippoBaselineStats.overall.mean_tokens.toFixed(4),
        commit_hash: hippoBaseline.meta.commit_hash,
      },
      minilm_filtered_2024: {
        overall_cf: `${Math.round(minilmStats.overall.contradiction_free * minilmStats.overall.n)}/${minilmStats.overall.n}`,
        overall_cf_pct: +(minilmStats.overall.contradiction_free * 100).toFixed(2),
        mean_tokens: +minilmStats.overall.mean_tokens.toFixed(4),
      },
      bm25_tfidf: {
        overall_cf: `${Math.round(bm25Stats.overall.contradiction_free * bm25Stats.overall.n)}/${bm25Stats.overall.n}`,
        overall_cf_pct: +(bm25Stats.overall.contradiction_free * 100).toFixed(2),
        mean_tokens: +bm25Stats.overall.mean_tokens.toFixed(4),
      },
    },
    token_efficiency: {
      "minilm_filtered_over_hippocampus": +tokenRatio(minilmStats.overall, hippoStats.overall).toFixed(4),
      "bm25_over_hippocampus": +tokenRatio(bm25Stats.overall, hippoStats.overall).toFixed(4),
      "minilm_filtered_over_hippocampus_baseline": +tokenRatio(minilmStats.overall, hippoBaselineStats.overall).toFixed(4),
    },
    failure_categories: {
      "lexical-seeding-gap":
        "Query word does not share a token with the canonical fact_type, so the lexical encoder never seeds the right cell. Example: 'where was X born' vs cell content prefix 'X birth place...'.",
      "atom-coverage-gap":
        "Bridge fires correctly (container + role parsed) but no atom is indexed in the schema cortex for (container, role). Example: Shahabuddin-honorific_prefix.",
      "entity-slot-gap":
        "Country/office ↔ office-holder structural mismatch. Query names a country; cell is keyed on the office-holder; lexical encoder has no country-keyed seed. Atom-bridge retrieval territory.",
      "out-of-scope":
        "Fact fails on every system tested (Hippocampus, BM25-TFIDF, MiniLM-unfiltered, MiniLM-filtered(2024)). The question is structurally unanswerable from the 44-fact corpus at the cutoff date 2024-12-31; this is not a Hippocampus-specific failure.",
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const writeSummary = args.includes("--write-summary");
  const fileArgs = args.filter((a) => !a.startsWith("--"));

  if (writeSummary) {
    const here = fileURLToPath(import.meta.url);
    const root = resolve(dirname(here), "..");
    const resultsDir = resolve(root, "results");
    const files = [
      "hippocampus.jsonl",
      "hippocampus-baseline.jsonl",
      "minilm-filtered.jsonl",
      "bm25.jsonl",
    ];
    const all: Record<string, ReturnType<typeof scoreFile>> = {};
    for (const f of files) {
      all[f] = scoreFile(resolve(resultsDir, f));
    }
    const headline = buildHeadline(all);
    const outPath = resolve(resultsDir, "summary.json");
    writeFileSync(outPath, JSON.stringify(headline, null, 2) + "\n", "utf8");
    console.log(`Wrote ${outPath}`);
    return;
  }

  if (fileArgs.length === 0) {
    console.error(
      "Usage: npx tsx scripts/score.ts <file.jsonl> [more.jsonl ...]\n" +
        "       npx tsx scripts/score.ts --write-summary",
    );
    process.exit(2);
  }

  for (const f of fileArgs) {
    const result = scoreFile(f);
    console.log(JSON.stringify(result, null, 2));
  }
}

main();
