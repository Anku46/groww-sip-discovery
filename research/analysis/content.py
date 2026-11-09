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
            "Most starts are triggered by a creator's video rather than a plan: of the 15 records from people starting on "
            "thin understanding, 8 credit a creator, often after knowing 'not a single thing' about mutual funds. Those who name a "
            "reason anchor it to a concrete goal (a child's future, investing until 55). Expectations lean towards "
            "safety and fixed outcomes — they ask whether a 12% return will come, whether SIP money is insured like a "
            "bank deposit, and whether the money can 'doob' (vanish)."
        ),
        "supportingVerbatimIds": ["YT-58a062d811", "YT-3bd904df09", "YT-686d890c18"],
        "relatedThemeIds": ["THEME_THIN_ONBOARDING", "THEME_ADVICE_SEEKING", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q2",
        "questionText": "How does behavior/emotion evolve from Month 1 through Month 8–12?",
        "answer": (
            "Before starting (29 records) the mood is curious and cautious: concept and safety questions. At setup and "
            "the first installment (33 records) it turns into money anxiety — the ₹15,000 mandate, a debit that doesn't "
            "show in the app, autopay failing — and severity peaks here (mean 3.3 for mandate setup & execution "
            "failures, 3.0 for the debit visibility gap; every mandate record is from this stage). The few later records show panic at an early loss and a wish to stop. The corpus has only 2 "
            "records clearly past month 1, so Month 5–12 behaviour cannot be described from this data; that is a gap "
            "to close with targeted collection."
        ),
        "supportingVerbatimIds": ["YT-ac0a7a0881", "YT-a39c7d51fd", "YT-c44d602746"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_DEBIT_VISIBILITY", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q3",
        "questionText": "What triggers a decision to pause, skip, or cancel?",
        "answer": (
            "Four triggers appear: (1) money that leaves the bank but sits 'in progress' with no explanation — one "
            "reviewer's brother never invested again after this; (2) bank bounce charges when the balance is short, "
            "combined with not being able to close the SIP; (3) an early loss on a SIP started on someone else's "
            "recommendation; (4) mandates or SIPs that keep getting cancelled during setup."
        ),
        "supportingVerbatimIds": ["PS-4bfd911de1", "YT-781475ace9", "YT-c44d602746"],
        "relatedThemeIds": ["THEME_DEBIT_VISIBILITY", "THEME_MANDATE_SETUP_FAILURE", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q4",
        "questionText": "What do users monitor in the app, and how often?",
        "answer": (
            "They reconcile the bank against the app: bank SMS and OTP amounts, debits to the clearing house, and "
            "whether the dashboard reflects them. After the second installment they look for a running total. They "
            "also watch returns and react when the SIP turns red. No record states a checking frequency; monitoring "
            "clusters around debit events."
        ),
        "supportingVerbatimIds": ["YT-a39c7d51fd", "YT-091789372e", "YT-4c581ec0db"],
        "relatedThemeIds": ["THEME_DEBIT_VISIBILITY", "THEME_MANDATE_SETUP_FAILURE", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q5",
        "questionText": "What inside-app elements create confusion or misplaced blame?",
        "answer": (
            "The UPI Autopay screen showing ₹15,000 for a ₹500–2,000 SIP (5 records) is read as the debit amount; a "
            "₹1 lakh bank e-mandate OTP and a mandate end date of 2064 cause the same fear. 'Allotment in progress' "
            "is read as failure or fraud, and a payable amount different from the SIP amount causes doubt. Bank bounce "
            "charges are blamed on the SIP even though the bank levies them."
        ),
        "supportingVerbatimIds": ["YT-c55a697c2d", "YT-d2b0e4b8de", "YT-781475ace9"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_DEBIT_VISIBILITY"],
    },
    {
        "id": "Q6",
        "questionText": "What outside-app workarounds do investors use?",
        "answer": (
            "The main workaround is asking strangers: 50 of the 70 records are YouTube comments, mostly questions to a "
            "creator that the app or support should have answered. Others route around SIP mechanics — placing a "
            "one-time order because the SIP date didn't fit, choosing a payment-gateway method instead of a mandate, "
            "or managing autopay from a UPI app such as Google Pay without knowing whether that stops the SIP."
        ),
        "supportingVerbatimIds": ["YT-87f077cce3", "FM-ba9e7531bc", "YT-0a654eb8b6"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_SIP_CONTROL"],
    },
    {
        "id": "Q7",
        "questionText": "What distinguishes continuers from drop-offs?",
        "answer": (
            "Evidence is indirect. People signalling persistence tie the SIP to a concrete long-term goal (a son's "
            "future, investing until 55). Drop-off signals follow an early money-mechanics problem that nobody "
            "explained (money stuck 'in progress', charges with no way to close) or a loss on conviction borrowed from "
            "a creator. Goal anchoring versus an unexplained first-month shock is the clearest contrast."
        ),
        "supportingVerbatimIds": ["YT-c965a5aa73", "YT-3bd904df09", "PS-4bfd911de1"],
        "relatedThemeIds": ["THEME_THIN_ONBOARDING", "THEME_DEBIT_VISIBILITY", "THEME_LOSS_FEAR"],
    },
    {
        "id": "Q8",
        "questionText": "Are there different churn patterns across investor segments?",
        "answer": (
            "Influencer-led starters (15) are mostly thin-onboarding and concept-gap records (11 of 15) and include a "
            "loss-panic case. Self-directed forum users (13) ask about control, concepts and product mechanics (pause, "
            "cancel, SIP types). Hinglish speakers are over-represented in the money-mechanics themes — 12 of the 22 "
            "mandate and debit-visibility records (55%) versus 34% of the corpus — and wrote all 5 loss-fear records. Income type and "
            "urban/semi-urban location are rarely stated (onboarding trigger unknown for 37 of 70), so those segments "
            "cannot be compared yet."
        ),
        "supportingVerbatimIds": ["YT-bf4e047361", "FM-fe212e54a4", "YT-ac0a7a0881"],
        "relatedThemeIds": ["THEME_THIN_ONBOARDING", "THEME_SIP_CONTROL", "THEME_MANDATE_SETUP_FAILURE"],
    },
    {
        "id": "Q9",
        "questionText": "What consistent unmet needs surface across the corpus?",
        "answer": (
            "(1) A plain-language note at the mandate step that ₹15,000 is a ceiling, not a charge. (2) One 'where is "
            "my money' timeline from bank debit to unit allotment, with the next debit date. (3) Visible control — "
            "pause, skip, stop, what each costs, and what turning off autopay in a UPI app does. (4) Beginner "
            "explainers (NAV, direct vs regular, is my money insured) in Hinglish. (5) A SEBI-safe response to 'which "
            "fund / will I get 12%' questions that educates without recommending."
        ),
        "supportingVerbatimIds": ["YT-6b72ee4430", "YT-a39c7d51fd", "FM-fe212e54a4"],
        "relatedThemeIds": ["THEME_MANDATE_SETUP_FAILURE", "THEME_DEBIT_VISIBILITY", "THEME_SIP_CONTROL",
                            "THEME_CONCEPT_GAPS", "THEME_ADVICE_SEEKING"],
    },
]

# 2.4 — 25 representative verbatims for the Dataset Explorer.
REPRESENTATIVE_VERBATIM_IDS = [
    "YT-ac0a7a0881", "YT-4c581ec0db", "FM-6c24b683f9",                                   # amount shock
    "PS-4bfd911de1", "YT-a39c7d51fd", "YT-8daa9c3e1a", "YT-091789372e",                  # debit visibility
    "PS-3228b3c7fb", "YT-cf09350a73", "YT-781475ace9", "YT-0a654eb8b6", "FM-ba9e7531bc", # setup failure
    "PS-1d44112697", "YT-c44d602746",                                                    # loss fear
    "YT-686d890c18", "FM-36421fb26e", "FM-369e8d725a",                                   # advice seeking
    "YT-89218aa1f2", "YT-bf4e047361", "FM-f4676ccb86",                                   # concept gaps
    "FM-fe212e54a4", "FM-ee9db71bab", "YT-f6c8f2912b",                                   # SIP control
    "YT-3bd904df09", "YT-e1cd70053d",                                                    # thin onboarding
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
]

# PM review of the golden set (2026-11-09). Items not listed here were confirmed as drafted.
# golden id: (theme, churnSeverity) — this is the ground truth.
GOLDEN_PM_REVIEW_DATE = "2026-11-09"
GOLDEN_PM_REVIEWED = {f"GS-{n:02d}" for n in range(1, 22)}  # GS-21 added after the first review, confirmed separately
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
    ("UPI app revocation", "YT-0a654eb8b6"),
    ("Return frustration", "YT-c44d602746"),
    ("Bounce charges, can't stop", "YT-781475ace9"),
    ("Money not showing", "YT-a39c7d51fd"),
    ("SEBI: return assurance", "YT-686d890c18"),
]

# Proposed default addressability for the opportunity formula (Phase 3 finalises).
DEFAULT_ADDRESSABILITY = {
    "THEME_DEBIT_VISIBILITY": 1.0,
    "THEME_MANDATE_SETUP_FAILURE": 0.8,  # mixed: mandate-limit copy is Groww's; bank / NPCI / UPI-app plumbing is not
    "THEME_LOSS_FEAR": 1.0,
    "THEME_ADVICE_SEEKING": 0.2,         # SEBI penalty
    "THEME_CONCEPT_GAPS": 1.0,
    "THEME_SIP_CONTROL": 1.0,
    "THEME_THIN_ONBOARDING": 1.0,
}
