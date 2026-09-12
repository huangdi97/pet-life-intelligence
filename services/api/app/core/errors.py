"""Unified error envelope per docs/04_API_CONTRACT_BASELINE.md."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    status_code = 500
    code = "INTERNAL"

    def __init__(self, message: str, *, code: str | None = None,
                 status_code: int | None = None, details: dict | None = None) -> None:
        self.message = message
        self.details = details or {}
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        super().__init__(message)


class PermissionDenied(APIError):
    status_code = 403
    code = "PERMISSION_DENIED"


class Unauthenticated(APIError):
    status_code = 401
    code = "UNAUTHENTICATED"


class NotFound(APIError):
    status_code = 404
    code = "NOT_FOUND"


class ValidationFailed(APIError):
    status_code = 422
    code = "VALIDATION_ERROR"


class ConflictError(APIError):
    status_code = 409
    code = "CONFLICT"


class RateLimited(APIError):
    status_code = 429
    code = "RATE_LIMITED"


def _envelope(request: Request, code: str, message: str, details: dict | None = None):
    request_id = getattr(request.state, "request_id", None)
    error: dict = {"code": code, "message": message, "request_id": request_id}
    if details:
        error["details"] = details
    return {"error": error}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(request, exc.code, exc.message, exc.details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {401: "UNAUTHENTICATED", 403: "PERMISSION_DENIED", 404: "NOT_FOUND"}.get(
            exc.status_code, "HTTP_ERROR"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(request, code, str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_envelope(
                request, "VALIDATION_ERROR", "Request payload failed validation.",
                {"errors": exc.errors()[:20]},
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_envelope(request, "INTERNAL", "Database error."),
        )
