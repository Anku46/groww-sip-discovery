"""FinTech forums built on Discourse (TradingQ&A, ValuePickr). Quora goes through manual import."""
import logging

from ..http import Http, HttpError
from ..models import FetchResult, Record
from ..textutil import html_to_text, iso_date, join_title

log = logging.getLogger(__name__)


def _fetch_forum(name, base, cfg, http, notes):
    topics = {}  # id -> (slug, query)
    for q in cfg.DISCOURSE_QUERIES:
        for page in range(1, cfg.DISCOURSE_SEARCH_PAGES + 1):
            if len(topics) >= cfg.DISCOURSE_MAX_TOPICS_PER_FORUM:
                break
            try:
                data = http.get_json(f"{base}/search.json", params={"q": q, "page": page})
            except HttpError as e:
                notes.append(f"{name} search '{q}' p{page}: {e}")
                break
            found = data.get("topics", [])
            if not found:
                break
            for t in found:
                if len(topics) < cfg.DISCOURSE_MAX_TOPICS_PER_FORUM:
                    topics.setdefault(t["id"], (t.get("slug", ""), q))

    out = []
    for tid, (slug, q) in topics.items():
        try:
            data = http.get_json(f"{base}/t/{tid}.json")
        except HttpError as e:
            notes.append(f"{name} topic {tid}: {e}")
            continue
        title = data.get("title", "")
        for p in data.get("post_stream", {}).get("posts", [])[: cfg.DISCOURSE_MAX_POSTS_PER_TOPIC]:
            text = html_to_text(p.get("cooked", ""))
            if p.get("post_number") == 1:
                text = join_title(title, text)
            out.append(Record(
                source="Forum", rawText=text,
                url=f"{base}/t/{slug or data.get('slug', '')}/{tid}/{p.get('post_number', 1)}",
                date=iso_date(p.get("created_at")), recordType="forum_post",
                subSource=name, searchTerm=q,
            ))
    log.info("%s: %d topics, %d posts", name, len(topics), len(out))
    notes.append(f"{name}: {len(topics)} topics, {len(out)} posts")
    return out


def fetch(cfg) -> FetchResult:
    http = Http(min_interval=cfg.DISCOURSE_MIN_INTERVAL, headers={"Accept": "application/json"})
    out, notes = [], []
    for name, base in cfg.DISCOURSE_FORUMS.items():
        try:
            out.extend(_fetch_forum(name, base, cfg, http, notes))
        except Exception as e:  # one forum failing shouldn't sink the other
            log.exception("%s failed", name)
            notes.append(f"{name}: failed ({e})")
    notes.append("Quora: no public API; add records by hand in data/manual/ (see README)")
    params = {"forums": cfg.DISCOURSE_FORUMS, "queries": cfg.DISCOURSE_QUERIES,
              "searchPages": cfg.DISCOURSE_SEARCH_PAGES, "maxTopicsPerForum": cfg.DISCOURSE_MAX_TOPICS_PER_FORUM,
              "maxPostsPerTopic": cfg.DISCOURSE_MAX_POSTS_PER_TOPIC}
    return FetchResult(out, params, notes)
