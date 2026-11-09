"""Collection settings. Edit these to widen or narrow the scrape.

Phase 1 has no volume targets ("scrape broadly"), so defaults lean generous.
`--quick` swaps in QUICK_OVERRIDES for a fast smoke run.
"""

# Google Play Store
PLAYSTORE_APP_ID = "com.nextbillion.groww"
PLAYSTORE_COUNTRY = "in"
PLAYSTORE_LANG = "en"
PLAYSTORE_STARS = [1, 2, 3]
PLAYSTORE_MAX_PER_STAR = 3000          # reviews scanned per star rating
PLAYSTORE_REQUIRE_KEYWORD = True       # keep only SIP / mutual-fund related reviews

# Apple App Store (public RSS feed: max 10 pages x 50 reviews)
APPSTORE_APP_ID = None                 # None = look up via iTunes Search API
APPSTORE_SEARCH_TERM = "Groww"
APPSTORE_COUNTRY = "in"
APPSTORE_STARS = [1, 2, 3]
APPSTORE_MAX_PAGES = 10
APPSTORE_REQUIRE_KEYWORD = False       # low volume, so keep all; keywords still tagged

# Reddit
REDDIT_SUBREDDITS = ["personalfinanceindia", "IndiaInvestments"]
REDDIT_QUERIES = ["SIP", "Groww", "cancel SIP", "SIP loss", "first SIP", "stop SIP", "SIP mandate"]
REDDIT_MAX_POSTS_PER_QUERY = 100
REDDIT_COMMENT_POSTS = 40              # posts (most-commented, SIP-related) whose comments are fetched
REDDIT_MAX_COMMENTS_PER_POST = 100
REDDIT_MIN_INTERVAL = 2.0              # seconds between requests (unauthenticated limit is strict)

# YouTube (needs YOUTUBE_API_KEY)
YOUTUBE_QUERIES = [
    "SIP for beginners",
    "Groww SIP tutorial",
    "how to start SIP in Groww",
    "SIP kaise kare",
    "mutual fund for beginners India",
    "SIP loss should I stop",
    "first SIP experience",
]
YOUTUBE_VIDEO_IDS = []                 # extra hand-picked video IDs
YOUTUBE_VIDEOS_PER_QUERY = 5
YOUTUBE_MAX_COMMENTS_PER_VIDEO = 300

# FinTech forums (Discourse-based; Quora has no public API, so import it by hand into data/manual/)
DISCOURSE_FORUMS = {
    "TradingQnA": "https://tradingqna.com",
    "ValuePickr": "https://forum.valuepickr.com",
}
DISCOURSE_QUERIES = ["SIP", "first SIP", "SIP mandate", "SIP bounce", "NACH", "Groww SIP", "SIP stopped", "BSE StarMF"]
DISCOURSE_SEARCH_PAGES = 3
DISCOURSE_MAX_TOPICS_PER_FORUM = 80
DISCOURSE_MAX_POSTS_PER_TOPIC = 20
DISCOURSE_MIN_INTERVAL = 1.0

QUICK_OVERRIDES = {
    "PLAYSTORE_MAX_PER_STAR": 200,
    "APPSTORE_MAX_PAGES": 2,
    "REDDIT_QUERIES": ["SIP"],
    "REDDIT_MAX_POSTS_PER_QUERY": 25,
    "REDDIT_COMMENT_POSTS": 3,
    "REDDIT_MAX_COMMENTS_PER_POST": 20,
    "YOUTUBE_QUERIES": ["SIP for beginners"],
    "YOUTUBE_VIDEOS_PER_QUERY": 2,
    "YOUTUBE_MAX_COMMENTS_PER_VIDEO": 50,
    "DISCOURSE_QUERIES": ["first SIP"],
    "DISCOURSE_SEARCH_PAGES": 1,
    "DISCOURSE_MAX_TOPICS_PER_FORUM": 5,
    "DISCOURSE_MAX_POSTS_PER_TOPIC": 5,
}
