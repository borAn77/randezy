from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import appointments, businesses, users

app = FastAPI(title="Randezy API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(businesses.router)
app.include_router(appointments.router)
app.include_router(users.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
