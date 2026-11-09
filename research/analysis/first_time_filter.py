"""Phase 2.1 — keep only records from first-time / new SIP investors.

Include if the record is about SIPs / mutual funds AND shows either
  * explicit:   says it's their first SIP / first investment / they're new, or
  * behavioral: asks a beginner concept question (what is NAV, SIP vs FD, will I lose money...),
                is confused about the first installment, or is confused by SIP mechanics
                (mandate, debit, units) while asking how/why about their own SIP.
Exclude experienced-investor talk (rebalancing, tax harvesting, multi-year SIPs, F&O, stock
analysis), staff/support replies, IPO-only complaints, promo/spam, praise-only comments,
very short comments, and comments in languages outside English / Hinglish / Hindi.
"""
import re


def _rx(*parts):
    return re.compile("|".join(parts), re.I)


_NUM = r"(\d|one|two|three|four|five|six|seven|eight)"

EXPLICIT = _rx(
    r"\bfirst (ever )?(sip|mutual fund|mf|investment|time invest\w*)",
    r"\bmy 1st (sip|investment)", r"\bfirst[- ]time (investor|investing|in mutual)",
    r"\bpehl[ia] (baar|bar|sip|investment)", r"\bpehla (sip|investment)",
    r"\bjust (started|start|began|begun) (my |a |an |the |with |investing|sip)",
    r"\brecently (started|began|start)", r"\bstarted (my |a )?sip (last|this|few|2|3|4|5|6) ",
    r"\bi(?:'m| am)? new (to|in) (investing|investment|mutual|mf|sip|stock market|market|groww)",
    r"\bi(?:'m| am)? (a |an )?(complete |total |absolute )?(beginner|newbie|novice)",
    r"\bas a (beginner|newbie|novice)", r"\b(beginner|newbie|novice) (investor|invester|here)",
    r"\bnew investor", r"\bi(?:'m| am) new\b",
    r"\babhi (start|shuru)", r"\bnaya (investor|hu|hoon)", r"\b(learn|learning) from scratch",
    r"\bi (have|had) (no|zero|little) knowledge", r"\bi don'?t know (anything|nothing|much)",
    r"\bi didn'?t know a single", r"\b(mujhe|muje) kuch (nahi|nhi) pata",
    r"\bstarted investing (recently|last|this)",
    r"\b(sip|invest\w*|mutual fund)[^.?!]{0,40}\b" + _NUM + r" months? (ago|back|se|ho gaye|ho gya|hogaye)",
    r"\b" + _NUM + r" months? (ago|back|se|ho gaye|ho gya|hogaye)[^.?!]{0,40}\b(sip|invest|mutual fund|portfolio)",
)
CONCEPT = _rx(
    r"\bwhat (is|are|does) (a |an |the )?(nav|sip|mutual fund|expense ratio|exit load|elss|units?|direct plan|regular plan)",
    r"\bnav (kya|ka matlab|means)", r"\bmeaning of (nav|sip)",
    r"\b(sip|mutual funds?|mf) (vs|or|versus) (fd|rd|ppf|gold|savings)", r"\b(fd|rd|ppf) (vs|or|versus) (sip|mutual funds?|mf)",
    r"\bbetter than (fd|rd|bank)", r"\bis (sip|mutual fund|it) safe", r"\b(will|can|could) i lose",
    r"\bkya (sip|mutual fund) (safe|sahi)", r"\bpaisa (doob|dub|dooba)", r"\bloss (ho|hoga|ho gaya|ho gya|ho raha)",
    r"\bdirect (or|vs) regular", r"\bregular (or|vs) direct",
    r"\bhow (do i|can i|should i) (start|begin|invest in|choose|select|stop|cancel|pause|skip)",
    r"\bkaise (kare|karein|karu|start|shuru|band)\b.{0,60}\?", r"\bhow (does|do) (sip|mutual funds?|nav) work",
    r"\bshould i (start|stop|continue|cancel|pause|redeem|withdraw)", r"\b(stop|band) kar (du|doon|dena|de)",
    r"\bportfolio (is )?(in )?(red|negative|minus|loss)", r"\bnegative returns?", r"\bsip (is )?in (loss|red|negative)",
    r"\bwhy (is )?my (portfolio|sip|return|fund)", r"\bkitna (katega|milega|return)", r"\bkya mera",
)
FIRST_INSTALLMENT = _rx(
    r"\bfirst (sip )?(installment|instalment|debit|payment|sip date|deduction)",
    r"\b1st (installment|instalment|debit|payment)", r"\bpehli (kist|installment)",
)
MECHANICS = _rx(
    r"\bunits? (not|nahi|nhi) (allot|alloc|credit|show|reflect|received|mil)", r"\bnot (allotted|allocated)",
    r"\b(money|amount|paisa|paise|rs\.?|₹) ?\d* ?(was |got |is |has been )?(deducted|debited|kat)", r"\b(kat|kaat) (gaya|gaye|gya|liya|te)",
    r"\bnot reflect", r"\b(mandate|autopay|auto pay|auto-pay|nach|e-?nach)\b", r"\bdebited twice|\bdouble (debit|deduct)",
    r"\b(skip|pause|cancel|stop) (my |the |this )?(sip|installment|instalment)", r"\bsip (band|cancel|skip|pause|miss)",
    r"\b(bounce|bounced|penalty)\b",
)
CONFUSION_CUE = _rx(
    r"\?", r"\bhow\b", r"\bwhy\b", r"\bwhat\b", r"\bwhere\b", r"\bconfus", r"\bunderstand", r"\bdon'?t know",
    r"\bkya\b", r"\bkyu", r"\bkaise\b", r"\bsamajh", r"\bpata\b", r"\bnot sure", r"\bunclear", r"\bno idea",
)
EXPERIENCED = _rx(
    r"\brebalanc", r"\btax[- ]?(loss )?harvest", r"\bltcg\b", r"\bstcg\b", r"\bxirr\b", r"\bcagr\b",
    r"\basset allocation", r"\b(put|call) options?\b", r"\bhedg", r"\bf&o\b", r"\bfutures\b", r"\bintraday",
    r"\b(\d{1,2}|ten|five|six|seven|eight|nine|several|many)\+? ?(years|yrs) (of|since|in) (sip|investing|investment|mutual)",
    r"\b(investing|invested|sip) (since|for|from) (the )?(last |past |over )?(\d{1,2}|ten|five|six|seven|eight|nine|several|many)\+? ?(years|yrs)",
    r"\bfrom (last )?\d{1,2}[- ]?\d* (years|yrs)", r"\bsince (19|20)[0-2]\d\b", r"\b(lakh|lac|crore|cr) portfolio",
    r"\bsebi (certified|registered)", r"\bresearch analyst", r"\bmy portfolio of \d",
)
STOCK_TALK = _rx(r"\bdrhp\b", r"\bvaluations?\b", r"\bearnings\b", r"\bq[1-4] ?(fy|results)", r"\bp/?e ratio", r"\beps\b",
                 r"\bmarket cap of", r"\bmanagement (commentary|guidance)", r"\bconcall")
