"""Analyst coding of the filtered corpus (Phase 2.1 review + 2.2 theme clustering).

Every record that the rule-based filter includes was read in full. Records that turned out not to be
first-time investor voice are listed in REVIEW_EXCLUSIONS with the reason. Every remaining record is
coded in CODES.

Severity rubric (churn severity, 1-5):
  1  positive / curious, no friction
  2  question or confusion, no sign of wanting to stop
  3  frustration or worry about money already committed
  4  money stuck / repeated failure / explicit fear, trust at risk
  5  wants to stop, cannot stop, or describes someone abandoning SIPs

Lifecycle: PRE_START (considering / about to start), MONTH_0_1 (setup and first installment),
           MONTH_2_4, MONTH_5_8, MONTH_9_12, UNKNOWN (not stated)
Segment (onboarding trigger): INFLUENCER_LED, PEER_LED, SELF_DIRECTED, UNKNOWN
Age band: UNDER_25, AGE_25_40, OVER_40, UNKNOWN
"""

THEMES = {
    "THEME_DEBIT_VISIBILITY": {
        "name": "Debit & allotment visibility gap",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "Money leaves the bank but the app shows 'in progress', nothing, or a different amount; investors can't "
            "tell where their money is, when the next installment will be debited, or how it reaches the fund."
        ),
    },
    "THEME_MANDATE_SETUP_FAILURE": {
        "name": "Autopay mandate setup & execution failures",
        "sebiRestricted": False,
        "platformDependent": True,
        "summary": (
            "Everything around the autopay mandate: a ₹500–2,000 SIP shows a ₹15,000 UPI Autopay limit, a ₹1 lakh "
            "e-mandate OTP, an end date decades away or a ₹5,000 initial investment, and investors fear that amount "
            "will be debited (the mandate is a ceiling, not a charge). Autopay can't be set up, SIPs get cancelled "
            "repeatedly, autopay fails after the first payment and the investor is debited twice, and nobody knows "
            "whether turning off autopay in a UPI app stops the SIP. Part of this is Groww's screens; part sits with "
            "banks, NPCI and UPI apps."
        ),
    },
    "THEME_CASHFLOW_MISMATCH": {
        "name": "Debit date vs cash-flow mismatch",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "The SIP date doesn't match when money actually arrives: salary lands on the 7th while the SIP debits on "
            "the 5th, the balance dips just before payday, or income is irregular (freelancers, students). The debit "
            "bounces, the bank charges a penalty, and the investor pauses or stops. Surfaced by the primary survey "
            "and interviews."
        ),
    },
    "THEME_LOSS_FEAR": {
        "name": "Fear of loss & early negative returns",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "New investors ask whether SIP money can 'doob' (vanish), whether it is insured like a bank deposit, and "
            "panic when an early SIP shows a loss — often after starting on someone else's recommendation. When the "
            "loss arrives together with bank bounce charges, they want out."
        ),
    },
    "THEME_ADVICE_SEEKING": {
        "name": "Seeking fund picks & return assurances",
        "sebiRestricted": True,
        "platformDependent": False,
        "summary": (
            "Beginners ask which fund or company is best, whether a 12% return is assured, or what someone would "
            "personally choose in their place. Groww can't answer these without breaching SEBI's no-advice rules."
        ),
    },
    "THEME_CONCEPT_GAPS": {
        "name": "Basic concept gaps",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "Questions about what NAV is and which NAV applies, how compounding works in growth funds, direct vs "
            "regular plans, ELSS lock-in, daily SIPs, and how different SIP types differ."
        ),
    },
    "THEME_SIP_CONTROL": {
        "name": "Rigid SIP controls (pause / skip / cancel / modify)",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "Investors want to know how to stop, pause, cancel before the first installment, change the amount or "
            "date, and what happens if money isn't there on the SIP date — and whether any of it costs them."
        ),
    },
    "THEME_THIN_ONBOARDING": {
        "name": "Influencer-led start on thin understanding",
        "sebiRestricted": False,
        "platformDependent": False,
        "summary": (
            "People start their first SIP because a creator's video motivated them, often saying they knew nothing "
            "before. Their first questions show how little the start rested on: is the next installment automatic, "
            "is there a penalty to cancel, can the amount change, how many installments before stopping."
        ),
    },
}

