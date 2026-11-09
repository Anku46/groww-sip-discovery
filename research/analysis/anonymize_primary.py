"""Copy the primary-research files into research/data/primary/, anonymizing the interviews.

    python -m analysis.anonymize_primary [path/to/Google_Forms_Raw_Responses.csv] [path/to/Interviews_10_Responses.csv]

The interview source file has names, cities, job titles and salaries. Only an anonymized version is kept in the
repo: participant names are replaced, and demographics are reduced to age band and work stage. The original
files stay outside version control.
"""
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT.parent
OUT = ROOT / "data" / "primary"


def _age_band(codes: str) -> str:
    m = re.search(r"Q3:\s*([^|]+)", codes)
    return m.group(1).strip() if m else "unknown"


def main(survey_src: Path, interview_src: Path):
    OUT.mkdir(parents=True, exist_ok=True)

    # Survey: no names or contact details; copied as-is.
    rows = list(csv.reader(survey_src.open(encoding="utf-8")))
    with (OUT / "survey_responses.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id"] + rows[0])
        for i, r in enumerate(rows[1:], start=1):
            w.writerow([f"S{i:02d}"] + r)

    # Interviews: strip names and identifying demographics.
    rows = list(csv.DictReader(interview_src.open(encoding="utf-8")))
    names = {r["User Alias"].split()[0] for r in rows if r.get("User Alias")}
    name_re = re.compile(r"\b(" + "|".join(map(re.escape, sorted(names, key=len, reverse=True))) + r")(?:'s)?\b")
    text_cols = ["Onboarding Trigger", "The Breaking Point / Friction Moment", "Outside-App Action & Workaround",
                 "Key Verbatim Quote", "Core PM Takeaway for MVP"]
    out_cols = ["id", "age_band", "work_stage", "sip_amount_and_payment", "survey_codes", "onboarding_trigger",
                "friction_moment", "outside_app_action", "quote", "pm_takeaway"]
    with (OUT / "interviews_anonymized.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=out_cols)
        w.writeheader()
        for r in rows:
            demo = r["Demographics & Segment"]
            work = "first job" if "First job" in demo else ("salaried 2+ yrs" if "Salaried" in demo else "unknown")
            # Keep amount and payment rail; drop the fund name.
            sip = r["SIP Details & Platform"]
            amount = sip.split(" / month")[0].strip() + " / month"
            rail = re.search(r"\((via [^)]*)\)", sip)
            clean = {c: re.sub(r"(^|[.!?]\s+)the participant", lambda m: m.group(1) + "The participant",
                               name_re.sub("the participant", r[c]).strip()) for c in text_cols}
            w.writerow({
                "id": r["ID"], "age_band": _age_band(r["Survey Codes (Q1,3,4,6,8)"]), "work_stage": work,
                "sip_amount_and_payment": f"{amount}, {rail.group(1)}" if rail else amount,
                "survey_codes": r["Survey Codes (Q1,3,4,6,8)"],
                "onboarding_trigger": clean["Onboarding Trigger"],
                "friction_moment": clean["The Breaking Point / Friction Moment"],
                "outside_app_action": clean["Outside-App Action & Workaround"],
                "quote": clean["Key Verbatim Quote"].strip('"').strip("“”"),
                "pm_takeaway": clean["Core PM Takeaway for MVP"],
            })
    leftover = [n for n in names if n in (OUT / "interviews_anonymized.csv").read_text(encoding="utf-8")]
    assert not leftover, f"names still present: {leftover}"
    print(f"Wrote {OUT / 'survey_responses.csv'} and {OUT / 'interviews_anonymized.csv'} (names removed: {sorted(names)})")


if __name__ == "__main__":
    s = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT / "Google_Forms_Raw_Responses.csv"
    i = Path(sys.argv[2]) if len(sys.argv) > 2 else PROJECT / "Interviews_10_Responses.csv"
    main(s, i)
