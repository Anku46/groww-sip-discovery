import re
from datetime import datetime, timezone
from html.parser import HTMLParser


class _TextExtractor(HTMLParser):
    SKIP = {"blockquote", "aside", "script", "style"}  # quotes/oneboxes repeat other people's text
    BLOCK = {"p", "br", "div", "li", "ul", "ol", "pre", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        elif tag in self.BLOCK and not self.skip:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
        elif tag in self.BLOCK and not self.skip:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    p = _TextExtractor()
    p.feed(html or "")
    p.close()
    text = "".join(p.parts)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def iso_date(value) -> str:
    """Normalise datetimes, epoch seconds or ISO strings to YYYY-MM-DD; anything else -> 'unknown'."""
    if value is None or value == "":
        return "unknown"
    try:
        if isinstance(value, datetime):
            return value.date().isoformat()
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, tz=timezone.utc).date().isoformat()
        s = str(value).strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}", s):
            return s[:10]
    except (ValueError, OSError, OverflowError):
        pass
    return "unknown"


def join_title(title: str, body: str) -> str:
    title, body = (title or "").strip(), (body or "").strip()
    if title and body:
        return f"{title}\n\n{body}"
    return title or body
