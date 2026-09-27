import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def oid(v):
    """Convert string to ObjectId if valid, else return as-is."""
    try:
        return ObjectId(v)
    except Exception:
        return v


def serialize(doc):
    """Convert a Mongo document to a JSON-safe dict, mapping _id -> id."""
    if doc is None:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if isinstance(v, ObjectId):
            d[k] = str(v)
    return d


def serialize_list(docs):
    return [serialize(d) for d in docs]


async def next_kod(prefix: str, pad: int = 3) -> str:
    """Generate a human-readable sequential code like C001, B001, H001."""
    res = await db.counters.find_one_and_update(
        {"_id": prefix},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = res["seq"]
    return f"{prefix}{str(seq).zfill(pad)}"