# Rule-included records that the analyst review removed.
REVIEW_EXCLUSIONS = {
    "PS-0209e91625": "IPO mandate complaint; SIP is incidental, no first-time signal",
    "PS-adc4ed1d54": "matched '2 months ago'; cancelled-SIP notification bug, no first-time signal",
    "AS-b6e1c7ff94": "matched '3 months ago'; redemption delay, no first-time signal",
    "YT-11d9d0ac29": "another commenter answering a question, not investor's own experience",
    "YT-02d0bc3914": "says they stopped a SIP but nothing indicates a first-time investor",
    "FM-3a31070d73": "newbie in direct equity stocks, not SIP / mutual funds",
    "FM-91962fe717": "stock analysis (HDFC Bank), not investor experience",
    "FM-652740dbce": "mid-cap vs large-cap stock discussion",
    "FM-af992d1f00": "expert explanation of NACH mechanics (used as domain reference, not investor voice)",
    "FM-7799610730": "experienced investor moving an existing holding into an AMC SIP",
    "FM-5d3857e526": "opinion piece on SIP returns",
    "FM-cff00db781": "commentary about other investors",
    "FM-ff00bbd0ce": "market-flows commentary",
    "FM-514beb421c": "answer to another user's question",
    "FM-f454cba40a": "experienced stock investor's portfolio update",
    "FM-240adf1d92": "promotional article",
    "FM-ea282a1248": "has run SIPs for 2-3 years",
    "FM-df986cfd90": "explainer article on ELSS",
    "FM-141a544ae1": "long-form index-investing analysis",
    "FM-4f2ba5dba4": "explainer article on ELSS SIP vs lumpsum",
    "FM-871bd1fcf3": "experienced user setting up ETF SIPs",
    "FM-517c8a283a": "reply in an economics debate",
    "FM-73ef79ea1e": "has used SIPs for over a year",
    "FM-b6a1f9ffae": "feature request from an existing weekly-SIP user",
    "FM-f48e825d5d": "experienced daily/weekly SIP user",
    "FM-ce0dae280f": "has 12 linked SIPs, experienced",
    "FM-8e6ecfa78e": "discussion prompt about investors in general",
}

# THEME_MANDATE_AMOUNT_SHOCK was merged into THEME_MANDATE_SETUP_FAILURE after the PM golden-set review (2026-11-09).
T2, T3, T4 = "THEME_DEBIT_VISIBILITY", "THEME_MANDATE_SETUP_FAILURE", "THEME_LOSS_FEAR"
T5, T6, T7, T8 = "THEME_ADVICE_SEEKING", "THEME_CONCEPT_GAPS", "THEME_SIP_CONTROL", "THEME_THIN_ONBOARDING"
INF, PEER, SELF, UNK = "INFLUENCER_LED", "PEER_LED", "SELF_DIRECTED", "UNKNOWN"

