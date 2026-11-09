"""CLI: python -m fetcher [--channels playstore,reddit] [--quick] [--merge-only]"""
import argparse
import logging
import sys
from types import SimpleNamespace

from . import config as default_config
from .env import ROOT, load_env
from .store import merge_and_write, save_channel

log = logging.getLogger("fetcher")


def _channels():
    # Imported lazily so a missing optional dependency only breaks its own channel.
    def play(cfg):
        from .sources import playstore
        return playstore.fetch(cfg)

    def app(cfg):
        from .sources import appstore
        return appstore.fetch(cfg)

    def red(cfg):
        from .sources import reddit
        return reddit.fetch(cfg)

    def yt(cfg):
        from .sources import youtube
        return youtube.fetch(cfg)

    def fm(cfg):
        from .sources import forums
        return forums.fetch(cfg)

    return {"playstore": play, "appstore": app, "reddit": red, "youtube": yt, "forums": fm}


def build_config(quick: bool):
    cfg = SimpleNamespace(**{k: getattr(default_config, k) for k in dir(default_config) if k.isupper()})
    if quick:
        for k, v in default_config.QUICK_OVERRIDES.items():
            setattr(cfg, k, v)
    return cfg


def main(argv=None) -> int:
    channels = _channels()
    p = argparse.ArgumentParser(prog="python -m fetcher", description="Phase 1 raw corpus fetcher")
    p.add_argument("--channels", default="all", help=f"comma list of {','.join(channels)} (default: all)")
    p.add_argument("--quick", action="store_true", help="small limits, writes to data_quick/ (smoke test)")
    p.add_argument("--merge-only", action="store_true", help="skip fetching; rebuild CSV from cached channels + manual")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s", datefmt="%H:%M:%S")
    load_env()
    cfg = build_config(args.quick)
    data_dir = ROOT / ("data_quick" if args.quick else "data")

    selected = list(channels) if args.channels == "all" else [c.strip() for c in args.channels.split(",") if c.strip()]
    unknown = [c for c in selected if c not in channels]
    if unknown:
        p.error(f"unknown channel(s): {', '.join(unknown)}")

    failed = []
    if not args.merge_only:
        for name in selected:
            log.info("=== %s ===", name)
            try:
                res = channels[name](cfg)
            except Exception:
                log.exception("%s failed; keeping its previous cache (if any)", name)
                failed.append(name)
                continue
            save_channel(data_dir, name, res)
            log.info("%s: %d records saved", name, len(res.records))

    s = merge_and_write(data_dir)
    print()
    print(f"Raw corpus: {s['totalRaw']} records -> {s['csv']}")
    for src, n in s["perChannel"].items():
        print(f"  {src:<10} {n:>6}   (SIP keyword: {s['perChannelWithSipKeyword'][src]})")
    print(f"  languages: {s['perLanguage']}   PII-flagged: {s['piiFlagged']}   duplicates removed: {s['duplicatesRemoved']}")
    if s["channelsMissing"]:
        print(f"  MISSING channels: {', '.join(s['channelsMissing'])}")
    if failed:
        print(f"  FAILED this run: {', '.join(failed)}")
    return 1 if failed and len(failed) == len(selected) else 0


if __name__ == "__main__":
    sys.exit(main())
