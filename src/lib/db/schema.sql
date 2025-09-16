-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    summoner_name VARCHAR(255),
    region VARCHAR(10),
    summoner_id VARCHAR(255),
    puuid VARCHAR(255),
    region VARCHAR(10),
    summoner_id VARCHAR(255),
    puuid VARCHAR(255),
    zodiac_sign VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Se pueden añadir más tablas aquí, como las de gamificación.
