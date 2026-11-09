"""Per-record tagging: id, language, PII flag, SIP keyword matches, dedupe key."""
import hashlib
import re

from .models import Record

ID_PREFIX = {"PlayStore": "PS", "AppStore": "AS", "Reddit": "RD", "YouTube": "YT", "Forum": "FM"}

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_LETTER = re.compile(r"[^\W\d_]")

# Romanised Hindi words that rarely appear in English text.
HINGLISH_MARKERS = {
    "hai", "hain", "nahi", "nahin", "nhi", "kya", "kyu", "kyun", "kyon", "kaise", "kaisa", "mera", "meri",
    "mere", "mujhe", "muje", "humne", "hum", "aap", "apna", "apne", "paisa", "paise", "paisey", "karna",
    "karo", "karte", "kiya", "kiye", "gaya", "gaye", "gayi", "gya", "gyi", "hota", "hoti", "raha", "rahi",
    "rahe", "bhai", "yaar", "abhi", "bhi", "kab", "aur", "lekin", "sab", "wala", "wale", "wali", "jab",
    "tha", "thi", "hoga", "hogi", "chahiye", "samajh", "pata", "bahut", "bohot", "bohut", "accha", "acha",
    "theek", "thik", "kuch", "koi", "kitna", "kitne", "sirf", "lagaya", "lagta", "kat", "kata", "katna",
    "dikha", "dikhta", "mila", "nikal", "faida", "fayda", "nuksan", "nuksaan", "toh", "matlab",
    "sahi", "galat", "waise", "phir", "ho", "hu", "hun", "ji", "kar", "ke", "ki", "ka", "se", "ko",
}
# Very short particles count only alongside a stronger marker.
_WEAK = {"ho", "hu", "ji", "kar", "ke", "ki", "ka", "se", "ko"}

SIP_KEYWORDS = [
    "sip", "sips", "systematic investment", "mutual fund", "mutual funds", "mf", "mandate", "autopay",
    "auto pay", "auto-pay", "nach", "enach", "e-nach", "installment", "instalment", "nav", "elss",
    "index fund", "folio", "step-up", "step up", "xirr", "small cap", "mid cap", "large cap", "flexi cap",
    "smallcap", "midcap", "largecap", "flexicap", "first investment", "redeem", "redemption",
    "एसआईपी", "म्यूचुअल फंड",
]
_KW_RE = re.compile(
    r"(?<![a-z0-9])(" + "|".join(re.escape(k) for k in sorted(SIP_KEYWORDS, key=len, reverse=True)) + r")(?![a-z0-9])"
)

PII_PATTERNS = {
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    "upi": re.compile(
        r"\b[\w.-]{2,}@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|ibl|axl|paytm|apl|upi|fbl|ikwik|kotak|"
        r"hdfcbank|icici|sbi|axisbank|freecharge|airtel|pthdfc|ptsbi|ptyes|ptaxis|jupiteraxis)\b",
        re.I,
    ),
    "phone": re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"),
    "bank_account": re.compile(r"(?<!\d)\d{9,18}(?!\d)"),
    "pan": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
}


def detect_language(text: str) -> str:
    letters = len(_LETTER.findall(text))
    dev = len(_DEVANAGARI.findall(text))
    if letters and dev / letters > 0.5:
        return "Hindi"
    if dev:
        return "Hinglish"  # mixed scripts
    tokens = re.findall(r"[a-z]+", text.lower())
    hits = {t for t in tokens if t in HINGLISH_MARKERS}
    strong = hits - _WEAK
    if len(strong) >= 2 or (strong and len(hits) >= 2) or (strong and len(tokens) <= 8):
        return "Hinglish"
    return "English"


def detect_pii(text: str) -> list[str]:
    return [name for name, rx in PII_PATTERNS.items() if rx.search(text)]


def match_keywords(text: str) -> list[str]:
    found = []
    for m in _KW_RE.finditer(text.lower()):
        if m.group(1) not in found:
            found.append(m.group(1))
    return found


def make_id(r: Record) -> str:
    h = hashlib.sha1(f"{r.url}|{r.rawText}".encode("utf-8")).hexdigest()[:10]
    return f"{ID_PREFIX.get(r.source, 'XX')}-{h}"


def dedupe_key(r: Record) -> str:
    norm = re.sub(r"[\W_]+", " ", r.rawText.lower()).strip()
    return f"{r.source}|{norm}"


def enrich(r: Record) -> Record:
    r.rawText = (r.rawText or "").strip()
    r.id = make_id(r)
    if r.language not in ("English", "Hinglish", "Hindi"):
        r.language = detect_language(r.rawText)
    pii = detect_pii(r.rawText)
    r.containsPII = bool(pii)
    r.piiTypes = ";".join(pii)
    r.matchedKeywords = ";".join(match_keywords(r.rawText))
    if not r.date:
        r.date = "unknown"
    return r
