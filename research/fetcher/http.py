import logging
import time

import requests

log = logging.getLogger(__name__)

USER_AGENT = "sip-discovery-research/0.1 (public voice-of-customer research)"


class HttpError(Exception):
    def __init__(self, status: int, url: str):
        super().__init__(f"HTTP {status} for {url}")
        self.status = status
        self.url = url  # never includes query params, so API keys don't leak into logs


class Http:
    """Small JSON client with a per-instance rate limit and retry on 429/5xx."""

    def __init__(self, min_interval: float = 1.0, headers: dict | None = None):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        if headers:
            self.session.headers.update(headers)
        self.min_interval = min_interval
        self._last = 0.0

    def _throttle(self):
        wait = self.min_interval - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()

    def _request(self, method, url, retries=4, **kw):
        last_err = None
        for attempt in range(retries + 1):
            self._throttle()
            try:
                r = self.session.request(method, url, timeout=30, **kw)
            except requests.RequestException as e:
                last_err = e
                time.sleep(min(2 ** attempt * 2, 30))
                continue
            if r.status_code == 429 or r.status_code >= 500:
                ra = r.headers.get("Retry-After", "")
                delay = int(ra) if ra.isdigit() else 2 ** attempt * 2
                log.warning("HTTP %s from %s, retrying in %ss", r.status_code, url, min(delay, 60))
                time.sleep(min(delay, 60))
                last_err = HttpError(r.status_code, url)
                continue
            if r.status_code >= 400:
                raise HttpError(r.status_code, url)
            return r.json()
        if isinstance(last_err, HttpError):
            raise last_err
        raise HttpError(0, f"{url} ({type(last_err).__name__})")

    def get_json(self, url, params=None, headers=None):
        params = {k: v for k, v in (params or {}).items() if v is not None}
        return self._request("GET", url, params=params, headers=headers)

    def post_json(self, url, data=None, auth=None, headers=None):
        return self._request("POST", url, data=data, auth=auth, headers=headers)
