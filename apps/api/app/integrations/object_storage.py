"""Raw diff storage (S3-compatible). Falls back to local disk when no bucket is configured."""
import pathlib

import boto3

from app.config import get_settings

settings = get_settings()
_LOCAL_FALLBACK_DIR = pathlib.Path(__file__).resolve().parents[2] / ".local_object_storage"


def put_raw_diff(object_key: str, content: str) -> str:
    """Store a raw diff blob and return its object key."""
    if settings.object_storage_bucket:
        s3 = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        s3.put_object(
            Bucket=settings.object_storage_bucket,
            Key=object_key,
            Body=content.encode("utf-8"),
        )
        return object_key

    _LOCAL_FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
    path = _LOCAL_FALLBACK_DIR / object_key.replace("/", "__")
    path.write_text(content)
    return object_key


def get_raw_diff(object_key: str) -> str:
    if settings.object_storage_bucket:
        s3 = boto3.client("s3", region_name=settings.aws_region)
        obj = s3.get_object(Bucket=settings.object_storage_bucket, Key=object_key)
        return obj["Body"].read().decode("utf-8")

    path = _LOCAL_FALLBACK_DIR / object_key.replace("/", "__")
    return path.read_text()
