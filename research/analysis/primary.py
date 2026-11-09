"""Primary research: 30-response Google Forms survey + 10 in-depth interviews (research/data/primary/).

Everyone in the survey was screened for having started a SIP, so screening here only removes people who are
not first-time investors. Five interviews repeat a survey answer almost word for word; those are the same
person and are counted once, as the interview (the richer record).

Lifecycle stage = the month the friction happened when the respondent says it ("month 2 failed"); otherwise the
lower end of their tenure band (3–6 months → MONTH_2_4, 6–12 months → MONTH_5_8, under 3 months → MONTH_0_1).
Segment = onboarding trigger (creator → INFLUENCER_LED; friend / colleague / office / family → PEER_LED; own
research → SELF_DIRECTED).
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIMARY = ROOT / "data" / "primary"

NO_FRICTION = "NO_FRICTION"

SURVEY_EXCLUSIONS = {
    "S01": "same person as interview R01 (near-identical answer); counted once as the interview",
    "S02": "same person as interview R02 (near-identical answer); counted once as the interview",
    "S03": "same person as interview R03 (near-identical answer); counted once as the interview",
    "S04": "same person as interview R04 (near-identical answer); counted once as the interview",
    "S08": "same person as interview R08 (near-identical answer); counted once as the interview",
    "S23": "started 3 years ago; not a first-time investor",
    "S25": "never started a SIP (the form screens them out)",
    "S26": "investing since 2018; not a first-time investor",
}

C, D, M, L, A, CF, SC, T = (
    "THEME_CONCEPT_GAPS", "THEME_DEBIT_VISIBILITY", "THEME_MANDATE_SETUP_FAILURE", "THEME_LOSS_FEAR",
    "THEME_ADVICE_SEEKING", "THEME_CASHFLOW_MISMATCH", "THEME_SIP_CONTROL", "THEME_THIN_ONBOARDING",
)
INF, PEER, SELF = "INFLUENCER_LED", "PEER_LED", "SELF_DIRECTED"

# id: (theme, severity, lifecycle, segment, ageBand, analyst note)
SURVEY_CODES = {
    "S05": (M, 5, "MONTH_5_8", SELF, "AGE_25_40", "bounce charges; support said wait; cancelled autopay in PhonePe"),
    "S06": (NO_FRICTION, 1, "MONTH_2_4", PEER, "UNDER_25", "senior set it up after salary day; running smoothly"),
    "S07": (M, 4, "MONTH_0_1", INF, "UNDER_25", "₹25,000 max debit for a ₹2,000 SIP; almost cancelled on day one; later paused"),
    "S09": (SC, 4, "MONTH_2_4", PEER, "UNDER_25", "paused for Diwali expenses; couldn't find how to resume"),
    "S10": (M, 5, "MONTH_5_8", INF, "AGE_25_40", "₹450 bank penalty; revoked UPI mandate in BHIM"),
    "S11": (NO_FRICTION, 1, "MONTH_2_4", PEER, "UNDER_25", "brother guided net-banking setup; watching portfolio grow"),
    "S12": (CF, 4, "MONTH_2_4", INF, "UNDER_25", "₹800 balance for a ₹1,000 SIP; failed; scary bank SMS; left it"),
    "S13": (L, 4, "MONTH_2_4", PEER, "AGE_25_40", "flat returns for 4 months; paused, then forgot"),
    "S14": (M, 5, "MONTH_5_8", PEER, "UNDER_25", "mandate approval plus debit failures; stopped"),
    "S15": (M, 2, "MONTH_0_1", SELF, "AGE_25_40", "first debit failed; re-authenticated UPI; now running"),
    "S16": (D, 5, "MONTH_2_4", INF, "UNDER_25", "debited from bank, pending 5 days in app, refunded; cancelled"),
    "S17": (NO_FRICTION, 1, "MONTH_5_8", PEER, "AGE_25_40", "date set 3 days after salary; never a balance issue"),
    "S18": (M, 2, "MONTH_2_4", PEER, "UNDER_25", "UPI mandate failed; roommate helped switch to e-mandate; running"),
    "S19": (L, 4, "MONTH_2_4", INF, "AGE_25_40", "market fell in month 4; panicked and paused; unsure when to restart"),
    "S20": (M, 5, "MONTH_2_4", PEER, "UNDER_25", "mandate approval failed twice; month 2 bounced; stopped"),
    "S21": (NO_FRICTION, 1, "MONTH_2_4", SELF, "AGE_25_40", "net-banking mandate; smooth so far"),
    "S22": (T, 1, "MONTH_0_1", INF, "UNDER_25", "student, ₹500 pocket-money SIP, 2 weeks in"),
    "S24": (CF, 4, "MONTH_2_4", PEER, "AGE_25_40", "freelancer; unpredictable income; automated debits don't fit"),
    "S27": (T, 1, "MONTH_0_1", INF, "UNDER_25", "month 1 done; waiting to see"),
    "S28": (CF, 5, "MONTH_2_4", INF, "UNDER_25", "student, no regular income; failed debit scared them; stopped"),
    "S29": (CF, 4, "MONTH_5_8", SELF, "AGE_25_40", "freelancer; cash-flow mismatch caused debit failure; paused"),
    "S30": (T, 1, "MONTH_0_1", PEER, "AGE_25_40", "started 45 days ago on a colleague's nudge"),
}

INTERVIEW_CODES = {
    "R01": (M, 5, "MONTH_2_4", PEER, "UNDER_25", "₹15,000 limit fear; month 2 bounce + ₹295 penalty; no retry button; silent lapse"),
    "R02": (M, 5, "MONTH_2_4", INF, "UNDER_25", "units took Fri→Wed; month 3 debit failed; bot unhelpful; revoked in PhonePe"),
    "R03": (CF, 4, "MONTH_2_4", PEER, "UNDER_25", "SIP on the 5th, salary around the 7th; failed twice unexplained; paused"),
    "R04": (D, 5, "MONTH_2_4", PEER, "AGE_25_40", "month 3 mandate timeout; no alert; noticed 60 days later (silent lapse)"),
    "R05": (CF, 5, "MONTH_2_4", SELF, "UNDER_25", "balance dipped before payday; ₹350 penalty; support said not our problem; cancelled"),
    "R06": (M, 5, "MONTH_2_4", INF, "AGE_25_40", "bank glitch failed month 4; bank SMS warning; revoked autopay in GPay"),
    "R07": (M, 4, "MONTH_2_4", INF, "UNDER_25", "'Mandate Expired' jargon in month 2; didn't know what a mandate is; forgot; paused"),
    "R08": (D, 4, "MONTH_2_4", PEER, "UNDER_25", "'In Progress' 4 days then failed; no pay-now button; trust lost"),
    "R09": (NO_FRICTION, 1, "MONTH_2_4", PEER, "UNDER_25", "father explained T+2 and picked the 10th; smooth"),
    "R10": (M, 5, "MONTH_2_4", INF, "AGE_25_40", "setup failed twice; month 3 bounce; feared CIBIL impact; cancelled"),
}

SURVEY_QUOTE_COL = "Anything that almost made you stop, or kept you going? (Quote)"


def load_survey() -> list[dict]:
    return list(csv.DictReader((PRIMARY / "survey_responses.csv").open(encoding="utf-8")))


def load_interviews() -> list[dict]:
    return list(csv.DictReader((PRIMARY / "interviews_anonymized.csv").open(encoding="utf-8")))


def records() -> tuple[list[dict], dict]:
    """Coded primary-research records (same shape as Phase 2 filtered records) and the exclusion log."""
    survey, interviews = load_survey(), load_interviews()
    assert set(SURVEY_CODES) | set(SURVEY_EXCLUSIONS) == {r["id"] for r in survey}, "every survey row must be coded or excluded"
    assert not set(SURVEY_CODES) & set(SURVEY_EXCLUSIONS)
    assert set(INTERVIEW_CODES) == {r["id"] for r in interviews}
    out = []
    for r in survey:
        if r["id"] not in SURVEY_CODES:
            continue
        theme, sev, stage, seg, age, note = SURVEY_CODES[r["id"]]
        out.append({
            "id": f"SV-{r['id']}", "source": "Survey", "subSource": "Google Forms", "language": "English",
            "date": r["Timestamp"][:10], "url": "", "rawText": r[SURVEY_QUOTE_COL].strip(),
            "inclusionReason": "primary_research:survey", "primaryThemeId": theme, "churnSeverity": sev,
            "lifecycleStage": stage, "userSegment": seg, "ageBand": age, "analystNote": note,
        })
    for r in interviews:
        theme, sev, stage, seg, age, note = INTERVIEW_CODES[r["id"]]
        out.append({
            "id": f"IN-{r['id']}", "source": "Interview", "subSource": "In-depth interview", "language": "English",
            "date": "unknown", "url": "", "rawText": r["quote"].strip(),
            "inclusionReason": "primary_research:interview", "primaryThemeId": theme, "churnSeverity": sev,
            "lifecycleStage": stage, "userSegment": seg, "ageBand": age, "analystNote": note,
        })
    return out, {f"SV-{k}": v for k, v in SURVEY_EXCLUSIONS.items()}


def survey_stats() -> dict:
    """Structured-answer counts over the eligible respondents (first-time investors, people counted once)."""
    eligible = [r for r in load_survey() if r["id"] not in ("S23", "S25", "S26")]
    n = len(eligible)
    col = lambda name: [r[name] for r in eligible]
    count = lambda name, pred: sum(1 for v in col(name) if pred(v))
    status = "What is the status of your SIP today?"
    return {
        "eligibleRespondents": n,
        "mandateLimitConfused": count("During setup, did anything confuse or worry you?", lambda v: "limit was higher" in v),
        "instalmentFailedOrPaused": count("Has an instalment ever failed, been skipped, or paused?", lambda v: v.startswith("Yes")),
        "debitFailed": count("Has an instalment ever failed, been skipped, or paused?", lambda v: "debit failed" in v),
        "failedDontKnowWhy": count("Has an instalment ever failed, been skipped, or paused?", lambda v: "don’t know why" in v),
        "didNothing": count("If something went wrong, what did you do first?", lambda v: v.startswith("Did nothing")),
        "unitsAfter3Days": count("After money was debited, when did you see units in app?", lambda v: v.startswith("More than 3")),
        "statusActive": count(status, lambda v: v.startswith("Active")),
        "statusPaused": count(status, lambda v: v == "Paused"),
        "statusStopped": count(status, lambda v: v.startswith("Stopped")),
        "statusUnsure": count(status, lambda v: v.startswith("Not sure")),
    }
