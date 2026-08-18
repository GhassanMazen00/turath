"""جلب مع كاش محلي على القرص.

القاعدة: لا نضرب المصدر الخارجي في كل طلب. الكاش يُفتَح أولًا،
وإعادة التحقق تتم بحذف الكاش أو تجاوزه صراحةً.
"""
import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache"
TIMEOUT = 60


class SourceUnavailable(RuntimeError):
    """تعذّر الوصول إلى المصدر. لا يُستبدل بمحتوى مُختلق."""


def _cache_path(url: str) -> Path:
    return CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest()[:32] + ".cache")


def fetch(url: str, *, refresh: bool = False) -> bytes:
    cp = _cache_path(url)
    if cp.exists() and not refresh:
        return cp.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "turath/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        if cp.exists():
            return cp.read_bytes()          # كاش قديم خير من لا شيء
        raise SourceUnavailable(f"{url} — {e}") from e
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cp.write_bytes(body)
    return body


def fetch_json(url: str, *, refresh: bool = False):
    return json.loads(fetch(url, refresh=refresh).decode("utf-8"))