# id: (theme, severity, lifecycle, segment, ageBand, analyst note)
CODES = {
    # Play Store
    "PS-04ff53cf14": (T2, 3, "MONTH_0_1", UNK, "UNKNOWN", "paid, 'allotment in progress' for 5 days, then failed + refunded"),
    "PS-4bfd911de1": (T2, 5, "MONTH_0_1", PEER, "UNKNOWN", "stuck 'in progress'; brother abandoned investing after same issue"),
    "PS-1d44112697": (T4, 3, "PRE_START", UNK, "UNKNOWN", "asks if SIP money can vanish"),
    "PS-3228b3c7fb": (T3, 4, "MONTH_0_1", UNK, "UNKNOWN", "can't set up autopay; prompt shown once then lost"),
    # YouTube
    "YT-a6c9adf8f7": (T8, 1, "PRE_START", INF, "UNKNOWN", "knew nothing before the video"),
    "YT-e21d33bfae": (T8, 1, "PRE_START", INF, "UNKNOWN", "beginner, learned from the video"),
    "YT-12a02a086a": (T8, 1, "PRE_START", INF, "UNKNOWN", "learning from scratch"),
    "YT-89218aa1f2": (T6, 2, "MONTH_0_1", UNK, "UNKNOWN", "which NAV applies to each installment"),
    "YT-cf09350a73": (T3, 4, "MONTH_0_1", UNK, "UNKNOWN", "paid first SIP, can't complete mandate; 'is my money lost?'"),
    "YT-5d5cfade09": (T6, 2, "PRE_START", UNK, "UNKNOWN", "what is NAV"),
    "YT-f5061e8c90": (T8, 2, "PRE_START", UNK, "UNKNOWN", "cancel penalty? can amount change monthly?"),
    "YT-87f077cce3": (T8, 3, "MONTH_0_1", UNK, "UNKNOWN", "SIP date issue forced a one-time order; wants SIP without autopay"),
    "YT-6cad39cf19": (T8, 1, "PRE_START", INF, "UNKNOWN", "newbie, follows creator"),
    "YT-0ddb8894ab": (T6, 2, "PRE_START", UNK, "UNKNOWN", "how to SIP into stocks"),
    "YT-4c581ec0db": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹500 SIP, bank OTP for ₹1 lakh e-mandate"),
    "YT-d2b0e4b8de": (T2, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹1,000 first SIP shows payable ₹559"),
    "YT-d7922ee8ab": (T8, 1, "PRE_START", INF, "UNKNOWN", "beginner motivated to invest for family"),
    "YT-e1cd70053d": (T8, 1, "PRE_START", PEER, "UNKNOWN", "everyone told her MF is good; didn't understand it"),
    "YT-04d89b7c58": (T6, 2, "MONTH_0_1", UNK, "UNKNOWN", "new to Groww; expects a time period for MF"),
    "YT-c8731e68cb": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "autopay end date 2064 — will it debit till 2064?"),
    "YT-58a062d811": (T5, 1, "MONTH_0_1", INF, "UNKNOWN", "started this month because of creator"),
    "YT-bf4e047361": (T6, 2, "MONTH_0_1", INF, "UNDER_25", "19, started this month; confuses index vs fund"),
    "YT-3bd904df09": (T8, 1, "MONTH_0_1", INF, "AGE_25_40", "32, started SIP for son"),
    "YT-194c098f4a": (T6, 2, "MONTH_0_1", INF, "UNKNOWN", "first SIP this month; how does compounding work"),
    "YT-dcbc697f9b": (T5, 2, "PRE_START", UNK, "OVER_40", "45, whose name/age to start SIP in"),
    "YT-e1cb9d58c3": (T5, 2, "PRE_START", UNK, "UNKNOWN", "new to SIP, asks where to invest"),
    "YT-8f4b2874b3": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "asked to pay ₹15k for SIP"),
    "YT-fbd7c3e67f": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹2,000 SIP, ₹15,000 mandate asked"),
    "YT-781475ace9": (T4, 5, "UNKNOWN", UNK, "UNKNOWN", "bounce charges when balance short; SIP won't close; in loss"),
    "YT-346aaf6b6f": (T8, 2, "UNKNOWN", INF, "UNKNOWN", "beginner with doubts and fears, cleared by video"),
    "YT-cf814de541": (T8, 2, "MONTH_0_1", UNK, "UNKNOWN", "after first payment, is next one automatic?"),
    "YT-8daa9c3e1a": (T2, 3, "MONTH_0_1", UNK, "UNKNOWN", "paid on 1st, SIP date 6th — debited again same month?"),
    "YT-871e2b378c": (T3, 4, "MONTH_0_1", INF, "UNKNOWN", "followed video; SIP cancelled 5 times"),
    "YT-e1169600b1": (T3, 4, "MONTH_0_1", UNK, "UNKNOWN", "debited on purchase, autopay failed, 'why cut twice'"),
    "YT-c2e22c6678": (T8, 1, "PRE_START", INF, "UNDER_25", "19, starting via creator"),
    "YT-6b72ee4430": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹500 SIP, autopay shows ₹15,000"),
    "YT-f6c8f2912b": (T7, 5, "UNKNOWN", UNK, "UNKNOWN", "wants to stop SIP"),
    "YT-654aec4949": (T4, 4, "MONTH_0_1", UNK, "UNKNOWN", "set up autopay, doesn't know duration, 'dar lagta h'"),
    "YT-c55a697c2d": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹500 SIP, autopay shows ₹15,000/month"),
    "YT-ac0a7a0881": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "₹1,000 SIP, ₹15,000 shown — which will be debited?"),
    "YT-b30f668b12": (T6, 2, "PRE_START", UNK, "UNKNOWN", "how to do daily SIP"),
    "YT-bb62935050": (T2, 2, "MONTH_0_1", UNK, "UNKNOWN", "new to Groww; is SIP debited from bank?"),
    "YT-3dcb235232": (T8, 1, "MONTH_0_1", UNK, "UNDER_25", "24, just started ₹1,000/month"),
    "YT-0a654eb8b6": (T3, 3, "MONTH_0_1", UNK, "UNKNOWN", "if autopay is turned off in Google Pay, does SIP stop?"),
    "YT-51aa12f654": (T6, 2, "PRE_START", UNK, "UNKNOWN", "how to do per-day SIP"),
    "YT-091789372e": (T2, 2, "MONTH_2_4", UNK, "UNKNOWN", "2nd installment done; where to see total in app"),
    "YT-a39c7d51fd": (T2, 4, "MONTH_0_1", UNK, "UNKNOWN", "debited from bank to ICCL, nothing on dashboard"),
    "YT-a9e8c0f6ab": (T6, 2, "PRE_START", INF, "UNKNOWN", "zero knowledge; wants simple post-tax return example"),
    "YT-c965a5aa73": (T8, 1, "MONTH_0_1", SELF, "AGE_25_40", "37, just started; goal to invest till 55"),
    "YT-686d890c18": (T5, 2, "PRE_START", INF, "UNKNOWN", "will ₹10k/month in Nifty 50 be safe, will 12% come"),
    "YT-0717631aa4": (T6, 2, "PRE_START", UNK, "UNKNOWN", "want to open SIP — is SIP right/safe?"),
    "YT-c44d602746": (T4, 4, "UNKNOWN", INF, "UNKNOWN", "started Nifty 50 SIP on creator's advice, now in loss"),
    "YT-7244673a53": (T4, 2, "PRE_START", UNK, "UNKNOWN", "is SIP money insured if bank fails; how much return"),
    "YT-f623c39d56": (T5, 2, "PRE_START", UNK, "UNKNOWN", "knows nothing, wants best company for SIP"),
    # Forums
    "FM-6c24b683f9": (T3, 3, "MONTH_0_1", SELF, "UNKNOWN", "new; ₹5,000 mandatory initial investment for SIP"),
    "FM-eb217305e9": (T6, 2, "PRE_START", SELF, "UNKNOWN", "₹500 ELSS for 12 months — lock-in mechanics"),
    "FM-355bac1237": (T7, 2, "UNKNOWN", SELF, "UNKNOWN", "what if no money on SIP date; can date change"),
    "FM-fe212e54a4": (T7, 3, "UNKNOWN", SELF, "UNKNOWN", "how to pause/resume; heard it needs a letter to AMC"),
    "FM-65b8662049": (T6, 2, "MONTH_0_1", PEER, "UNKNOWN", "already invested; how is this SIP type different"),
    "FM-ee9db71bab": (T7, 3, "MONTH_0_1", SELF, "UNKNOWN", "cancel before first installment — lose money?"),
    "FM-9bec0331bd": (T5, 2, "PRE_START", SELF, "AGE_25_40", "28, beginner; plan review with named funds"),
    "FM-36421fb26e": (T5, 2, "MONTH_5_8", SELF, "UNKNOWN", "novice since mid-2021; wants critique of ETF SIP list"),
    "FM-c63c24d831": (T6, 2, "PRE_START", UNK, "UNKNOWN", "how does SIP work"),
    "FM-ca46c089cb": (T6, 2, "PRE_START", SELF, "UNKNOWN", "new; difference between two SIP types"),
    "FM-61a1c6ce0b": (T8, 2, "PRE_START", SELF, "UNKNOWN", "how many installments before cancel is allowed"),
    "FM-ba9e7531bc": (T3, 3, "MONTH_0_1", SELF, "UNKNOWN", "chose payment-gateway method; can't figure how to pay"),
    "FM-f4676ccb86": (T6, 2, "PRE_START", SELF, "UNKNOWN", "direct or regular plan?"),
    "FM-582c9ce2c8": (T2, 2, "PRE_START", SELF, "UNKNOWN", "with UPI Autopay, where does the money flow?"),
    "FM-369e8d725a": (T5, 2, "PRE_START", PEER, "UNKNOWN", "₹500–1,000/month; would you choose Direct for me?"),
    "FM-75460b039f": (T5, 2, "PRE_START", PEER, "UNKNOWN", "asks what a 23-yo should do; start index fund now or wait?"),
}
