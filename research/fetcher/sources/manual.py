"""Hand-collected records (e.g. Quora answers) dropped into data/manual/*.csv.

Required columns: source, rawText, url
Optional columns: date, subSource, language
"""
import csv
import logging
from pathlib import Path

from ..models import SOURCES, Record
from ..textutil import iso_date

log = logging.getLogger(__name__)


def load(manual_dir: Path) -> tuple[list[Record], list[str]]:
    records, notes = [], []
    for path in sorted(manual_dir.glob("*.csv")):
        if path.name.startswith("_"):
            continue  # templates
        with path.open(encoding="utf-8-sig", newline="") as f:
            for i, row in enumerate(csv.DictReader(f), start=2):
                src = (row.get("source") or "").strip()
                text = (row.get("rawText") or "").strip()
                if src not in SOURCES or not text:
                    notes.append(f"{path.name} line {i}: skipped (source must be one of {SOURCES}, rawText required)")
                    continue
                records.append(Record(
                    source=src, rawText=text, url=(row.get("url") or "").strip(),
                    date=iso_date(row.get("date")), recordType="manual",
                    subSource=(row.get("subSource") or "").strip(), searchTerm="manual",
                    language=(row.get("language") or "").strip(),
                ))
        notes.append(f"{path.name}: loaded")
    log.info("Manual import: %d records", len(records))
    return records, notes
