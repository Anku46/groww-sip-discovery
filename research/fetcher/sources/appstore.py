"""Apple App Store reviews for Groww iOS via the public customer-reviews RSS feed."""
import logging

from ..enrich import match_keywords
from ..http import Http, HttpError
from ..models import FetchResult, Record
from ..textutil import iso_date, join_title

log = logging.getLogger(__name__)


def _lookup_app_id(http: Http, cfg):
    if cfg.APPSTORE_APP_ID:
        return cfg.APPSTORE_APP_ID
    data = http.get_json("https://itunes.apple.com/search", params={
        "term": cfg.APPSTORE_SEARCH_TERM, "country": cfg.APPSTORE_COUNTRY, "entity": "software", "limit": 10,
    })
    for app in data.get("results", []):
        if "groww" in app.get("trackName", "").lower():
            log.info("App Store: using %s (id %s)", app["trackName"], app["trackId"])
            return app["trackId"]
    raise RuntimeError("Could not find the Groww app via iTunes Search; set APPSTORE_APP_ID in config.py")


def fetch(cfg) -> FetchResult:
    http = Http(min_interval=1.0)
    app_id = _lookup_app_id(http, cfg)
    country = cfg.APPSTORE_COUNTRY
    out, notes, scanned = [], [], 0
    for page in range(1, cfg.APPSTORE_MAX_PAGES + 1):
        url = f"https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={app_id}/sortby=mostrecent/json"
        try:
            data = http.get_json(url)
        except HttpError as e:
            notes.append(f"page {page}: stopped ({e})")
            break
        entries = data.get("feed", {}).get("entry", [])
        if isinstance(entries, dict):
            entries = [entries]
        if not entries:
            break
        for e in entries:
            if "im:rating" not in e:
                continue  # app metadata entry
            scanned += 1
            rating = int(e["im:rating"]["label"])
            if rating not in cfg.APPSTORE_STARS:
                continue
            text = join_title(e.get("title", {}).get("label", ""), e.get("content", {}).get("label", ""))
            if cfg.APPSTORE_REQUIRE_KEYWORD and not match_keywords(text):
                continue
            review_id = e.get("id", {}).get("label", "")
            out.append(Record(
                source="AppStore",
                rawText=text,
                url=f"https://apps.apple.com/{country}/app/id{app_id}?see-all=reviews#review-{review_id}",
                date=iso_date(e.get("updated", {}).get("label")),
                recordType="review",
                subSource=str(app_id),
                rating=str(rating),
                searchTerm="rss-mostrecent",
            ))
    notes.append(f"scanned {scanned} reviews, kept {len(out)} with stars {cfg.APPSTORE_STARS}")
    params = {"appId": app_id, "country": country, "stars": cfg.APPSTORE_STARS, "maxPages": cfg.APPSTORE_MAX_PAGES,
              "requireSipKeyword": cfg.APPSTORE_REQUIRE_KEYWORD}
    return FetchResult(out, params, notes)
