from __future__ import annotations

import os
import sys
from pathlib import Path


def configure_bundle() -> None:
    bundle_root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[3]))
    bundled_web = bundle_root / "web"
    if bundled_web.exists():
        os.environ.setdefault("SS_WEB_DIST", str(bundled_web))


if __name__ == "__main__":
    configure_bundle()
    from sheet_shaper_api.__main__ import main

    main()
