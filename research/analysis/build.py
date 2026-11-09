"""Build all Phase 2 outputs from the Phase 1 corpus + analyst coding.

    python -m analysis.build

Writes to data/phase2/ and validates every cross-reference.
"""
import csv
import json
import statistics
from collections import Counter
from pathlib import Path

from .coding import CODES, REVIEW_EXCLUSIONS, THEMES
from .content import (CORRECTION_CASE_STUDIES, DEFAULT_ADDRESSABILITY, DISCOVERY_ANSWERS, GOLDEN_PM_OVERRIDES,
                      GOLDEN_PM_REVIEW_DATE, GOLDEN_PM_REVIEWED, GOLDEN_SET, HINGLISH_PHRASES, QUICK_LOAD_CHIPS,
                      REPRESENTATIVE_VERBATIM_IDS)
from .first_time_filter import classify

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "raw_corpus.csv"
OUT = ROOT / "data" / "phase2"
CHANNEL_ORDER = ["PlayStore", "AppStore", "YouTube", "Forum"]


def _dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = list(csv.DictReader(RAW.open(encoding="utf-8-sig")))
    by_id = {r["id"]: r for r in raw}
    channels = [c for c in CHANNEL_ORDER if any(r["source"] == c for r in raw)]

    # 2.1 filter: rules, then analyst review
    rule_reason = {r["id"]: classify(r["rawText"], r["matchedKeywords"]) for r in raw}
    rule_included = {i for i, (ok, _) in rule_reason.items() if ok}
    missing = rule_included - set(CODES) - set(REVIEW_EXCLUSIONS)
    stray = (set(CODES) | set(REVIEW_EXCLUSIONS)) - rule_included
    assert not missing, f"rule-included records not reviewed: {sorted(missing)}"
    assert not stray, f"coded records the filter no longer includes: {sorted(stray)}"

    filtered = []
    for i, (theme, sev, stage, seg, age, note) in CODES.items():
        r = by_id[i]
        filtered.append({
            "id": i, "source": r["source"], "subSource": r["subSource"], "language": r["language"], "date": r["date"],
            "url": r["url"], "rawText": r["rawText"], "inclusionReason": rule_reason[i][1],
            "primaryThemeId": theme, "churnSeverity": sev, "lifecycleStage": stage, "userSegment": seg,
            "ageBand": age, "analystNote": note,
        })
    filtered.sort(key=lambda f: (CHANNEL_ORDER.index(f["source"]), f["date"], f["id"]))
    fid = {f["id"]: f for f in filtered}

    with (OUT / "filtered_corpus.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filtered[0]))
        w.writeheader()
        w.writerows(filtered)

    with (OUT / "filter_audit.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["id", "source", "ruleDecision", "ruleReason", "reviewDecision", "reviewReason", "rawText"])
        w.writeheader()
        for i in sorted(rule_included):
            w.writerow({"id": i, "source": by_id[i]["source"], "ruleDecision": "include", "ruleReason": rule_reason[i][1],
                        "reviewDecision": "exclude" if i in REVIEW_EXCLUSIONS else "include",
                        "reviewReason": REVIEW_EXCLUSIONS.get(i, ""), "rawText": by_id[i]["rawText"]})

    raw_per = Counter(r["source"] for r in raw)
    filt_per = Counter(f["source"] for f in filtered)
    rule_excl = Counter(reason for ok, reason in rule_reason.values() if not ok)
    corpus_summary = {
        "totalRaw": len(raw),
        "rawPerChannel": {c: raw_per[c] for c in channels},
        "afterRuleFilter": len(rule_included),
        "removedOnAnalystReview": len(REVIEW_EXCLUSIONS),
        "totalFiltered": len(filtered),
        "filteredPerChannel": {c: filt_per[c] for c in channels},
        "filteredPerLanguage": dict(Counter(f["language"] for f in filtered)),
        "ruleExclusionReasons": dict(rule_excl.most_common()),
        "inclusionReasons": dict(Counter(f["inclusionReason"] for f in filtered)),
    }
    _dump("corpus_summary.json", corpus_summary)

    # 2.2 themes
    total = len(filtered)
    themes = []
    for tid, meta in THEMES.items():
        recs = [f for f in filtered if f["primaryThemeId"] == tid]
        sev = [f["churnSeverity"] for f in recs]
        themes.append({
            "id": tid, "name": meta["name"], "summary": meta["summary"],
            "recordCount": len(recs), "sharePct": round(100 * len(recs) / total, 1),
            "severityScores": sev, "meanSeverity": round(statistics.mean(sev), 2),
            "sebiRestricted": meta["sebiRestricted"], "platformDependent": meta["platformDependent"],
            "proposedAddressability": DEFAULT_ADDRESSABILITY[tid],
            "recordIds": [f["id"] for f in recs],
        })
    assert sum(t["recordCount"] for t in themes) == total
    themes.sort(key=lambda t: -t["recordCount"])
    _dump("friction_themes.json", themes)

    # 2.3 answers
    for a in DISCOVERY_ANSWERS:
        assert 2 <= len(a["supportingVerbatimIds"]) <= 3, a["id"]
        for v in a["supportingVerbatimIds"]:
            assert v in fid, f"{a['id']} cites unknown verbatim {v}"
        for t in a["relatedThemeIds"]:
            assert t in THEMES, f"{a['id']} cites unknown theme {t}"
    answers = [{**a, "supportingQuotes": [{"id": v, "source": fid[v]["source"], "text": fid[v]["rawText"]}
                                          for v in a["supportingVerbatimIds"]]} for a in DISCOVERY_ANSWERS]
    _dump("discovery_answers.json", answers)

    # 2.4 verbatims
    assert len(REPRESENTATIVE_VERBATIM_IDS) == 25 and len(set(REPRESENTATIVE_VERBATIM_IDS)) == 25
    verbatims = [{k: fid[v][k] for k in ("id", "source", "language", "date", "url", "rawText", "lifecycleStage",
                                         "userSegment", "primaryThemeId", "churnSeverity")}
                 for v in REPRESENTATIVE_VERBATIM_IDS]
    _dump("verbatims.json", verbatims)

    # 2.5 golden set
    assert len(GOLDEN_SET) >= 20 and len({g for g, _ in GOLDEN_SET}) == len(GOLDEN_SET)
    golden = []
    for n, (v, why) in enumerate(GOLDEN_SET, start=1):
        gid = f"GS-{n:02d}"
        draft = {"theme": fid[v]["primaryThemeId"], "churnSeverity": fid[v]["churnSeverity"]}
        theme, sev = GOLDEN_PM_OVERRIDES.get(gid, (draft["theme"], draft["churnSeverity"]))
        assert theme in THEMES and 1 <= sev <= 5, gid
        golden.append({
            "id": gid, "verbatimId": v, "source": fid[v]["source"], "language": fid[v]["language"],
            "rawText": fid[v]["rawText"],
            "humanLabel": {"theme": theme, "churnSeverity": sev},
            "labelStatus": "pm_confirmed" if gid in GOLDEN_PM_REVIEWED else "draft_pending_pm_review",
            "reviewedOn": GOLDEN_PM_REVIEW_DATE if gid in GOLDEN_PM_REVIEWED else None,
            "analystDraft": draft,
            "pmChanged": gid in GOLDEN_PM_OVERRIDES,
            "whyTricky": why,
            "aiLabel": None,
        })
    assert set(GOLDEN_PM_OVERRIDES) <= {g["id"] for g in golden}
    _dump("golden_set.json", golden)

    # 2.6 corrections
    for c in CORRECTION_CASE_STUDIES:
        assert c["verbatimId"] in fid, c["id"]
    _dump("correction_case_studies.json",
          [{**c, "verbatimText": fid[c["verbatimId"]]["rawText"]} for c in CORRECTION_CASE_STUDIES])

    # Phase 3 hand-offs
    for _, _, v in HINGLISH_PHRASES:
        assert v in fid, v
    _dump("hinglish_phrases.json", [{"phrase": p, "english": e, "seenIn": v} for p, e, v in HINGLISH_PHRASES])
    _dump("quick_load_chips.json", [{"label": l, "verbatimId": v, "text": fid[v]["rawText"]} for l, v in QUICK_LOAD_CHIPS])

    _write_report(corpus_summary, themes, verbatims, golden, filtered)
    print(f"Phase 2 outputs written to {OUT.relative_to(ROOT)}: {total} filtered records, {len(themes)} themes")


def _write_report(cs, themes, verbatims, golden, filtered):
    def pct(n, d):
        return f"{100 * n / d:.0f}%"

    L = ["# Phase 2 Report — Analysis & Theme Discovery", "",
         "Generated by `python -m analysis.build` from the Phase 1 corpus and the analyst coding in "
         "`analysis/coding.py` / `analysis/content.py`.", "",
         "## 2.1 First-time investor filter", "",
         f"- Raw corpus: **{cs['totalRaw']}** records",
         f"- Kept by the rule-based filter: {cs['afterRuleFilter']}",
         f"- Removed on analyst read-through (not first-time investor voice): {cs['removedOnAnalystReview']}",
         f"- **Filtered corpus: {cs['totalFiltered']} records**", "",
         "| Channel | Raw | Filtered |", "| :-- | --: | --: |"]
    L += [f"| {c} | {cs['rawPerChannel'][c]} | {cs['filteredPerChannel'][c]} |" for c in cs["rawPerChannel"]]
    L += [f"| **Total** | **{cs['totalRaw']}** | **{cs['totalFiltered']}** |", "",
          "Languages in the filtered corpus: " + ", ".join(f"{k} {v}" for k, v in cs["filteredPerLanguage"].items()), "",
          "Why records were dropped by the rules: " + ", ".join(f"{k.split(':')[1]} {v}" for k, v in cs["ruleExclusionReasons"].items()), "",
          "> App Store reviews rarely say anything that marks the writer as a first-time investor, so none survive "
          "the filter. Store reviews in general contribute little; the first-time voice in this corpus comes mostly "
          "from YouTube comments and forum questions.", "",
          "## 2.2 Friction themes", "",
          "| Theme | Records | Share | Mean severity | SEBI | Platform-dependent | Proposed addressability | Preview score |",
          "| :-- | --: | --: | --: | :-: | :-: | --: | --: |"]
    for t in themes:
        score = t["sharePct"] * t["meanSeverity"] * t["proposedAddressability"]
        L.append(f"| {t['name']} | {t['recordCount']} | {t['sharePct']}% | {t['meanSeverity']} | "
                 f"{'yes' if t['sebiRestricted'] else ''} | {'yes' if t['platformDependent'] else ''} | "
                 f"{t['proposedAddressability']} | {score:.1f} |")
    L += ["", "Preview score = share × mean severity × addressability. It's indicative only; Phase 3 implements the "
          "real scoring function.", ""]
    for t in themes:
        L += [f"**{t['name']}** — {t['summary']}", ""]
    stages = Counter(f["lifecycleStage"] for f in filtered)
    segs = Counter(f["userSegment"] for f in filtered)
    L += ["Lifecycle stage: " + ", ".join(f"{k} {v}" for k, v in stages.most_common()), "",
          "Onboarding segment: " + ", ".join(f"{k} {v}" for k, v in segs.most_common()), "",
          "## 2.3 Discovery answers", ""]
    for a in DISCOVERY_ANSWERS:
        L += [f"**{a['id']}. {a['questionText']}**", "", a["answer"], "",
              "Evidence: " + ", ".join(f"`{v}`" for v in a["supportingVerbatimIds"]), ""]
    vs = Counter(v["source"] for v in verbatims)
    vl = Counter(v["language"] for v in verbatims)
    L += ["## 2.4 Representative verbatims", "",
          f"25 verbatims in `verbatims.json`: " + ", ".join(f"{k} {v}" for k, v in vs.items()) + "; "
          + ", ".join(f"{k} {v}" for k, v in vl.items()) + f"; covering all {len(themes)} themes.", "",
          "## 2.5 Golden set", "",
          f"{len(golden)} items in `golden_set.json`. {len(GOLDEN_PM_REVIEWED)} were PM-confirmed on "
          f"{GOLDEN_PM_REVIEW_DATE} ({len(GOLDEN_PM_OVERRIDES)} relabelled from the analyst draft); the corpus coding "
          "and correction cases were then aligned to those labels, which merged *Mandate & upfront amount shock* into "
          "*Autopay mandate setup & execution failures*. The PM label is the ground truth; the analyst draft is kept in "
          "`analystDraft`. AI labels stay empty until Phase 4.", "",
          "| # | Verbatim | Theme | Severity | Status | Analyst draft, if different |",
          "| :-- | :-- | :-- | :-: | :-- | :-- |"]
    for g in golden:
        d = g["analystDraft"]
        diff = (f"{THEMES[d['theme']]['name']}, {d['churnSeverity']}" if g["pmChanged"] else "")
        L.append(f"| {g['id']} | `{g['verbatimId']}` | {THEMES[g['humanLabel']['theme']]['name']} | "
                 f"{g['humanLabel']['churnSeverity']} | "
                 f"{'PM-confirmed' if g['labelStatus'] == 'pm_confirmed' else '**pending PM review**'} | {diff} |")
    gt = Counter(g["humanLabel"]["theme"] for g in golden)
    absent = [THEMES[t]["name"] for t in THEMES if not gt[t]]
    if absent:
        L += ["", f"Themes with no golden-set item after PM review: {', '.join(absent)}."]
    L += ["", "## 2.6 PM correction cases", ""]
    for c in CORRECTION_CASE_STUDIES:
        L += [f"**{c['id']}** (`{c['verbatimId']}`, rule `{c['domainRuleApplied']}`)", "",
              f"- Naive reading: {c['aiOutput']}", f"- Why it's wrong: {c['rejectionReason']}",
              f"- Correct: {c['correctAnswer']}", ""]
    rules = sorted({c["domainRuleApplied"] for c in CORRECTION_CASE_STUDIES})
    L += ["## Hand-off to Phase 3", "",
          f"- Domain rules the correction cases rely on (must exist in `domainRules.ts`): {', '.join(f'`{r}`' for r in rules)}",
          f"- Hinglish phrase mappings: {len(HINGLISH_PHRASES)} in `hinglish_phrases.json`",
          f"- Quick-load chips: {len(QUICK_LOAD_CHIPS)} in `quick_load_chips.json`", "",
          "## Limits of this analysis", "",
          f"- Only {stages['MONTH_2_4'] + stages['MONTH_5_8'] + stages['MONTH_9_12']} records are clearly past month 1, "
          "so Month 5–12 behaviour (Q2) is not supported by this corpus.",
          f"- Onboarding segment is unknown for {segs['UNKNOWN']} of {len(filtered)} records; income type and location "
          "are almost never stated (Q8).",
          "- Theme assignment and severity are one analyst's reading; the golden-set review is the check on them.", ""]
    (OUT / "PHASE2_REPORT.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
