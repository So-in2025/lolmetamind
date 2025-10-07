-- src/lib/db/schema.sql (SIMPLIFICADO)
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y datos de League
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(255),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,

    -- Data para Live Coaching / Perfil
    live_game_data JSONB,
    zodiac_sign VARCHAR(50), 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Onboarding: mantener el campo como marcador simple si es necesario para la lógica de la app de escritorio
    has_completed_onboarding BOOLEAN DEFAULT FALSE
);

-- Tabla para almacenar los desafíos activos de los usuarios (simplificada)
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily' o 'weekly'
    metric VARCHAR(100) NOT NULL,        -- ej: 'kills', 'visionScore', 'csPerMinute'
    goal NUMERIC(10, 2) NOT NULL,        -- Usar NUMERIC para valores decimales como CS/min
    progress NUMERIC(10, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);