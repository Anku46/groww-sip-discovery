# Phase 1 Collection Log

Generated: 2026-11-08T21:15:51+00:00

## Corpus totals

- **Total raw records:** 6174
- Records with a date: 6174 / 6174
- Flagged as containing PII: 66
- Before cleaning: 6990 (dropped 429 too short, 387 duplicates)
- Hand-imported (data/manual): 0

| Channel | Records | With SIP keyword |
| :-- | --: | --: |
| PlayStore | 467 | 467 |
| AppStore | 105 | 11 |
| Reddit | 0 | 0 |
| YouTube | 3871 | 1015 |
| Forum | 1731 | 697 |
| **Total** | **6174** | **2190** |

| Language | Records |
| :-- | --: |
| English | 5059 |
| Hinglish | 1048 |
| Hindi | 67 |

| Sub-source | Records |
| :-- | --: |
| Forum / TradingQnA | 418 |
| Forum / ValuePickr | 1313 |

> **Missing channels:** Reddit. Phase 1 exit criteria need all 5.

## Channel runs

### appstore

- Fetched at: 2026-11-08T21:12:14+00:00
- Records fetched: 105
- appId: `1404871703`
- country: `"in"`
- stars: `[1, 2, 3]`
- maxPages: `10`
- requireSipKeyword: `false`
- Note: scanned 500 reviews, kept 105 with stars [1, 2, 3]

### forums

- Fetched at: 2026-11-08T21:15:49+00:00
- Records fetched: 1759
- forums: `{"TradingQnA": "https://tradingqna.com", "ValuePickr": "https://forum.valuepickr.com"}`
- queries: `["SIP", "first SIP", "SIP mandate", "SIP bounce", "NACH", "Groww SIP", "SIP stopped", "BSE StarMF"]`
- searchPages: `3`
- maxTopicsPerForum: `80`
- maxPostsPerTopic: `20`
- Note: TradingQnA: 80 topics, 428 posts
- Note: ValuePickr: 80 topics, 1331 posts
- Note: Quora: no public API; add records by hand in data/manual/ (see README)

### playstore

- Fetched at: 2026-11-08T21:12:03+00:00
- Records fetched: 468
- appId: `"com.nextbillion.groww"`
- country: `"in"`
- lang: `"en"`
- stars: `[1, 2, 3]`
- maxPerStar: `3000`
- requireSipKeyword: `true`
- Note: 1-star: scanned 3000, kept 142 SIP-related
- Note: 2-star: scanned 3000, kept 168 SIP-related
- Note: 3-star: scanned 3000, kept 158 SIP-related

### reddit

- Fetched at: 2026-11-08T21:12:43+00:00
- Records fetched: 0
- subreddits: `["personalfinanceindia", "IndiaInvestments"]`
- queries: `["SIP", "Groww", "cancel SIP", "SIP loss", "first SIP", "stop SIP", "SIP mandate"]`
- maxPostsPerQuery: `100`
- commentThreads: `40`
- maxCommentsPerThread: `100`
- Note: auth mode: public-json
- Note: r/personalfinanceindia 'SIP': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'Groww': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'cancel SIP': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'SIP loss': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'first SIP': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'stop SIP': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/personalfinanceindia 'SIP mandate': HTTP 403 for https://www.reddit.com/r/personalfinanceindia/search.json
- Note: r/IndiaInvestments 'SIP': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'Groww': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'cancel SIP': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'SIP loss': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'first SIP': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'stop SIP': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: r/IndiaInvestments 'SIP mandate': HTTP 403 for https://www.reddit.com/r/IndiaInvestments/search.json
- Note: Reddit returned 403 for public JSON requests from this network; no Reddit records collected. Import posts by hand via data/manual/ if needed (see README).
- Note: 0 unique posts, 0 comments from 0 threads

### youtube

- Fetched at: 2026-11-08T21:13:05+00:00
- Records fetched: 4658
- queries: `["SIP for beginners", "Groww SIP tutorial", "how to start SIP in Groww", "SIP kaise kare", "mutual fund for beginners India", "SIP loss should I stop", "first SIP experience"]`
- videosPerQuery: `5`
- extraVideoIds: `[]`
- maxCommentsPerVideo: `300`
- Note: 27 videos: kjtTU_-MAAI = How to Start SIP in 7 Steps | Mutual Fund Investing Made Eas; ZXLATRO3Ifw = How to Start SIP in Mutual Funds | Beginners Guide | Sanjay ; ds_2gLO1r9w = SIP Kaise Kare Full Process #sip #mutualfunds; pado678nYbg = Rs.500 SIP to Invest in 2025 | Top Rated Mutual Funds 2025 w; VG3L9h4cJSU = Stock, SIP, Mutual Fund, ETF, everything simplified ✅; MExMf8_g4CE = Groww में SIP कैसे करें? | How to Start Mutual Funds SIP in ; -cQzwIwNPmA = Groww में SIP कैसे करें? - How To Start Mutual Fund SIP in G; 7pJdibIhNCQ = Groww में SIP कैसे करें 2026? How to Start Mutual Funds SIP ; L0yTgTagvL8 = How to start a SIP on Groww App; 1ObHSp9s3Cc = Groww App Me SIP Kaise Kare 2026 - How to Start Mutual Fund ; gqMM41XC-VE = groww me sip kaise kare | groww me sip kaise start kare | Ho; Y58SpRq1SdA = Groww में SIP कैसे करें? | How to Start Mutual Funds SIP in ; cyAHevhRq3c = SIP Kaise Start Kare | Sip Investment In Hindi | sip kya hot; 9vZgYxeE1LE = SIP Kaise Kare 2026? (Step by Step) | SIP Kya Hota Hai? | Mu; bOEvEuKtDew = SIP Investment in Hindi (Step By Step) | Sip Investment | Si; __GhfUAo3JE = PhonePe Me SIP Kaise Kare? How to Start SIP in PhonePe? SIP ; 8A3s9WP_7l4 = Mutual Funds Explained by Dhruv Rathee (Hindi) | Learn every; 32WVJyg2Ql0 = Mutual Fund में निवेश कैसे शुरू करें? | Mutual Fund Investme; ACpQo1a_RBk = How to Invest in Mutual Funds? | Investing Strategy for Begi; Yt4SLOLpYBA = Mutual Funds Complete BEGINNERS GUIDE in Telugu; or3oYy6sXJ0 = Should You Stop Your SIP Now ?? Indian Market Update !!; l-5gx7CUCSk = Should You Stop Your SIP When the Market Falls? | NKBS; sIeD8Z_nUTE = This can save you from Loss in SIP!  #finance #money #invest; Mr5hz8IpNxI = Why Nifty Gave Negative Returns in Last 5 Years? | Should yo; hXnWvBq_o4M = Stop Your Mutual Fund SIP Now | Is Long Term SIP Is a Big Sc; OF4KP76HNhk = How To Start SIP In Mutual Funds | First SIP investment Proc; C2p7Bf1vNeA = How to Start SIP &amp; How SIP works? With Real Life Experie
