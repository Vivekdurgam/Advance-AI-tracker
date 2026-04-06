import datetime as dt
import os
import sqlite3
from pathlib import Path


def main():
    db_path = Path(os.getenv("SQLITE_PATH", Path(__file__).resolve().parent / "data" / "db.sqlite3"))
    backup_dir = Path(os.getenv("SQLITE_BACKUP_DIR", Path(__file__).resolve().parent / "data" / "backups"))

    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found at: {db_path}")

    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    backup_path = backup_dir / f"ticketing-backup-{timestamp}.sqlite3"

    with sqlite3.connect(db_path) as source:
        with sqlite3.connect(backup_path) as destination:
            source.backup(destination)

    print(f"Backup written to {backup_path}")


if __name__ == "__main__":
    main()
