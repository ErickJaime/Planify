import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


def get_connection():
    return mysql.connector.connect(
        host=os.environ["MYSQL_HOST"],
        port=int(os.environ["MYSQL_PORT"]),
        database=os.environ["MYSQL_DATABASE"],
        user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
        connection_timeout=5,
    )


if __name__ == "__main__":
    connection = get_connection()

    try:
        cursor = connection.cursor()

        try:
            cursor.execute("SELECT DATABASE(), CURRENT_USER()")
            database, user = cursor.fetchone()
            print(f"Conexión correcta: base={database}, usuario={user}")
        finally:
            cursor.close()
    finally:
        connection.close()