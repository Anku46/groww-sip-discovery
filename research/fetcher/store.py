"""Per-channel caches -> merged, enriched, de-duplicated raw corpus CSV + summary + collection log."""
import csv
import json
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from .enrich import dedupe_key, enrich
from .models import CSV_COLUMNS, LANGUAGES, SOURCES, FetchResult, Record
from .sources import manual

MIN_TEXT_LEN = 10


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def save_channel(data_dir: Path, name: str, res: FetchResult):
    ch = data_dir / "raw" / "channels"
    ch.mkdir(parents=True, exist_ok=True)
    fetched_at = _now()
    with (ch / f"{name}.jsonl").open("w", encoding="utf-8") as f:
        for r in res.records:
            r.fetchedAt = fetched_at
            f.write(json.dumps(asdict(r), ensure_ascii=False) + "\n")
    meta = {"channel": name, "fetchedAt": fetched_at, "fetchedCount": len(res.records),
            "params": res.params, "notes": res.notes}
    (ch / f"{name}.meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")


def _load_channels(data_dir: Path):
    ch = data_dir / "raw" / "channels"
    records, metas = [], []
    for path in sorted(ch.glob("*.jsonl")):
        with path.open(encoding="utf-8") as f:
            records.extend(Record.from_dict(json.loads(line)) for line in f if line.strip())
        meta_path = path.with_suffix(".meta.json")
        if meta_path.exists():
            metas.append(json.loads(meta_path.read_text(encoding="utf-8")))
    return records, metas


def merge_and_write(data_dir: Path) -> dict:
    raw_dir = data_dir / "raw"
    manual_dir = data_dir / "manual"
    raw_dir.mkdir(parents=True, exist_ok=True)
    manual_dir.mkdir(parents=True, exist_ok=True)

    records, metas = _load_channels(data_dir)
    manual_records, manual_notes = manual.load(manual_dir)
    loaded = records + manual_records

    out, seen_text, seen_id = [], set(), set()
    dropped_short = duplicates = 0
    for r in loaded:
        enrich(r)
        if len(r.rawText) <= MIN_TEXT_LEN:
            dropped_short += 1
            continue
        key = dedupe_key(r)
        if key in seen_text or r.id in seen_id:
            duplicates += 1
            continue
        seen_text.add(key)
        seen_id.add(r.id)
        out.append(r)
    out.sort(key=lambda r: (SOURCES.index(r.source), r.date, r.id))

    csv_path = raw_dir / "raw_corpus.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:  # BOM so Excel shows Hindi correctly
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        w.writeheader()
        for r in out:
            w.writerow(asdict(r))

    per_channel = Counter(r.source for r in out)
    per_sub = Counter(f"{r.source} / {r.subSource or '-'}" for r in out if r.source in ("Reddit", "Forum"))
    summary = {
        "generatedAt": _now(),
        "totalRaw": len(out),
        "perChannel": {s: per_channel.get(s, 0) for s in SOURCES},
        "perChannelWithSipKeyword": {s: sum(1 for r in out if r.source == s and r.matchedKeywords) for s in SOURCES},
        "perLanguage": {l: sum(1 for r in out if r.language == l) for l in LANGUAGES},
        "perSubSource": dict(sorted(per_sub.items())),
        "datedRecords": sum(1 for r in out if r.date != "unknown"),
        "piiFlagged": sum(1 for r in out if r.containsPII),
        "loadedBeforeCleaning": len(loaded),
        "droppedTooShort": dropped_short,
        "duplicatesRemoved": duplicates,
        "manualRecords": len(manual_records),
        "channelsMissing": [s for s in SOURCES if not per_channel.get(s)],
        "csv": str(csv_path.relative_to(data_dir.parent)).replace("\\", "/"),
    }
    (raw_dir / "corpus_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    _write_log(raw_dir / "collection_log.md", summary, metas, manual_notes)
    return summary


def _write_log(path: Path, s: dict, metas: list, manual_notes: list):
    L = ["# Phase 1 Collection Log", "", f"Generated: {s['generatedAt']}", "",
         "## Corpus totals", "",
         f"- **Total raw records:** {s['totalRaw']}",
         f"- Records with a date: {s['datedRecords']} / {s['totalRaw']}",
         f"- Flagged as containing PII: {s['piiFlagged']}",
         f"- Before cleaning: {s['loadedBeforeCleaning']} (dropped {s['droppedTooShort']} too short, "
         f"{s['duplicatesRemoved']} duplicates)",
         f"- Hand-imported (data/manual): {s['manualRecords']}", "",
         "| Channel | Records | With SIP keyword |", "| :-- | --: | --: |"]
    for src in SOURCES:
        L.append(f"| {src} | {s['perChannel'][src]} | {s['perChannelWithSipKeyword'][src]} |")
    L.append(f"| **Total** | **{s['totalRaw']}** | **{sum(s['perChannelWithSipKeyword'].values())}** |")
    L += ["", "| Language | Records |", "| :-- | --: |"]
    L += [f"| {k} | {v} |" for k, v in s["perLanguage"].items()]
    if s["perSubSource"]:
        L += ["", "| Sub-source | Records |", "| :-- | --: |"]
        L += [f"| {k} | {v} |" for k, v in s["perSubSource"].items()]
    if s["channelsMissing"]:
        L += ["", f"> **Missing channels:** {', '.join(s['channelsMissing'])}. Phase 1 exit criteria need all 5."]
    L += ["", "## Channel runs", ""]
    for m in sorted(metas, key=lambda m: m["channel"]):
        L += [f"### {m['channel']}", "", f"- Fetched at: {m['fetchedAt']}", f"- Records fetched: {m['fetchedCount']}"]
        for k, v in m["params"].items():
            L.append(f"- {k}: `{json.dumps(v, ensure_ascii=False)}`")
        for n in m["notes"]:
            L.append(f"- Note: {n}")
        L.append("")
    if manual_notes:
        L += ["### manual import", ""] + [f"- {n}" for n in manual_notes] + [""]
    path.write_text("\n".join(L), encoding="utf-8")
