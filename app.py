import re
import os
from datetime import timedelta, datetime
import mysql.connector
from flask import Flask, request, session
from werkzeug.security import (generate_password_hash,check_password_hash,)

from db import get_connection

app = Flask(
    __name__,
    static_folder="dist",
    static_url_path="/static",
)

app.config.update(
    SECRET_KEY=os.environ["FLASK_SECRET_KEY"],
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
)


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Planify"}


@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all(isinstance(value, str) for value in (name, email, password)):
        return {"error": "Nombre, correo y contraseña son obligatorios."}, 400

    name = name.strip()
    email = email.strip().lower()

    if not 1 <= len(name) <= 80:
        return {"error": "El nombre debe tener entre 1 y 80 caracteres."}, 400

    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return {"error": "Escribe un correo electrónico válido."}, 400

    if not 12 <= len(password) <= 128:
        return {"error": "La contraseña debe tener entre 12 y 128 caracteres."}, 400

    password_hash = generate_password_hash(password)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            """,
            (name, email, password_hash),
        )

        connection.commit()

        return {"message": "Cuenta creada correctamente."}, 201

    except mysql.connector.IntegrityError as error:
        if connection is not None:
            connection.rollback()

        if error.errno == 1062:
            return {"error": "No se pudo registrar ese correo."}, 409

        app.logger.exception("Error de integridad al registrar usuario")
        return {"error": "No se pudo crear la cuenta."}, 500

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error de MySQL al registrar usuario")
        return {"error": "No se pudo crear la cuenta. Intenta más tarde."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return {"error": "Correo y contraseña son obligatorios."}, 400

    email = email.strip().lower()

    if not email or len(email) > 254 or not 1 <= len(password) <= 128:
        return {"error": "Correo o contraseña incorrectos."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,),
        )

        user = cursor.fetchone()

        if user is None or not check_password_hash(
            user["password_hash"], password
        ):
            return {"error": "Correo o contraseña incorrectos."}, 401

        session.clear()
        session["user_id"] = user["id"]
        session.permanent = True

        return {
            "message": "Sesión iniciada.",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
            },
        }, 200

    except mysql.connector.Error:
        app.logger.exception("Error de MySQL al iniciar sesión")
        return {"error": "No se pudo iniciar sesión. Intenta más tarde."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.get("/api/auth/me")
def current_user():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, name, email FROM users WHERE id = %s",
            (user_id,),
        )

        user = cursor.fetchone()

        if user is None:
            session.clear()
            return {"error": "Debes iniciar sesión."}, 401

        return {"user": user}, 200

    except mysql.connector.Error:
        app.logger.exception("Error al consultar la sesión")
        return {"error": "No se pudo consultar la sesión."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.post("/api/auth/logout")
def logout():
    session.clear()
    return {"message": "Sesión cerrada."}, 200

@app.get("/api/activities")
def list_activities():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                title,
                description,
                DATE_FORMAT(activity_date, '%Y-%m-%d') AS date,
                TIME_FORMAT(start_time, '%H:%i') AS start,
                TIME_FORMAT(end_time, '%H:%i') AS end,
                category,
                priority,
                status,
                DATE_FORMAT(
                    completed_at, '%Y-%m-%dT%H:%i:%SZ'
                ) AS completedAt
            FROM activities
            WHERE user_id = %s
            ORDER BY activity_date, start_time, id
            """,
            (user_id,),
        )

        return {"activities": cursor.fetchall()}, 200

    except mysql.connector.Error:
        app.logger.exception("Error al consultar actividades")
        return {"error": "No se pudieron consultar las actividades."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()                                    
            
@app.post("/api/activities")
def create_activity():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    fields = (
        "title", "description", "date",
        "start", "end", "category", "priority",
    )

    if not all(isinstance(data.get(field), str) for field in fields):
        return {"error": "Los campos de la actividad son obligatorios."}, 400

    title = data["title"].strip()
    description = data["description"].strip()

    if not 1 <= len(title) <= 150:
        return {"error": "El título debe tener entre 1 y 150 caracteres."}, 400

    if len(description) > 2000:
        return {"error": "La descripción admite hasta 2000 caracteres."}, 400

    categories = (
        "Tareas",
        "Juntas y reuniones",
        "Trabajos y proyectos",
        "Quehaceres",
        "Eventos importantes",
    )

    if data["category"] not in categories:
        return {"error": "Selecciona una categoría válida."}, 400

    if data["priority"] not in ("Crítica", "Alta", "Media", "Baja"):
        return {"error": "Selecciona una prioridad válida."}, 400

    try:
        activity_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        start = datetime.strptime(data["start"], "%H:%M").time()
        end = datetime.strptime(data["end"], "%H:%M").time()
    except ValueError:
        return {"error": "La fecha o las horas no son válidas."}, 400

    if end <= start:
        return {"error": "La hora de fin debe ser posterior al inicio."}, 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO activities (
                user_id, title, description, activity_date,
                start_time, end_time, category, priority, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                title,
                description,
                activity_date,
                start,
                end,
                data["category"],
                data["priority"],
                "Pendiente",
            ),
        )

        activity_id = cursor.lastrowid
        
        record_history(
            cursor,
            user_id,
            activity_id,
            title,
            data["category"],
            "Actividad creada",
        )
        
        connection.commit()

        return {
            "message": "Actividad creada.",
            "id": activity_id,
        }, 201

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al crear actividad")
        return {"error": "No se pudo guardar la actividad."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.delete("/api/activities/<int:activity_id>")
def delete_activity(activity_id):            
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        
        cursor.execute(
            
            """
            SELECT title, category
            FROM activities
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (activity_id, user_id),
        )

        activity = cursor.fetchone()

        if activity is None:
            connection.rollback()
            return {"error": "Actividad no encontrada."}, 404

        record_history(
            cursor,
            user_id,
            activity_id,
            activity[0],
            activity[1],
            "Actividad eliminada",
        )
        
        cursor.execute(
            """
            DELETE FROM activities
            WHERE id = %s AND user_id = %s
            """,
            (activity_id, user_id),
        )

        if cursor.rowcount == 0:
            connection.rollback()
            return {"error": "Actividad no encontrada."}, 404
        
        

        connection.commit()
        return {"message": "Actividad eliminada."}, 200

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al eliminar actividad")
        return {"error": "No se pudo eliminar la actividad."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()    
            
@app.patch("/api/activities/<int:activity_id>/status")
def update_activity_status(activity_id):
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    status = data.get("status")

    if status not in ("Pendiente", "Completada"):
        return {"error": "El estado no es válido."}, 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT status,title,category
            FROM activities
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (activity_id, user_id),
        )

        activity = cursor.fetchone()

        if activity is None:
            connection.rollback()
            return {"error": "Actividad no encontrada."}, 404

        if activity[0] != status:
            cursor.execute(
                """
                UPDATE activities
                SET status = %s,
                    completed_at = CASE
                        WHEN %s = 'Completada' THEN UTC_TIMESTAMP()
                        ELSE NULL
                    END
                WHERE id = %s AND user_id = %s
                """,
                (status, status, activity_id, user_id),
            )
            
        if activity[0] != status:
            record_history(
                cursor,
                user_id,
                activity_id,
                activity[1],
                activity[2],
                "Actividad completada"
                if status == "Completada"
                else "Actividad reabierta",
            )    

        connection.commit()

        return {"message": "Estado actualizado.", "status": status}, 200

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al actualizar el estado")
        return {"error": "No se pudo actualizar el estado."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()       
            
def validate_activity(data):
    if not isinstance(data, dict):
        raise ValueError("Envía los datos en formato JSON.")

    fields = (
        "title", "description", "date",
        "start", "end", "category", "priority",
    )

    if not all(isinstance(data.get(field), str) for field in fields):
        raise ValueError("Completa los campos de la actividad.")

    title = data["title"].strip()
    description = data["description"].strip()

    if not 1 <= len(title) <= 150:
        raise ValueError("El título debe tener entre 1 y 150 caracteres.")

    if len(description) > 2000:
        raise ValueError("La descripción admite hasta 2000 caracteres.")

    categories = (
        "Tareas",
        "Juntas y reuniones",
        "Trabajos y proyectos",
        "Quehaceres",
        "Eventos importantes",
    )

    if data["category"] not in categories:
        raise ValueError("Selecciona una categoría válida.")

    if data["priority"] not in ("Crítica", "Alta", "Media", "Baja"):
        raise ValueError("Selecciona una prioridad válida.")

    try:
        activity_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        start = datetime.strptime(data["start"], "%H:%M").time()
        end = datetime.strptime(data["end"], "%H:%M").time()
    except ValueError:
        raise ValueError("La fecha o las horas no son válidas.")

    if activity_date.year < 1000:
        raise ValueError("La fecha debe ser del año 1000 en adelante.")

    if end <= start:
        raise ValueError("La hora de fin debe ser posterior al inicio.")

    return (
        title,
        description,
        activity_date,
        start,
        end,
        data["category"],
        data["priority"],
    )
    
@app.patch("/api/activities/<int:activity_id>")
def update_activity(activity_id):
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    try:
        values = validate_activity(request.get_json(silent=True))
    except ValueError as error:
        return {"error": str(error)}, 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id FROM activities
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (activity_id, user_id),
        )

        if cursor.fetchone() is None:
            connection.rollback()
            return {"error": "Actividad no encontrada."}, 404

        cursor.execute(
            """
            UPDATE activities
            SET title = %s,
                description = %s,
                activity_date = %s,
                start_time = %s,
                end_time = %s,
                category = %s,
                priority = %s
            WHERE id = %s AND user_id = %s
            """,
            (*values, activity_id, user_id),
        )
        
        record_history(
    cursor,
    user_id,
    activity_id,
    values[0],
    values[5],
    "Actividad actualizada",
)

        connection.commit()
        return {"message": "Actividad actualizada."}, 200

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al editar actividad")
        return {"error": "No se pudo actualizar la actividad."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.patch("/api/auth/profile")
def update_profile():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    name = data.get("name")
    email = data.get("email")

    if not isinstance(name, str) or not isinstance(email, str):
        return {"error": "Nombre y correo son obligatorios."}, 400

    name = name.strip()
    email = email.strip().lower()

    if not 1 <= len(name) <= 80:
        return {"error": "El nombre debe tener entre 1 y 80 caracteres."}, 400

    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return {"error": "Escribe un correo electrónico válido."}, 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id FROM users
            WHERE id = %s
            FOR UPDATE
            """,
            (user_id,),
        )

        if cursor.fetchone() is None:
            connection.rollback()
            session.clear()
            return {"error": "Debes iniciar sesión."}, 401

        cursor.execute(
            "UPDATE users SET name = %s, email = %s WHERE id = %s",
            (name, email, user_id),
        )

        connection.commit()

        return {
            "message": "Perfil actualizado.",
            "user": {"id": user_id, "name": name, "email": email},
        }, 200

    except mysql.connector.IntegrityError as error:
        if connection is not None:
            connection.rollback()

        if error.errno == 1062:
            return {"error": "No se puede utilizar ese correo."}, 409

        app.logger.exception("Error de integridad al actualizar perfil")
        return {"error": "No se pudo actualizar el perfil."}, 500

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al actualizar perfil")
        return {"error": "No se pudo actualizar el perfil."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()   
            
@app.get("/api/preferences")
def get_preferences():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT reminders, anticipation, theme
            FROM user_preferences
            WHERE user_id = %s
            """,
            (user_id,),
        )

        preferences = cursor.fetchone()

        if preferences is None:
            preferences = {
                "reminders": True,
                "anticipation": "1440",
                "theme": "Claro",
            }
        else:
            preferences["reminders"] = bool(preferences["reminders"])
            preferences["anticipation"] = str(preferences["anticipation"])

        return {"preferences": preferences}, 200

    except mysql.connector.Error:
        app.logger.exception("Error al consultar preferencias")
        return {"error": "No se pudieron consultar las preferencias."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.patch("/api/preferences")
def update_preferences():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    reminders = data.get("reminders")
    anticipation = str(data.get("anticipation"))
    theme = data.get("theme")

    if not isinstance(reminders, bool):
        return {"error": "La opción de avisos no es válida."}, 400

    if anticipation not in ("30", "60", "1440", "4320"):
        return {"error": "Selecciona una anticipación válida."}, 400

    if theme not in ("Claro", "Oscuro"):
        return {"error": "Selecciona un tema válido."}, 400

    minutes = int(anticipation)
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO user_preferences (
                user_id, reminders, anticipation, theme
            )
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                reminders = %s,
                anticipation = %s,
                theme = %s
            """,
            (
                user_id, reminders, minutes, theme,
                reminders, minutes, theme,
            ),
        )

        connection.commit()

        return {
            "message": "Preferencias guardadas.",
            "preferences": {
                "reminders": reminders,
                "anticipation": anticipation,
                "theme": theme,
            },
        }, 200

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al guardar preferencias")
        return {"error": "No se pudieron guardar las preferencias."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
@app.get("/api/history")
def list_history():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                activity_id AS activityId,
                title,
                category,
                action,
                DATE_FORMAT(
                    occurred_at, '%Y-%m-%dT%H:%i:%SZ'
                ) AS date
            FROM activity_history
            WHERE user_id = %s
            ORDER BY occurred_at DESC, id DESC
            """,
            (user_id,),
        )

        return {"history": cursor.fetchall()}, 200

    except mysql.connector.Error:
        app.logger.exception("Error al consultar historial")
        return {"error": "No se pudo consultar el historial."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()
            
            
def record_history(cursor, user_id, activity_id, title, category, action):
    cursor.execute(
        """
        INSERT INTO activity_history (
            user_id, activity_id, title, category, action, occurred_at
        )
        VALUES (%s, %s, %s, %s, %s, UTC_TIMESTAMP())
        """,
        (user_id, activity_id, title, category, action),
    )
    
@app.get("/api/notices/read")
def get_notice_reads():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT r.activity_id
            FROM notice_reads AS r
            JOIN activities AS a ON a.id = r.activity_id
            WHERE r.user_id = %s AND a.user_id = %s
            """,
            (user_id, user_id),
        )

        return {
            "read": [row[0] for row in cursor.fetchall()]
        }, 200

    except mysql.connector.Error:
        app.logger.exception("Error al consultar avisos leídos")
        return {"error": "No se pudieron consultar los avisos leídos."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()  
            
@app.post("/api/notices/read")
def mark_notices_read():
    user_id = session.get("user_id")

    if user_id is None:
        return {"error": "Debes iniciar sesión."}, 401

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {"error": "Envía los datos en formato JSON."}, 400

    activity_ids = data.get("activityIds")

    if not isinstance(activity_ids, list):
        return {"error": "Envía una lista de actividades."}, 400

    if not all(type(value) is int and value > 0 for value in activity_ids):
        return {"error": "Los identificadores no son válidos."}, 400

    activity_ids = sorted(set(activity_ids))

    if not activity_ids:
        return {"message": "No hay avisos para marcar."}, 200

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        placeholders = ", ".join(["%s"] * len(activity_ids))

        cursor.execute(
            f"""
            SELECT id FROM activities
            WHERE user_id = %s
              AND id IN ({placeholders})
            FOR UPDATE
            """,
            (user_id, *activity_ids),
        )

        owned_ids = {row[0] for row in cursor.fetchall()}

        if owned_ids != set(activity_ids):
            connection.rollback()
            return {"error": "Actividad no encontrada."}, 404

        cursor.executemany(
            """
            INSERT INTO notice_reads (user_id, activity_id, read_at)
            VALUES (%s, %s, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE read_at = read_at
            """,
            [(user_id, activity_id) for activity_id in activity_ids],
        )

        connection.commit()
        return {"message": "Avisos marcados como leídos."}, 200

    except mysql.connector.Error:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Error al marcar avisos como leídos")
        return {"error": "No se pudieron marcar los avisos."}, 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()                                                                                                                              