from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import db
from auth import router as auth_router, seed_admin
from routes import router as erp_router

app = FastAPI(title="Akgedik Üzüm Yönetim Sistemi")

app.include_router(auth_router)
app.include_router(erp_router)


@app.get("/api/")
async def root():
    return {"message": "Akgedik Üzüm Yönetim Sistemi API"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    logger.info("Akgedik ERP başlatıldı, admin hazır.")


@app.on_event("shutdown")
async def shutdown():
    from database import client
    client.close()
