import os
from datetime import datetime, timedelta
from io import BytesIO
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, create_engine, select
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# Basic settings pulled from environment for easy overrides
SECRET_KEY = os.getenv("TALENTS_SECRET_KEY", "talents-default-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TALENTS_TOKEN_MINUTES", "10080"))  # 7 days
MANAGER_KEY = os.getenv("TALENTS_MANAGER_KEY", "manager-key")
PASTOR_KEY = os.getenv("TALENTS_PASTOR_KEY", "pastor-key")

DATABASE_URL = os.getenv("TALENTS_DB_URL", "sqlite:///talents.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

app = FastAPI(title="Talents API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Entry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pastor_name: str = Field(index=True)
    task_type: str
    custom_task: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: int
    started_at: datetime
    ended_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EntryCreate(BaseModel):
    pastor_name: Optional[str] = None
    task_type: str
    custom_task: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: int
    started_at: datetime
    ended_at: datetime


class LoginRequest(BaseModel):
    role: str
    name: Optional[str] = None
    passcode: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserContext(BaseModel):
    role: str
    name: Optional[str]


class EntryResponse(Entry):
    pass


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> UserContext:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        name = payload.get("sub")
        if role is None:
            raise credentials_exception
        return UserContext(role=role, name=name)
    except JWTError:
        raise credentials_exception


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow()}


@app.post("/api/auth/login", response_model=TokenResponse)
def login(request: LoginRequest):
    role = request.role.lower()
    if role == "manager":
        if request.passcode != MANAGER_KEY:
            raise HTTPException(status_code=401, detail="Invalid manager passcode")
        token = create_access_token({"sub": "manager", "role": "manager"})
    elif role == "pastor":
        if request.passcode != PASTOR_KEY:
            raise HTTPException(status_code=401, detail="Invalid pastor passcode")
        if not request.name:
            raise HTTPException(status_code=400, detail="Pastor name required")
        token = create_access_token({"sub": request.name, "role": "pastor"})
    else:
        raise HTTPException(status_code=400, detail="Unknown role")
    return TokenResponse(access_token=token)


@app.get("/api/me", response_model=UserContext)
def me(token: str = Query(..., alias="token")):
    # Frontend can pass token as query for a quick peek; otherwise use Authorization header
    return decode_token(token)


def _get_user_from_header(authorization: Optional[str]) -> UserContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    return decode_token(token)


@app.post("/api/entries", response_model=EntryResponse)
def create_entry(
    entry: EntryCreate,
    authorization: Optional[str] = Header(None, convert_underscores=False),
    session: Session = Depends(get_session),
):
    user = _get_user_from_header(authorization)
    pastor_name = entry.pastor_name if user.role == "manager" and entry.pastor_name else user.name
    if user.role == "pastor" and pastor_name != user.name:
        raise HTTPException(status_code=403, detail="Pastors may only log their own entries")
    new_entry = Entry(
        pastor_name=pastor_name,
        task_type=entry.task_type,
        custom_task=entry.custom_task,
        notes=entry.notes,
        duration_minutes=entry.duration_minutes,
        started_at=entry.started_at,
        ended_at=entry.ended_at,
    )
    session.add(new_entry)
    session.commit()
    session.refresh(new_entry)
    return new_entry


@app.get("/api/entries", response_model=List[EntryResponse])
def list_entries(
    pastor_name: Optional[str] = None,
    authorization: Optional[str] = Header(None, convert_underscores=False),
    session: Session = Depends(get_session),
):
    user = _get_user_from_header(authorization)
    query = select(Entry)
    if user.role == "pastor":
        query = query.where(Entry.pastor_name == user.name)
    elif pastor_name:
        query = query.where(Entry.pastor_name == pastor_name)
    results = session.exec(query.order_by(Entry.started_at.desc())).all()
    return results


def build_pdf(entries: List[Entry], subject: str) -> BytesIO:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 0.75 * inch
    y = height - margin

    pdf.setTitle(f"Talents report - {subject}")
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(margin, y, "Talents — Work Report")
    y -= 20
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin, y, f"Subject: {subject}")
    y -= 14
    pdf.drawString(margin, y, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    y -= 20

    if not entries:
        pdf.drawString(margin, y, "No entries found in this range.")
        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return buffer

    total_minutes = sum(e.duration_minutes for e in entries)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, f"Total time: {hours}h {minutes}m across {len(entries)} entries")
    y -= 18

    headers = ["When", "Task", "Notes", "Duration"]
    col_widths = [1.6 * inch, 1.4 * inch, 2.8 * inch, 0.9 * inch]

    def draw_row(values, bold=False):
        nonlocal y
        if y < margin + 40:
            pdf.showPage()
            y = height - margin
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
        x = margin
        for text, col_width in zip(values, col_widths):
            pdf.drawString(x, y, text[:80])
            x += col_width
        y -= 14

    draw_row(headers, bold=True)
    y -= 6

    for e in entries:
        when = e.started_at.strftime("%Y-%m-%d %H:%M")
        task = e.custom_task if e.task_type == "custom" and e.custom_task else e.task_type.title()
        notes = (e.notes or "").replace("\n", " ")
        duration = f"{e.duration_minutes // 60}h {e.duration_minutes % 60}m"
        draw_row([when, task, notes, duration])

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


@app.get("/api/export/pdf")
def export_pdf(
    pastor_name: Optional[str] = None,
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    authorization: Optional[str] = Header(None, convert_underscores=False),
    session: Session = Depends(get_session),
):
    user = _get_user_from_header(authorization)
    query = select(Entry)
    if user.role == "pastor":
        query = query.where(Entry.pastor_name == user.name)
        subject = user.name
    else:
        if pastor_name:
            query = query.where(Entry.pastor_name == pastor_name)
            subject = pastor_name
        else:
            subject = "All pastors"
    if start:
        query = query.where(Entry.started_at >= start)
    if end:
        query = query.where(Entry.started_at <= end)

    entries = session.exec(query.order_by(Entry.started_at)).all()
    pdf_buffer = build_pdf(entries, subject)
    filename = f"talents_{subject.replace(' ', '_').lower()}.pdf"
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


@app.get("/")
def root():
    return {"message": "Talents API is running"}
