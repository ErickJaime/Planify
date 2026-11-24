CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    activity_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    category ENUM(
        'Tareas',
        'Juntas y reuniones',
        'Trabajos y proyectos',
        'Quehaceres',
        'Eventos importantes'
    ) NOT NULL,
    priority ENUM('Crítica', 'Alta', 'Media', 'Baja') NOT NULL,
    status ENUM('Pendiente', 'Completada') NOT NULL DEFAULT 'Pendiente',
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_activities_user_date (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    reminders BOOLEAN NOT NULL DEFAULT TRUE,
    anticipation SMALLINT UNSIGNED NOT NULL DEFAULT 1440,
    theme ENUM('Claro', 'Oscuro') NOT NULL DEFAULT 'Claro',
    CONSTRAINT fk_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    action ENUM(
        'Actividad creada',
        'Actividad actualizada',
        'Actividad completada',
        'Actividad reabierta',
        'Actividad eliminada'
    ) NOT NULL,
    occurred_at DATETIME NOT NULL,
    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_history_activity
        FOREIGN KEY (activity_id) REFERENCES activities(id)
        ON DELETE SET NULL,
    INDEX idx_history_user_date (user_id, occurred_at, id)
);

CREATE TABLE IF NOT EXISTS notice_reads (
    user_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NOT NULL,
    read_at DATETIME NOT NULL,
    PRIMARY KEY (user_id, activity_id),
    CONSTRAINT fk_notice_reads_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notice_reads_activity
        FOREIGN KEY (activity_id) REFERENCES activities(id)
        ON DELETE CASCADE
);
