"""Reddit posts and comments from Indian personal-finance subreddits."""
import logging

from ..enrich import match_keywords
from ..http import Http, HttpError
from ..models import FetchResult, Record
from ..textutil import iso_date, join_title

log = logging.getLogger(__name__)

_GONE = {"[removed]", "[deleted]"}


REDDIT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) research-script/1.0"


class _Client:
    """Unauthenticated client for Reddit's public .json endpoints (no PRAW, no OAuth)."""

    def __init__(self, cfg):
        self.http = Http(min_interval=cfg.REDDIT_MIN_INTERVAL, headers={"User-Agent": REDDIT_USER_AGENT})
        self.mode = "public-json"

    def get(self, path, params=None):
        return self.http.get_json(f"https://www.reddit.com{path}.json", params={**(params or {}), "raw_json": 1})


def _walk_comments(children, out, limit):
    for c in children:
        if len(out) >= limit:
            return
        if c.get("kind") != "t1":
            continue
        d = c["data"]
        out.append(d)
        replies = d.get("replies")
        if isinstance(replies, dict):
            _walk_comments(replies.get("data", {}).get("children", []), out, limit)


def fetch(cfg) -> FetchResult:
    client = _Client(cfg)
    out, notes = [], [f"auth mode: {client.mode}"]
    posts = {}  # id -> (post data, query)
    for sub in cfg.REDDIT_SUBREDDITS:
        for q in cfg.REDDIT_QUERIES:
            after, n = None, 0
            while n < cfg.REDDIT_MAX_POSTS_PER_QUERY:
                try:
                    data = client.get(f"/r/{sub}/search", {
                        "q": q, "restrict_sr": 1, "sort": "relevance", "t": "all", "limit": 100, "after": after,
                    })
                except HttpError as e:
                    notes.append(f"r/{sub} '{q}': {e}")
                    break
                children = data.get("data", {}).get("children", [])
                if not children:
                    break
                for c in children:
                    p = c["data"]
                    n += 1
                    posts.setdefault(p["id"], (p, q))
                after = data["data"].get("after")
                if not after:
                    break
            log.info("Reddit r/%s '%s': %d results (unique posts so far: %d)", sub, q, n, len(posts))

    if not posts and any("HTTP 403" in n for n in notes):
        msg = "Reddit returned 403 for public JSON requests from this network; no Reddit records collected. Import posts by hand via data/manual/ if needed (see README)."
        log.warning(msg)
        notes.append(msg)

    for p, q in posts.values():
        body = "" if p.get("selftext", "") in _GONE else p.get("selftext", "")
        text = join_title(p.get("title", ""), body)
        out.append(Record(
            source="Reddit", rawText=text, url=f"https://www.reddit.com{p['permalink']}",
            date=iso_date(p.get("created_utc")), recordType="post",
            subSource=f"r/{p.get('subreddit', '')}", searchTerm=q,
        ))

    # Comments: from the most-discussed SIP-related posts.
    candidates = [
        (p, q) for p, q in posts.values()
        if match_keywords(f"{p.get('title', '')} {p.get('selftext', '')}") and p.get("num_comments", 0) > 0
    ]
    candidates.sort(key=lambda pq: pq[0].get("num_comments", 0), reverse=True)
    comment_count = 0
    for p, q in candidates[: cfg.REDDIT_COMMENT_POSTS]:
        try:
            data = client.get(f"/comments/{p['id']}", {"limit": 500, "sort": "top"})
        except HttpError as e:
            notes.append(f"comments {p['id']}: {e}")
            continue
        comments = []
        if isinstance(data, list) and len(data) > 1:
            _walk_comments(data[1].get("data", {}).get("children", []), comments, cfg.REDDIT_MAX_COMMENTS_PER_POST)
        for c in comments:
            body = c.get("body", "")
            if body in _GONE or c.get("author") == "AutoModerator":
                continue
            comment_count += 1
            out.append(Record(
                source="Reddit", rawText=body, url=f"https://www.reddit.com{c.get('permalink', '')}",
                date=iso_date(c.get("created_utc")), recordType="comment",
                subSource=f"r/{c.get('subreddit', p.get('subreddit', ''))}", searchTerm=q,
            ))
    notes.append(f"{len(posts)} unique posts, {comment_count} comments from {min(len(candidates), cfg.REDDIT_COMMENT_POSTS)} threads")
    params = {
        "subreddits": cfg.REDDIT_SUBREDDITS, "queries": cfg.REDDIT_QUERIES,
        "maxPostsPerQuery": cfg.REDDIT_MAX_POSTS_PER_QUERY, "commentThreads": cfg.REDDIT_COMMENT_POSTS,
        "maxCommentsPerThread": cfg.REDDIT_MAX_COMMENTS_PER_POST,
    }
    return FetchResult(out, params, notes)
