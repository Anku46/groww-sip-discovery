"""Google Play Store reviews for the Groww Android app (1-3 stars, SIP-related)."""
import logging

from google_play_scraper import Sort, reviews

from ..enrich import match_keywords
from ..models import FetchResult, Record
from ..textutil import iso_date

log = logging.getLogger(__name__)


def fetch(cfg) -> FetchResult:
    app_id = cfg.PLAYSTORE_APP_ID
    out, notes = [], []
    for star in cfg.PLAYSTORE_STARS:
        token, scanned, kept = None, 0, 0
        while scanned < cfg.PLAYSTORE_MAX_PER_STAR:
            batch, token = reviews(
                app_id,
                lang=cfg.PLAYSTORE_LANG,
                country=cfg.PLAYSTORE_COUNTRY,
                sort=Sort.NEWEST,
                count=min(200, cfg.PLAYSTORE_MAX_PER_STAR - scanned),
                filter_score_with=star,
                continuation_token=token,
            )
            if not batch:
                break
            scanned += len(batch)
            for r in batch:
                text = (r.get("content") or "").strip()
                if not text:
                    continue
                if cfg.PLAYSTORE_REQUIRE_KEYWORD and not match_keywords(text):
                    continue
                kept += 1
                out.append(Record(
                    source="PlayStore",
                    rawText=text,
                    url=f"https://play.google.com/store/apps/details?id={app_id}&reviewId={r['reviewId']}",
                    date=iso_date(r.get("at")),
                    recordType="review",
                    subSource=app_id,
                    rating=str(r.get("score", "")),
                    searchTerm=f"{star}-star",
                ))
            if token is None or getattr(token, "token", None) is None:
                break
        log.info("Play Store %s-star: scanned %d, kept %d", star, scanned, kept)
        notes.append(f"{star}-star: scanned {scanned}, kept {kept} SIP-related")
    params = {
        "appId": app_id, "country": cfg.PLAYSTORE_COUNTRY, "lang": cfg.PLAYSTORE_LANG,
        "stars": cfg.PLAYSTORE_STARS, "maxPerStar": cfg.PLAYSTORE_MAX_PER_STAR,
        "requireSipKeyword": cfg.PLAYSTORE_REQUIRE_KEYWORD,
    }
    return FetchResult(out, params, notes)
