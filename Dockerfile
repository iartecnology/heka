FROM node:20-bookworm-slim

# Instalar dependencias esenciales de sistema, Python y herramientas de red
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar uv y uvx para ejecutar servidores MCP en Python de forma ultrarrápida
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Instalar OpenCode CLI globalmente
RUN npm install -g opencode-ai

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar configuración de OpenCode y código fuente
COPY opencode.json ./
COPY tsconfig.json ./
COPY src ./src

# Compilar TypeScript a JavaScript
RUN npm run build

# Crear directorios para persistencia de datos y auditoría
RUN mkdir -p /app/data

# Configuración de entorno y zona horaria (Wall Street)
ENV NODE_ENV=production
ENV TZ=America/New_York

# Iniciar la aplicación
CMD ["npm", "start"]
