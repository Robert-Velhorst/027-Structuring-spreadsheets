from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from . import __version__
from .config import Settings, get_settings
from .db import Database
from .engine import EngineError, OPERATION_RISK
from .models import ApplyRequest, PreviewRequest
from .service import ServiceError, SheetShaperService


LOGGER = logging.getLogger("sheet_shaper")
OWNER = "local-owner"


def envelope(data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


def error_envelope(code: str, message: str, retry_safe: bool = False, request_id: str | None = None) -> dict[str, Any]:
    return {"ok": False, "error": {"code": code, "message": message, "retrySafe": retry_safe, "requestId": request_id}}


def bearer_token(value: str | None) -> str:
    if not value or not value.lower().startswith("bearer "):
        return ""
    return value[7:].strip()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    database = Database(settings.database_path)
    service = SheetShaperService(settings, database)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await run_in_threadpool(service.initialize)
        await run_in_threadpool(service.prune_expired_metadata)
        app.state.service = service
        yield

    app = FastAPI(
        title="Sheet Shaper API",
        version=__version__,
        description="Safety-first local spreadsheet structuring and HAI connector.",
        docs_url=None if settings.public_mode else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.service = service
    app.add_middleware(CORSMiddleware, allow_origins=settings.origin_list, allow_credentials=False, allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"])

    request_times: dict[str, deque[float]] = defaultdict(deque)

    @app.middleware("http")
    async def security_boundary(request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))[:100]
        request.state.request_id = request_id
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                declared_length = int(content_length)
            except ValueError:
                return JSONResponse(error_envelope("INVALID_CONTENT_LENGTH", "Content-Length must be a non-negative integer.", request_id=request_id), status_code=400)
            if declared_length < 0:
                return JSONResponse(error_envelope("INVALID_CONTENT_LENGTH", "Content-Length must be a non-negative integer.", request_id=request_id), status_code=400)
            if declared_length > settings.max_upload_mb * 1024 * 1024 + 1024 * 1024:
                return JSONResponse(error_envelope("REQUEST_TOO_LARGE", "The request exceeds the configured upload limit.", request_id=request_id), status_code=413)
        if settings.public_mode and request.url.path.startswith(("/api/", "/hai/")):
            key = request.client.host if request.client else "unknown"; current = time.monotonic(); queue = request_times[key]
            while queue and current - queue[0] > 60: queue.popleft()
            if len(queue) >= 120: return JSONResponse(error_envelope("RATE_LIMITED", "Too many requests. Retry shortly.", True, request_id), status_code=429)
            queue.append(current)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        response.headers["Cache-Control"] = "no-store" if request.url.path.startswith(("/api/", "/hai/")) else "public, max-age=300"
        return response

    def service_from(request: Request) -> SheetShaperService:
        return request.app.state.service

    def require_api(request: Request, authorization: str | None = Header(default=None)) -> str:
        if settings.public_mode and not settings.token_matches(bearer_token(authorization)):
            raise HTTPException(status_code=401, detail={"code": "NOT_AUTHORIZED", "message": "A valid bearer token is required."}, headers={"WWW-Authenticate": "Bearer"})
        return OWNER

    def require_hai(authorization: str | None = Header(default=None)) -> str:
        if not settings.token_matches(bearer_token(authorization)):
            raise HTTPException(status_code=401, detail={"code": "NOT_AUTHORIZED", "message": "A valid HAI bearer token is required."}, headers={"WWW-Authenticate": "Bearer"})
        return OWNER

    @app.exception_handler(ServiceError)
    async def service_error(request: Request, error: ServiceError):
        LOGGER.warning("service_error code=%s request_id=%s", error.code, request.state.request_id)
        return JSONResponse(error_envelope(error.code, str(error), error.retry_safe, request.state.request_id), status_code=error.status_code)

    @app.exception_handler(FastAPIHTTPException)
    async def http_error(request: Request, error: FastAPIHTTPException):
        detail = error.detail if isinstance(error.detail, dict) else {"code": "HTTP_ERROR", "message": str(error.detail)}
        return JSONResponse(error_envelope(str(detail.get("code", "HTTP_ERROR")), str(detail.get("message", "The request was rejected.")), False, request.state.request_id), status_code=error.status_code, headers=error.headers)

    @app.exception_handler(EngineError)
    async def engine_error(request: Request, error: EngineError):
        return JSONResponse(error_envelope(error.code, str(error), False, request.state.request_id), status_code=400)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        return JSONResponse(error_envelope("INVALID_REQUEST", "One or more request fields are invalid.", False, request.state.request_id), status_code=422)

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception):
        LOGGER.exception("unexpected_error request_id=%s", request.state.request_id)
        return JSONResponse(error_envelope("INTERNAL_ERROR", "The request failed safely. No unvalidated result was accepted.", False, request.state.request_id), status_code=500)

    @app.get("/healthz", include_in_schema=False)
    async def health():
        return {"status": "ok", "version": __version__}

    @app.get("/readyz", include_in_schema=False)
    async def ready(request: Request):
        def check_database() -> None:
            with request.app.state.service.database.connection() as connection:
                connection.execute("SELECT 1").fetchone()
        await run_in_threadpool(check_database)
        return {"status": "ready", "mode": "public" if settings.public_mode else "local"}

    @app.get("/api/v1/capabilities")
    async def capabilities(owner: str = Depends(require_api)):
        return envelope({"version": __version__, "mode": "public" if settings.public_mode else "local", "operations": [{"type": key, "risk": value} for key, value in OPERATION_RISK.items()], "maxCells": settings.max_cells, "maxUploadMb": settings.max_upload_mb, "previewTtlSeconds": settings.preview_ttl_seconds, "hai": {"configured": bool(settings.api_token), "mutationsEnabled": settings.hai_mutations_enabled}, "externalTransmission": settings.public_mode})

    @app.post("/api/v1/documents", status_code=201)
    async def import_document(request: Request, file: UploadFile = File(...), owner: str = Depends(require_api)):
        return envelope(await service_from(request).import_upload(file, owner))

    @app.get("/api/v1/documents")
    async def documents(request: Request, owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).list_documents, owner))

    @app.get("/api/v1/documents/{document_id}")
    async def document(request: Request, document_id: str, row: int = Query(1, ge=1), column: int = Query(1, ge=1), rows: int = Query(100, ge=1, le=200), columns: int = Query(30, ge=1, le=50), owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).get_document, document_id, owner, True, row, column, rows, columns))

    @app.delete("/api/v1/documents/{document_id}")
    async def delete_document(request: Request, document_id: str, owner: str = Depends(require_api)):
        await run_in_threadpool(service_from(request).delete_document, document_id, owner)
        return envelope({"deleted": True, "documentId": document_id})

    @app.post("/api/v1/documents/{document_id}/preview")
    async def preview(request: Request, document_id: str, body: PreviewRequest, owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).preview, document_id, body.model_dump(), owner))

    @app.post("/api/v1/documents/{document_id}/apply")
    async def apply(request: Request, document_id: str, body: ApplyRequest, owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).apply, document_id, body.model_dump(), owner))

    @app.post("/api/v1/operations/{operation_id}/restore")
    async def restore(request: Request, operation_id: str, owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).restore, operation_id, owner))

    @app.get("/api/v1/history")
    async def history(request: Request, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50), status: str = "", query: str = "", owner: str = Depends(require_api)):
        return envelope(await run_in_threadpool(service_from(request).history, owner, page, page_size, status, query[:100]))

    @app.get("/api/v1/documents/{document_id}/download", response_class=FileResponse)
    async def download(request: Request, document_id: str, owner: str = Depends(require_api)):
        path, filename, media_type = await run_in_threadpool(service_from(request).download, document_id, owner)
        return FileResponse(path, filename=filename, media_type=media_type)

    @app.get("/hai/v1/manifest")
    async def hai_manifest(owner: str = Depends(require_hai)):
        return envelope({"id": "sheet-shaper", "name": "Sheet Shaper", "version": __version__, "transport": "https", "openapi": "/openapi.json", "authentication": "bearer", "readOnlyByDefault": True, "capabilities": ["documents.list", "documents.read", "quality.analyze", "operations.preview"] + (["operations.apply", "operations.restore"] if settings.hai_mutations_enabled else [])})

    @app.get("/hai/v1/documents")
    async def hai_documents(request: Request, owner: str = Depends(require_hai)):
        return envelope(await run_in_threadpool(service_from(request).list_documents, owner))

    @app.get("/hai/v1/documents/{document_id}/analyze")
    async def hai_analyze(request: Request, document_id: str, owner: str = Depends(require_hai)):
        document_data = await run_in_threadpool(service_from(request).get_document, document_id, owner, True, 1, 1, 50, 20)
        return envelope({"document": {key: document_data[key] for key in ["id", "name", "rows", "columns", "versionHash"]}, "quality": document_data["quality"], "target": document_data["window"]["range"]})

    @app.post("/hai/v1/documents/{document_id}/preview")
    async def hai_preview(request: Request, document_id: str, body: PreviewRequest, owner: str = Depends(require_hai)):
        return envelope(await run_in_threadpool(service_from(request).preview, document_id, body.model_dump(), owner))

    @app.post("/hai/v1/documents/{document_id}/apply")
    async def hai_apply(request: Request, document_id: str, body: ApplyRequest, owner: str = Depends(require_hai)):
        if not settings.hai_mutations_enabled: raise ServiceError("HAI_MUTATIONS_DISABLED", "HAI mutation capability is disabled. Use the human review flow or explicitly enable it.", 403)
        return envelope(await run_in_threadpool(service_from(request).apply, document_id, body.model_dump(), owner))

    @app.post("/hai/v1/operations/{operation_id}/restore")
    async def hai_restore(request: Request, operation_id: str, owner: str = Depends(require_hai)):
        if not settings.hai_mutations_enabled:
            raise ServiceError("HAI_MUTATIONS_DISABLED", "HAI mutation capability is disabled. Restore remains available in the human review interface.", 403)
        return envelope(await run_in_threadpool(service_from(request).restore, operation_id, owner))

    web_dist = settings.web_dist
    if web_dist and web_dist.exists():
        app.mount("/", StaticFiles(directory=web_dist, html=True), name="web")

    return app


app = create_app()
