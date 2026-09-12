"""Storage backends: MinIO (S3) primary, local disk fallback. Random
server-generated keys; original filename never used in storage paths."""

import hashlib
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


class StorageError(Exception):
    pass


class StorageBackend(Protocol):
    name: str

    async def put(self, key: str, content: bytes, content_type: str) -> None: ...
    async def get(self, key: str) -> bytes: ...


class MinioBackend:
    name = "minio"

    def __init__(self) -> None:
        from minio import Minio  # lazy import

        s = get_settings()
        self.client = Minio(
            s.s3_endpoint.replace("http://", "").replace("https://", ""),
            access_key=s.s3_access_key,
            secret_key=s.s3_secret_key,
            secure=s.s3_secure,
        )
        self.bucket = s.s3_bucket
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    async def put(self, key: str, content: bytes, content_type: str) -> None:
        import io

        self.client.put_object(
            self.bucket, key, io.BytesIO(content), len(content),
            content_type=content_type,
        )

    async def get(self, key: str) -> bytes:
        resp = self.client.get_object(self.bucket, key)
        try:
            return resp.read()
        finally:
            resp.close()
            resp.release_conn()


class LocalDiskBackend:
    name = "local"

    def __init__(self) -> None:
        s = get_settings()
        self.root = Path(s.local_upload_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str):
        safe = hashlib.sha256(key.encode()).hexdigest()
        return self.root / safe

    async def put(self, key: str, content: bytes, content_type: str) -> None:
        self._path(key).write_bytes(content)

    async def get(self, key: str) -> bytes:
        p = self._path(key)
        if not p.exists():
            raise StorageError("object missing")
        return p.read_bytes()


_backend: StorageBackend | None = None


def get_storage() -> StorageBackend:
    global _backend
    if _backend is not None:
        return _backend
    settings = get_settings()
    if settings.storage_backend == "minio":
        try:
            _backend = MinioBackend()
            return _backend
        except Exception:  # noqa: BLE001 — fall back to local disk
            _backend = LocalDiskBackend()
            return _backend
    _backend = LocalDiskBackend()
    return _backend


def reset_storage() -> None:
    global _backend
    _backend = None
