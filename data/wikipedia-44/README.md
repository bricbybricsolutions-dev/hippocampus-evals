# Wikipedia 44-fact dataset

44 temporal-fact questions drawn from 25 English Wikipedia articles. Each
fact records both the **current** value of a property (as of the data
cutoff 2024-12-31) and the **prior** value it replaced, along with the
Wikipedia revision IDs that bracket the change. This is the dataset that
the headline `hippocampus.jsonl` / `hippocampus-open6.jsonl` /
`minilm-filtered.jsonl` / `bm25.jsonl` results in `../../results/` were
evaluated against.

## Files

- `facts.json` — the 44 facts, frozen at the build cutoff. Schema below.
- `LICENSE` — CC-BY-SA-4.0 (the dataset is derived from Wikipedia, which
  carries the same license).

## `facts.json` schema

```jsonc
{
  "cutoff_date": "2024-12-31",          // every value reflects state on this date
  "facts": [
    {
      "article_slug": "3M",             // Wikipedia URL slug
      "fact_type": "ceo",               // canonical infobox parameter name
      "current_value": "William M. Brown",
      "current_first_revision_id": 1238491668,    // first revision with the current value
      "current_first_timestamp": "2024-08-04T04:45:06Z",
      "prior_value": "Michael F. Roman",
      "prior_last_revision_id": 1234707957,        // last revision with the prior value
      "prior_last_timestamp": "2024-07-15T18:57:06Z",
      "query": "What is the current CEO of 3M?",   // natural-English question
      "ground_truth_current": "William M. Brown"   // expected answer
    },
    // ... 43 more
  ]
}
```

The `query_id` used in the result JSONLs is `{article_slug}-{fact_type}`,
e.g. `3M-ceo`, `Abdelmadjid_Tebboune-primeminister`.

## How the 44 were chosen

- 25 articles, 1–3 facts per article.
- 6 of the 44 are **list-tail** facts (the changed value lives in a
  multi-valued field like `citizenship` or `otherparty`). These are
  scored separately in `summary.json` because list-tail handling is a
  separate retrieval-pipeline concern. The 38 non-list-tail facts are
  the primary scoring slice in the blog post.
- Articles were selected to give a structural mix: corporate infoboxes
  (CEOs, revenue, employee counts), political-office infoboxes (heads
  of state, ministers, predecessors / successors), biographical
  infoboxes (birth places, citizenships, honorific prefixes). The mix
  is what surfaces the failure-category taxonomy — different infobox
  shapes hit different retrieval gates.

## Provenance and reproducibility

Each fact row records the Wikipedia revision IDs that supplied the
`current_value` and `prior_value`. To independently verify a single
fact:

```
https://en.wikipedia.org/w/index.php?oldid={current_first_revision_id}
https://en.wikipedia.org/w/index.php?oldid={prior_last_revision_id}
```

The dataset is frozen — `current_value` reflects the *first revision
where the current value appeared*, not the live article today. Wikipedia
articles keep changing, so over time the current live article may
diverge from this dataset. That is expected; the dataset is a snapshot.

## Source code

The scan / fetch scripts that built `facts.json` are in the production
repository (`packages/bench/wikipedia/scripts/`) and are not republished
here — they are general-purpose Wikipedia fetchers and not part of the
engine being evaluated. See REPRODUCE.md in the repo root.

## License

CC-BY-SA-4.0. See `LICENSE` in this directory.