SUPPORT_REPLY = _rx(r"\b(please|kindly|pls) (dm|share your|raise a ticket|write to)", r"\bwe('re| are) (checking|looking)",
                    r"\bour (team|support)\b", r"\bwe have (fixed|updated|resolved)", r"\bcreate a ticket")
FIRST_PERSON = _rx(r"\b(i|i'm|i've|my|me|mine|mera|meri|mere|mujhe|muje|maine|mene|humne|hamara)\b")
CORE_SIP = re.compile(r"(?<![a-z])(sip|sips|mutual funds?|mf|elss|index fund|nav|units?)(?![a-z])|एसआईपी|म्यूचुअल", re.I)
PRAISE = _rx(r"\b(video|explain\w*|information|info|content|great|nice|awesome|amazing|best|thanks?|thank you|helpful|useful|kudos|superb|mast|badhiya)\b")
SPAM = _rx(r"https?://", r"\bt\.me/", r"\btelegram\b", r"\bwhatsapp\b", r"\breferral\b", r"\bredeem code",
           r"\b(expert|mrs|mr|ms)\.? [A-Z][a-z]+ (gave|helped|made)", r"\$\d")
OTHER_SCRIPT = re.compile(r"[ঀ-෿]")  # Bengali..Sinhala (Tamil, Telugu, Malayalam, Kannada, Gujarati...)
SIP_TERMS = re.compile(r"(?<![a-z])(sip|sips|mutual funds?|mf|nav|mandate|autopay|nach|units?|installments?|instalments?|folio|elss|index fund)(?![a-z])|एसआईपी|म्यूचुअल", re.I)


def classify(text: str, matched_keywords: str = "") -> tuple[bool, str]:
    """Return (include, reason). Reason is the inclusion type or the exclusion cause."""
    t = text or ""
    if OTHER_SCRIPT.search(t):
        return False, "exclude:other_language"
    if not (matched_keywords or SIP_TERMS.search(t)):
        return False, "exclude:not_sip_related"
    if SPAM.search(t):
        return False, "exclude:promo_or_link"
    if EXPERIENCED.search(t) or STOCK_TALK.search(t):
        return False, "exclude:experienced_investor"
    if SUPPORT_REPLY.search(t):
        return False, "exclude:support_or_staff_reply"
    if re.search(r"\bipo\b", t, re.I) and not CORE_SIP.search(t):
        return False, "exclude:ipo_not_sip"
    if len(re.findall(r"[^\W\d_]{2,}", t)) < 5:
        return False, "exclude:low_information"
    if PRAISE.search(t) and not FIRST_PERSON.search(t) and "?" not in t:
        return False, "exclude:praise_only"
    if EXPLICIT.search(t):
        return True, "explicit"
    if FIRST_INSTALLMENT.search(t):
        return True, "behavioral:first_installment"
    if CONCEPT.search(t):
        return True, "behavioral:concept_question"
    if (MECHANICS.search(t) and CONFUSION_CUE.search(t) and FIRST_PERSON.search(t)
            and CORE_SIP.search(f"{t} {matched_keywords}")):
        return True, "behavioral:mechanics_confusion"
    return False, "exclude:no_first_time_signal"
