-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    zodiac_sign VARCHAR(50),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255),
    summoner_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Se pueden añadir más tablas aquí, como las de gamificación.
