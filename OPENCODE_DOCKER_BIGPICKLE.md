# 🥒 Integración Docker: OpenCode CLI + Modelos Gratuitos (Big-Pickle) + Dokploy
## Arquitectura 100% Cero Costo en LLMs

> [!IMPORTANT]
> **¡Confirmado y Verificado!** 
> Hemos comprobado que **`opencode/big-pickle`** (así como `ling-3.0-flash-fin-free`, `nemotron-3.5-lightning-free`, etc.) está disponible y responde perfectamente de forma **completamente gratuita** a través de OpenCode CLI.

---

## 1. ¿Cómo funciona OpenCode CLI dentro del Contenedor Docker?

El contenedor en Dokploy no solo ejecuta la aplicación Node.js de Telegram, sino que también contiene instalado **`opencode`**.

```mermaid
flowchart TD
    subgraph Contenedor Docker en VPS Dokploy
        Bot[Bot de Telegram con Botones / Node.js]
        
        Bot -->|Invoca subproceso o API local| OpenCodeCLI[OpenCode CLI v2.0+]
        
        subgraph Motor OpenCode con Modelos Gratuitos
            OpenCodeCLI --> BigPickle[Modelo: opencode/big-pickle (200k context, Razonamiento Profundo)]
            OpenCodeCLI --> FreeAlt[Modelos Auxiliares Gratuitos: ling-3.0-flash-fin, nemotron-free]
        end

        OpenCodeCLI --> MCPAlpaca[Alpaca MCP Server (Trading & Data)]
        OpenCodeCLI --> MCPYahoo[Yahoo Finance MCP (Fundamentales)]
    end

    Bot <-->|Alertas, Propuestas y Botones| Telegram([Tu Telegram en el Móvil])
```

---

## 2. Ventajas Clave de usar OpenCode CLI en el Docker

1. **Gasto de API = $0 USD:**
   * No necesitas pagar OpenAI, Anthropic ni saldo de OpenRouter.
   * `opencode/big-pickle` cuenta con **200,000 tokens de contexto**, razonamiento paso a paso y soporte para invocar herramientas y servidores MCP.
2. **Ejecución de Agentes con un Solo Comando:**
   * Desde Node.js podemos invocar al agente directamente:
     ```typescript
     import { exec } from 'child_process';

     // Ejecutar análisis de mercado usando big-pickle
     exec('opencode run --model opencode/big-pickle "Analiza MSFT y GOOGL con las herramientas MCP"', (err, stdout) => {
       // Envía el informe resultante a Telegram con botones interactivos
     });
     ```
3. **OpenCode Server Integrado (`opencode serve`):**
   * El contenedor puede iniciar el servidor API de OpenCode en segundo plano (`opencode serve --port 4096`), permitiendo que el bot de Telegram se comunique con él mediante llamadas HTTP rápidas y streaming de respuestas.

---

## 3. Especificación del Dockerfile con OpenCode CLI y uvx

```dockerfile
FROM node:20-bookworm-slim

# Instalar Python, curl y dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instalar uv y uvx para ejecutar servidores MCP en Python
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Instalar OpenCode CLI globalmente
RUN npm install -g opencode-ai

# Directorio de trabajo de la app
WORKDIR /app

# Copiar package.json y dependencias
COPY package*.json ./
RUN npm install

# Copiar configuraciones y código fuente
COPY opencode.json ./
COPY . .

# Compilar TypeScript si aplica
RUN npm run build 2>/dev/null || true

# Variables por defecto
ENV NODE_ENV=production
ENV TZ=America/New_York

CMD ["npm", "start"]
```

---

## 4. Configuración de `opencode.json` con `big-pickle` por defecto

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/big-pickle",
  "mcp": {
    "alpaca": {
      "type": "local",
      "command": ["uvx", "alpaca-mcp-server"],
      "enabled": true,
      "environment": {
        "ALPACA_API_KEY": "{env:ALPACA_API_KEY}",
        "ALPACA_SECRET_KEY": "{env:ALPACA_SECRET_KEY}",
        "ALPACA_BASE_URL": "https://paper-api.alpaca.markets"
      }
    },
    "yahoo-finance": {
      "type": "local",
      "command": ["uvx", "yfinance-mcp-server"],
      "enabled": true
    }
  },
  "agent": {
    "director": {
      "model": "opencode/big-pickle",
      "description": "Director de Inversión y Coordinador",
      "mode": "primary"
    },
    "market-analyst": {
      "model": "opencode/big-pickle",
      "description": "Analista de Mercados e Inteligencia Financiera",
      "mode": "subagent"
    },
    "risk-manager": {
      "model": "opencode/big-pickle",
      "description": "Oficial de Riesgo y Protección de Capital",
      "mode": "subagent"
    }
  }
}
```
