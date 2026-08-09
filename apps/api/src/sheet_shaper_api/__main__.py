from __future__ import annotations

import logging

import uvicorn

from .config import get_settings
from .main import create_app


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port, workers=settings.workers, proxy_headers=False, server_header=False)


if __name__ == "__main__":
    main()
