-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y Paddle
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(255), -- <--- ¡COLUMNA AÑADIDA!
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,

    -- Campos para monetización con Paddle
    plan_status VARCHAR(50) DEFAULT 'free',
    paddle_customer_id VARCHAR(255) UNIQUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Campos para Hotmart y suscripción (corregidos para consistencia)
    subscription_tier VARCHAR(50) DEFAULT 'FREE',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    license_key VARCHAR(255) UNIQUE,
    hotmart_subscription_id VARCHAR(255)
);

-- Tabla para almacenar los desafíos activos de los usuarios
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily' o 'weekly'
    metric VARCHAR(100) NOT NULL,        -- ej: 'kills', 'visionScore', 'csPerMinute'
    goal INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);