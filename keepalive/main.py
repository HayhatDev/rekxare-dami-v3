import os
import sys
import urllib.request


def _ping(url: str) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": "render-keepalive/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read(200).decode("utf-8", errors="replace")
        print(f"keepalive {resp.status}: {body[:80]}")
        return 0


def main() -> int:
    url = os.environ.get("KEEPALIVE_URL", "").strip()
    if not url:
        print("KEEPALIVE_URL is not set")
        return 1
    try:
        return _ping(url)
    except Exception as e:  # surface the failure so the cron marks the job failed
        print("keepalive failed:", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())