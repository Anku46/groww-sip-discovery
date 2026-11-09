from dataclasses import dataclass, field, fields

SOURCES = ("PlayStore", "AppStore", "Reddit", "YouTube", "Forum")
LANGUAGES = ("English", "Hinglish", "Hindi")

CSV_COLUMNS = [
    "id", "source", "subSource", "recordType", "rawText", "language", "date", "url",
    "rating", "containsPII", "piiTypes", "matchedKeywords", "searchTerm", "fetchedAt",
]


@dataclass
class Record:
    source: str                 # one of SOURCES
    rawText: str                # verbatim, unedited (titles are prepended where the platform has them)
    url: str                    # traceable reference
    date: str                   # YYYY-MM-DD or "unknown"
    recordType: str             # review / post / comment / reply / forum_post / manual
    subSource: str = ""         # subreddit, forum name, video id, ...
    rating: str = ""            # store star rating, if any
    searchTerm: str = ""        # query that surfaced this record
    # Filled in by enrich():
    id: str = ""
    language: str = ""
    containsPII: bool = False
    piiTypes: str = ""
    matchedKeywords: str = ""
    fetchedAt: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> "Record":
        names = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in names})


@dataclass
class FetchResult:
    records: list
    params: dict
    notes: list = field(default_factory=list)
