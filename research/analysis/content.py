"""Phase 2.3–2.6 analyst content: discovery answers, verbatim + golden-set selection, correction cases,
plus Phase 3 hand-off lists (Hinglish phrases, quick-load chips).

All IDs refer to records in the filtered corpus; build.py checks that every reference resolves.
Counts quoted in answers come from analysis/coding.py (n = 70 filtered records).
"""

DISCOVERY_ANSWERS = [
    {
        "id": "Q1",
        "questionText": "Why do first-time investors start a SIP, and what are their expectations?",
        "answer": (
            "Someone else starts them. In the survey of 27 first-time investors, 14 started because a friend, "
            "colleague, office talk or family member nudged them and 9 because of a YouTube or Instagram creator; only "
            "4 did their own research. The public corpus shows the same pull of creators. Expectations are that a SIP "
            "is hassle-free and automatic, and often that it is safe or that a specific return will come (“will I "
            "get 12%?”). The first time the payment plumbing shows through, that expectation breaks."
        ),
        "supportingVerbatimIds": ["SV-S14", "YT-58a062d811", "YT-686d890c18"],
        "relatedThemeIds": ["THEME_THIN_ONBOARDING", "THEME_ADVICE_SEEKING", "THEME_MANDATE_SETUP_FAILURE"],
    },
    {
        "id": "Q2",
        "questionText": "How does behavior/emotion evolve from Month 1 through Month 8–12?",
        "answer": (
            "Before starting: curious and cautious. At setup: alarm at the mandate ceiling (19 of 27 survey "
            "respondents were thrown by a limit far above their SIP). Months 2–4 are the danger window: 22 of the 32 "
            "survey and interview records place their decisive moment there, nearly always the first failed debit, "
            "followed by a bank penalty, an unexplained status, or no way to retry. Emotion moves from worry to "
            "embarrassment or panic, then to inaction: the SIP is paused, left “to sort out later”, or silently "
            "lapses. People who get past month 4 without a failure keep running. The data still has no records from "
            "months 9–12."
        ),
        "supportingVerbatimIds": ["YT-ac0a7a0881", "IN-R01", "IN-R04"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_CASHFLOW_MISMATCH", "THEME_DEBIT_VISIBILITY"],
    },
    {
        "id": "Q3",
        "questionText": "What triggers a decision to pause, skip, or cancel?",
        "answer": (
            "The first failed instalment. 20 of 27 survey respondents had an instalment fail, get skipped or get "
            "paused, and only 2 of those 20 are still active; all 7 who never had one are still running. The failure "
            "itself usually comes from the SIP date landing before salary or a low balance, a bank-side or UPI glitch, "
            "or a reason the investor never learns (5 of 27). What turns it into a stop is the bank's bounce charge "
            "(₹295–450, often felt more than the instalment), no in-app explanation, and no way to pay that month. "
            "Early flat or negative returns trigger pauses too, and money stuck “in progress” triggers cancellations."
        ),
        "supportingVerbatimIds": ["IN-R05", "SV-S10", "IN-R03"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_CASHFLOW_MISMATCH", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q4",
        "questionText": "What do users monitor in the app, and how often?",
        "answer": (
            "They reconcile bank SMS against the app around debit dates: was money taken, and did units appear? 5 of "
            "27 survey respondents saw units more than 3 days after the debit, and in interviews that gap was read as "
            "money lost. Outside debit days most don't watch at all, which is why a failed instalment can go "
            "unnoticed for two months. Continuers describe a light monthly check of the portfolio."
        ),
        "supportingVerbatimIds": ["IN-R02", "IN-R04", "YT-a39c7d51fd"],
        "relatedThemeIds": ["THEME_DEBIT_VISIBILITY", "THEME_MANDATE_SETUP_FAILURE"],
    },
    {
        "id": "Q5",
        "questionText": "What inside-app elements create confusion or misplaced blame?",
        "answer": (
            "The autopay screen showing ₹15,000 or ₹25,000 for a ₹500–2,500 SIP (70% of survey respondents); status "
            "labels like “Mandate Expired”, “Payment Initiated” or “In Progress” that then fail silently; a warning "
            "icon with no action; and no button to retry or pay the missed month. Bank bounce charges are blamed on "
            "the investment app, and support calling them “not our problem” deepens the distrust."
        ),
        "supportingVerbatimIds": ["IN-R07", "IN-R08", "YT-c55a697c2d"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_DEBIT_VISIBILITY"],
    },
    {
        "id": "Q6",
        "questionText": "What outside-app workarounds do investors use?",
        "answer": (
            "The main escape hatch is revoking the autopay mandate directly in a UPI app (PhonePe, Google Pay or BHIM) "
            "to stop further bounce charges, which ends the SIP without the investment app seeing a cancellation. "
            "Others search Google, YouTube or Reddit, ask a friend or roommate (one switched to a net-banking mandate "
            "that way), or ask creators in YouTube comments. The most common response is no response: 13 of 27 survey "
            "respondents did nothing, and none of those 13 are still active."
        ),
        "supportingVerbatimIds": ["IN-R06", "SV-S10", "SV-S18"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_SIP_CONTROL"],
    },
    {
        "id": "Q7",
        "questionText": "What distinguishes continuers from drop-offs?",
        "answer": (
            "Continuers had someone explain the mechanics up front (a parent, sibling or senior) and picked a SIP date "
            "a few days after salary, so the first debits went through. Every survey respondent who never had a "
            "failed instalment is still active, and 2 of 3 on a bank e-mandate are active versus 7 of 23 on UPI "
            "Autopay. Drop-offs hit one failure early and had no clear way to recover. The public corpus adds that "
            "people anchored to a concrete goal talk about continuing."
        ),
        "supportingVerbatimIds": ["IN-R09", "SV-S17", "IN-R01"],
        "relatedThemeIds": ["THEME_CASHFLOW_MISMATCH", "THEME_MANDATE_SETUP_FAILURE", "THEME_THIN_ONBOARDING"],
    },
    {
        "id": "Q8",
        "questionText": "Are there different churn patterns across investor segments?",
        "answer": (
            "Income type matters most: neither freelancer in the survey is still active and both students struggled, "
            "because fixed-date automatic debits don't fit irregular income. Among salaried first-jobbers 4 of 13 are "
            "active versus 4 of 10 with 2+ years' experience. Creator-led starters fare worst (2 of 9 active) next to "
            "friend- or colleague-led ones (3 of 10). In the public corpus, Hinglish speakers are over-represented in "
            "mandate and debit confusion. The survey is small, so treat these as directions to test, not rates."
        ),
        "supportingVerbatimIds": ["SV-S24", "SV-S28", "YT-ac0a7a0881"],
        "relatedThemeIds": ["THEME_CASHFLOW_MISMATCH", "THEME_THIN_ONBOARDING", "THEME_MANDATE_SETUP_FAILURE"],
    },
    {
        "id": "Q9",
        "questionText": "What consistent unmet needs surface across the corpus?",
        "answer": (
            "(1) A plain note at setup that the mandate amount is a ceiling, not a charge. (2) A SIP date chosen "
            "around salary day, plus a balance reminder the day before the debit. (3) A same-day “retry / pay this "
            "month now” after a failed debit. (4) A proactive alert when an instalment fails, with the reason in "
            "plain language instead of jargon. (5) Reassurance on who charges the bounce fee and that a SIP bounce "
            "doesn't touch the credit score. (6) A clear unit-allotment timeline. (7) Easy pause and resume. "
            "(8) SEBI-safe education for “which fund / how much return” questions."
        ),
        "supportingVerbatimIds": ["IN-R01", "IN-R10", "YT-a39c7d51fd"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_CASHFLOW_MISMATCH", "THEME_DEBIT_VISIBILITY",
                            "THEME_SIP_CONTROL", "THEME_ADVICE_SEEKING"],
    },
]

# 2.4 — 25 representative verbatims for the Dataset Explorer.
REPRESENTATIVE_VERBATIM_IDS = [
    "YT-ac0a7a0881", "IN-R03", "FM-6c24b683f9",                                   # amount shock
    "PS-4bfd911de1", "YT-a39c7d51fd", "IN-R04", "IN-R08",                  # debit visibility
    "PS-3228b3c7fb", "YT-cf09350a73", "YT-781475ace9", "YT-0a654eb8b6", "IN-R06", # setup failure
    "PS-1d44112697", "YT-c44d602746",                                                    # loss fear
    "YT-686d890c18", "FM-36421fb26e", "FM-369e8d725a",                                   # advice seeking
    "SV-S19", "YT-bf4e047361", "FM-f4676ccb86",                                   # concept gaps
    "FM-fe212e54a4", "FM-ee9db71bab", "YT-f6c8f2912b",                                   # SIP control
    "YT-3bd904df09", "SV-S24",                                                    # thin onboarding
]

# 2.5 — golden set. Labels are the analyst's draft; the PM confirms or edits them (they become ground truth).
GOLDEN_SET = [
    ("YT-c55a697c2d", None),
    ("YT-fbd7c3e67f", None),
    ("YT-c8731e68cb", "Hinglish; reads like a loan-EMI worry"),
    ("PS-04ff53cf14", "'payment failed' wording looks like a setup failure, but the money was taken and refunded"),
    ("YT-e1169600b1", "Hinglish; mentions autopay failing, but the complaint is being debited twice"),
    ("YT-cf814de541", "Hinglish"),
    ("YT-871e2b378c", None),
    ("YT-87f077cce3", "workaround described inside a setup problem"),
    ("YT-781475ace9", "mentions loss first, but the driver is bank bounce charges (misplaced blame)"),
    ("YT-7244673a53", "Hinglish; includes a return question (SEBI-adjacent) but the primary worry is safety"),
    ("YT-0717631aa4", "Hinglish; validation-seeking could read as advice-seeking"),
    ("YT-f623c39d56", "SEBI-restricted"),
    ("YT-e1cb9d58c3", "SEBI-restricted"),
    ("FM-75460b039f", "SEBI-adjacent: asks what someone would do in their place"),
    ("YT-5d5cfade09", None),
    ("FM-eb217305e9", "ELSS strategy question could read as advice-seeking"),
    ("YT-a9e8c0f6ab", "'zero knowledge' could read as thin onboarding; the ask is a return calculation"),
    ("YT-f5061e8c90", None),
    ("FM-61a1c6ce0b", None),
    ("YT-58a062d811", None),
    ("FM-fe212e54a4", "added after PM review so Rigid SIP controls has a golden item"),
    ("IN-R03", "new theme from primary research; pending PM confirmation"),
]

# PM review of the golden set (2026-11-09). Items not listed here were confirmed as drafted.
# golden id: (theme, churnSeverity) — this is the ground truth.
GOLDEN_PM_REVIEW_DATE = "2026-11-09"
GOLDEN_PM_REVIEWED = {f"GS-{n:02d}" for n in range(1, 23)}  # GS-21 and GS-22 were added later and confirmed separately
GOLDEN_PM_OVERRIDES = {
    "GS-01": ("THEME_MANDATE_SETUP_FAILURE", 3),
    "GS-02": ("THEME_MANDATE_SETUP_FAILURE", 3),
    "GS-03": ("THEME_MANDATE_SETUP_FAILURE", 3),
    "GS-05": ("THEME_MANDATE_SETUP_FAILURE", 4),
    "GS-06": ("THEME_THIN_ONBOARDING", 2),
    "GS-08": ("THEME_THIN_ONBOARDING", 3),
    "GS-09": ("THEME_LOSS_FEAR", 5),
    "GS-11": ("THEME_CONCEPT_GAPS", 2),
    "GS-18": ("THEME_THIN_ONBOARDING", 2),
    "GS-19": ("THEME_THIN_ONBOARDING", 2),
    "GS-20": ("THEME_ADVICE_SEEKING", 1),
}

# 2.6 — where a surface reading (or a naive AI) gets it wrong.
CORRECTION_CASE_STUDIES = [
    {
        "id": "CC-1",
        "verbatimId": "YT-c55a697c2d",
        "aiOutput": "Billing error: app tries to charge ₹15,000/month on a ₹500 SIP. Theme: overcharging. Severity 5.",
        "rejectionReason": (
            "₹15,000 is the UPI Autopay mandate's maximum limit, not the debit. Only the SIP amount is debited each "
            "month. Nothing was charged; the investor is confused, not harmed."
        ),
        "correctAnswer": "Theme: Autopay mandate setup & execution failures. Severity 3 (worry, no money lost).",
        "domainRuleApplied": "RULE_UPI_MANDATE_LIMIT",
    },
    {
        "id": "CC-2",
        "verbatimId": "YT-0a654eb8b6",
        "aiOutput": "How-to question about using Google Pay. Theme: concept gap. Severity 2, low priority.",
        "rejectionReason": (
            "UPI Autopay mandates can be paused or revoked from any UPI app. Turning it off in Google Pay silently "
            "stops the Groww SIP's debits without the investor cancelling anything in Groww — a churn path outside "
            "Groww's control that the investor doesn't understand."
        ),
        "correctAnswer": "Theme: Autopay mandate setup & execution failures (platform-dependent). Severity 3.",
        "domainRuleApplied": "RULE_UPI_REVOKE",
    },
    {
        "id": "CC-3",
        "verbatimId": "YT-686d890c18",
        "aiOutput": "Concept question about Nifty 50 returns. Answer: 'yes, ~12% long-term is typical'. Addressability 1.0.",
        "rejectionReason": (
            "Confirming or predicting a return is prohibited under SEBI rules for a non-RIA platform. The need is real "
            "but can only be met with education, so addressability must be penalised."
        ),
        "correctAnswer": "Theme: Seeking fund picks & return assurances. SEBI_NO_RETURN_PRED → addressability 0.2.",
        "domainRuleApplied": "SEBI_NO_RETURN_PRED",
    },
    {
        "id": "CC-4",
        "verbatimId": "YT-781475ace9",
        "aiOutput": "Billing complaint: Groww is charging extra fees and the SIP is stuck. Theme: mandate failure. Severity 3.",
        "rejectionReason": (
            "The extra deductions are NACH/UPI mandate bounce charges levied by the investor's bank when the balance "
            "is short, not Groww fees, so 'billing complaint' blames the wrong party. What drives the message is the "
            "loss the investor opens with: the charges compound a loss they already feel, and they want out."
        ),
        "correctAnswer": "Theme: Fear of loss & early negative returns. Severity 5 (wants to stop, can't).",
        "domainRuleApplied": "RULE_NACH_BOUNCE",
    },
    {
        "id": "CC-5",
        "verbatimId": "PS-4bfd911de1",
        "aiOutput": "App performance complaint about slow status. Theme: app bug. Severity 3.",
        "rejectionReason": (
            "Mutual-fund orders move through payment, order placement and unit allotment over a few business days; "
            "'in progress' is normal. The reviewer also reports a real drop-off — their brother never invested again "
            "after the same experience — which makes this a retention signal, not a cosmetic bug."
        ),
        "correctAnswer": "Theme: Debit & allotment visibility gap. Severity 5 (documented abandonment).",
        "domainRuleApplied": "RULE_NAV_ALLOC_DELAY",
    },
    {
        "id": "CC-6",
        "verbatimId": "IN-R10",
        "aiOutput": "Investor panicking about the investment losing value. Theme: fear of loss. Severity 3.",
        "rejectionReason": (
            "The panic is about the credit score, not the market: a bank SMS about a failed mandate made the "
            "investor think a SIP bounce would hurt their CIBIL score, as a missed loan EMI would. A SIP is not a "
            "loan, so a failed SIP debit is not reported to credit bureaus; only the bank's return charge applies. "
            "With no reassurance in the app, the investor cancelled everything."
        ),
        "correctAnswer": "Theme: Autopay mandate setup & execution failures. Severity 5 (cancelled).",
        "domainRuleApplied": "RULE_SIP_BOUNCE_NO_CIBIL",
    },
]

# Phase 3 hand-off: Hinglish phrases seen in the corpus -> normalised English intent.
HINGLISH_PHRASES = [
    ("paisa doob jata", "the money gets lost", "PS-1d44112697"),
    ("kat gaya / kt gye", "was debited", "YT-e1169600b1"),
    ("katega", "will be debited", "YT-ac0a7a0881"),
    ("apne aap kat jayega", "will be auto-debited", "YT-cf814de541"),
    ("khud dalna hoga", "will have to pay manually", "YT-cf814de541"),
    ("loss ho gya", "is now at a loss", "YT-c44d602746"),
    ("kya kre", "what should I do", "YT-6b72ee4430"),
    ("dar lagta h", "I feel scared", "YT-654aec4949"),
    ("band kar dete", "turn off / stop", "YT-0a654eb8b6"),
    ("ruk to nahin jayegi", "will it not stop", "YT-0a654eb8b6"),
    ("kaise kare", "how to do it", "YT-b30f668b12"),
    ("kitna milega", "how much will I get", "YT-7244673a53"),
    ("samjh nhi pa raha", "I can't understand", "YT-4c581ec0db"),
    ("dikha raha hai", "is showing", "YT-6b72ee4430"),
    ("sip chalu ki", "started the SIP", "YT-c44d602746"),
    ("pata nhi", "I don't know", "YT-654aec4949"),
    ("closed nhi hui", "did not get closed", "YT-781475ace9"),
    ("kyu kaat te h", "why do they deduct", "YT-e1169600b1"),
]

# Phase 3 hand-off: Tab 1 quick-load chips (real verbatims covering different pipeline paths).
QUICK_LOAD_CHIPS = [
    ("Hinglish mandate amount", "YT-ac0a7a0881"),
    ("UPI app revocation", "IN-R06"),
    ("Return frustration", "YT-c44d602746"),
    ("Bounce charges, can't stop", "YT-781475ace9"),
    ("Salary date mismatch", "IN-R03"),
    ("SEBI: return assurance", "YT-686d890c18"),
]

# Proposed default addressability for the opportunity formula (Phase 3 finalises).
DEFAULT_ADDRESSABILITY = {
    "THEME_DEBIT_VISIBILITY": 1.0,
    "THEME_MANDATE_SETUP_FAILURE": 0.8,  # mixed: mandate-limit copy is Groww's; bank / NPCI / UPI-app plumbing is not
    "THEME_LOSS_FEAR": 1.0,
    "THEME_CASHFLOW_MISMATCH": 1.0,
    "THEME_ADVICE_SEEKING": 0.2,         # SEBI penalty
    "THEME_CONCEPT_GAPS": 1.0,
    "THEME_SIP_CONTROL": 1.0,
    "THEME_THIN_ONBOARDING": 1.0,
}
