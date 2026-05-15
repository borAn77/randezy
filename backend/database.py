from sqlmodel import create_engine, Session, SQLModel

# Veritabanı dosyası adı
sqlite_file_name = "randezy.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Veritabanı motoru
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

# Veritabanı bağlantısı (Session) oluşturucu
def get_session():
    with Session(engine) as session:
        yield session