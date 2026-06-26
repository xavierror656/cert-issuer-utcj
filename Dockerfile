# Stage 1: Build Preact App
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime Environment
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
COPY ethereum_requirements.txt ./ethereum_requirements.txt
COPY requirements-app.txt ./requirements-app.txt
RUN pip install --no-cache-dir -r requirements-app.txt

COPY cert_issuer ./cert_issuer
COPY src ./src
COPY assets ./assets
COPY docs ./docs
COPY examples ./examples
COPY scripts ./scripts
COPY .env.example ./.env.example

# Copy Preact dist folder from frontend-builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN chmod +x /app/scripts/start-dev.sh /app/scripts/generate-samples.sh

EXPOSE 8000

CMD ["uvicorn", "utcj_microcredentials.app:app", "--host", "0.0.0.0", "--port", "8000"]
