#!/usr/bin/env bash
# Setup script: starts backend dependencies and loads the database.
# Runs Docker (PostgreSQL), migrations, and seeds the database.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "=========================================="
echo "  Wedding Contracts Backend - Setup"
echo "  Starting backend and loading database"
echo "=========================================="

# Ensure Docker is on PATH (common locations on macOS)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Choose docker compose command
DOCKER_COMPOSE=""
if docker compose version &>/dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif [ -x "/usr/local/bin/docker" ] && /usr/local/bin/docker compose version &>/dev/null; then
  DOCKER_COMPOSE="/usr/local/bin/docker compose"
elif [ -x "/opt/homebrew/bin/docker" ] && /opt/homebrew/bin/docker compose version &>/dev/null; then
  DOCKER_COMPOSE="/opt/homebrew/bin/docker compose"
fi

USE_DOCKER="yes"
if [ -z "$DOCKER_COMPOSE" ]; then
  USE_DOCKER="no"
  echo ""
  echo "Docker not found – using Homebrew for PostgreSQL..."
  if command -v brew &>/dev/null; then
    # If PostgreSQL not in brew services, try to install then start
    if ! brew services list 2>/dev/null | grep -q postgresql; then
      if ! brew list postgresql@15 &>/dev/null && ! brew list postgresql@14 &>/dev/null && ! brew list postgresql &>/dev/null; then
        echo "      Installing PostgreSQL (brew install postgresql@15)..."
        brew install postgresql@15
      fi
      echo "      Starting PostgreSQL..."
      brew services start postgresql@15 2>/dev/null || \
      brew services start postgresql@14 2>/dev/null || \
      brew services start postgresql 2>/dev/null || true
    else
      brew services start postgresql@15 2>/dev/null || \
      brew services start postgresql@14 2>/dev/null || \
      brew services start postgresql 2>/dev/null || true
      echo "      Started PostgreSQL (brew services)."
    fi
    if command -v createdb &>/dev/null; then
      createdb wedding_contracts 2>/dev/null || true
    else
      # Homebrew PostgreSQL: createdb may be in the versioned bin path
      if [ -x "/opt/homebrew/opt/postgresql@15/bin/createdb" ]; then
        /opt/homebrew/opt/postgresql@15/bin/createdb wedding_contracts 2>/dev/null || true
      elif [ -x "/opt/homebrew/opt/postgresql@14/bin/createdb" ]; then
        /opt/homebrew/opt/postgresql@14/bin/createdb wedding_contracts 2>/dev/null || true
      fi
    fi
    echo "      Waiting for PostgreSQL (up to 20 seconds)..."
    for i in $(seq 1 20); do
      if (node -e "
        const net = require('net');
        const s = net.createConnection(5432, '127.0.0.1', () => { s.destroy(); process.exit(0); });
        s.on('error', () => process.exit(1));
        s.setTimeout(2000, () => { s.destroy(); process.exit(1); });
      " 2>/dev/null); then
        echo "      PostgreSQL is ready."
        break
      fi
      if [ "$i" -eq 20 ]; then
        echo "      Warning: PostgreSQL did not respond in time. Migration may fail."
      fi
      sleep 1
    done
  else
    echo "      Homebrew not found. Ensure PostgreSQL is running and DB wedding_contracts exists."
  fi
  echo ""
fi

# 1. Start PostgreSQL (Docker only)
if [ "$USE_DOCKER" = "yes" ]; then
  echo ""
  echo "[1/5] Starting PostgreSQL (Docker)..."
  if $DOCKER_COMPOSE -f docker-compose.dev.yml ps 2>/dev/null | grep -q Up; then
    echo "      PostgreSQL is already running."
  else
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
    echo "      Waiting for database to be ready (up to 30 seconds)..."
    for i in $(seq 1 30); do
      if $DOCKER_COMPOSE -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -q 2>/dev/null; then
        echo "      Database is ready."
        break
      fi
      if [ "$i" -eq 30 ]; then
        echo "      Error: Database did not come up in time."
        exit 1
      fi
      sleep 1
    done
  fi
fi

# 2. .env
STEP_NUM=2
STEP_TOTAL=5
[ "$USE_DOCKER" = "no" ] && STEP_NUM=1 && STEP_TOTAL=4
echo ""
echo "[$STEP_NUM/$STEP_TOTAL] Checking .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "      Created .env from .env.example"
else
  echo "      .env exists"
fi
# Homebrew PostgreSQL uses the current OS user, not "postgres"
if [ "$USE_DOCKER" = "no" ]; then
  LOCAL_DB_URL="postgresql://localhost/wedding_contracts"
  if grep -q '^DATABASE_URL=' .env 2>/dev/null; then
    sed "s|^DATABASE_URL=.*|DATABASE_URL=$LOCAL_DB_URL|" .env > .env.tmp && mv .env.tmp .env
    echo "      Set DATABASE_URL for local PostgreSQL (current user)"
  else
    echo "DATABASE_URL=$LOCAL_DB_URL" >> .env
    echo "      Appended DATABASE_URL for local PostgreSQL"
  fi
fi

# 3. Install dependencies
STEP_NUM=$((STEP_NUM+1))
echo ""
echo "[$STEP_NUM/$STEP_TOTAL] Installing dependencies (npm install)..."
npm install

# 4. Build project
STEP_NUM=$((STEP_NUM+1))
echo ""
echo "[$STEP_NUM/$STEP_TOTAL] Building project (npm run build)..."
npm run build

# 5. Migrate and load DB
STEP_NUM=$((STEP_NUM+1))
echo ""
echo "[$STEP_NUM/$STEP_TOTAL] Running migrations and loading database..."

# Without Docker – check PostgreSQL is listening before migrate
if [ "$USE_DOCKER" = "no" ]; then
  if ! (node -e "
    const net = require('net');
    const s = net.createConnection(5432, '127.0.0.1', () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    s.setTimeout(2000, () => { s.destroy(); process.exit(1); });
  " 2>/dev/null); then
    echo "      Error: Cannot connect to PostgreSQL at localhost:5432"
    echo ""
    echo "=========================================="
    echo "  PostgreSQL is not running or not installed"
    echo "=========================================="
    echo ""
    echo "Install and start (Mac with Homebrew):"
    echo ""
    echo "  1. Install:  brew install postgresql@15"
    echo "  2. Start:    brew services start postgresql@15"
    echo "  3. Create:   createdb wedding_contracts"
    echo ""
    echo "After PostgreSQL is running, set in .env:"
    echo "  DATABASE_URL=postgresql://localhost/wedding_contracts"
    echo ""
    echo "Then run again:  npm run setup"
    echo ""
    exit 1
  fi
fi

if ! node dist/db/migrate.js; then
  echo ""
  echo "=========================================="
  echo "  Migration failed – PostgreSQL may not be ready"
  echo "=========================================="
  echo ""
  echo "Without Docker, ensure:"
  echo "  • PostgreSQL is running:  brew services start postgresql@15"
  echo "  • Database exists:        createdb wedding_contracts"
  echo "  • In .env:               DATABASE_URL=postgresql://localhost/wedding_contracts"
  echo ""
  echo "Then run again:  npm run setup"
  echo ""
  exit 1
fi

echo ""
echo "=========================================="
echo "  Setup completed successfully."
echo "  Database updated with tables and demo user."
echo "=========================================="
echo ""
echo "  Demo user:  daniel@example.com"
echo "  Password:   demo123"
echo ""
echo "  To start the server:  npm run dev"
echo ""
