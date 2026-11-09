"""YouTube comments on SIP tutorial / review videos (YouTube Data API v3)."""
import logging
import os

from ..http import Http, HttpError
from ..models import FetchResult, Record
from ..textutil import iso_date

log = logging.getLogger(__name__)

API = "https://www.googleapis.com/youtube/v3"


def _record(snippet, comment_id, video_id, query, kind):
    return Record(
        source="YouTube",
        rawText=snippet.get("textOriginal") or snippet.get("textDisplay", ""),
        url=f"https://www.youtube.com/watch?v={video_id}&lc={comment_id}",
        date=iso_date(snippet.get("publishedAt")),
        recordType=kind,
        subSource=video_id,
        searchTerm=query,
    )


def fetch(cfg) -> FetchResult:
    params = {"queries": cfg.YOUTUBE_QUERIES, "videosPerQuery": cfg.YOUTUBE_VIDEOS_PER_QUERY,
              "extraVideoIds": cfg.YOUTUBE_VIDEO_IDS, "maxCommentsPerVideo": cfg.YOUTUBE_MAX_COMMENTS_PER_VIDEO}
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        log.warning("YouTube skipped: YOUTUBE_API_KEY is not set (see .env.example)")
        return FetchResult([], params, ["skipped: YOUTUBE_API_KEY not set"])

    http = Http(min_interval=0.2)
    videos = {vid: "manual list" for vid in cfg.YOUTUBE_VIDEO_IDS}
    titles = {}
    for q in cfg.YOUTUBE_QUERIES:
        data = http.get_json(f"{API}/search", params={
            "part": "snippet", "q": q, "type": "video", "regionCode": "IN", "order": "relevance",
            "maxResults": cfg.YOUTUBE_VIDEOS_PER_QUERY, "key": key,
        })
        for item in data.get("items", []):
            vid = item["id"]["videoId"]
            videos.setdefault(vid, q)
            titles[vid] = item["snippet"].get("title", "")

    out, notes = [], []
    for vid, q in videos.items():
        token, n = None, 0
        while n < cfg.YOUTUBE_MAX_COMMENTS_PER_VIDEO:
            try:
                data = http.get_json(f"{API}/commentThreads", params={
                    "part": "snippet,replies", "videoId": vid, "maxResults": 100, "order": "relevance",
                    "textFormat": "plainText", "pageToken": token, "key": key,
                })
            except HttpError as e:
                notes.append(f"{vid}: {e.status} (comments disabled or unavailable)")
                break
            for item in data.get("items", []):
                top = item["snippet"]["topLevelComment"]
                out.append(_record(top["snippet"], top["id"], vid, q, "comment"))
                n += 1
                for rep in item.get("replies", {}).get("comments", []):
                    out.append(_record(rep["snippet"], rep["id"], vid, q, "reply"))
                    n += 1
            token = data.get("nextPageToken")
            if not token:
                break
        log.info("YouTube %s (%s): %d comments", vid, titles.get(vid, q)[:50], n)
    notes.append(f"{len(videos)} videos: " + "; ".join(f"{v} = {titles.get(v, '?')[:60]}" for v in videos))
    return FetchResult(out, params, notes)
