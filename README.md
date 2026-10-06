# 🦅 HEKA: Sistema Multi-Agente Activo de Trading, Análisis y Supervisión
### Repositorio: [iartecnology/heka](https://github.com/iartecnology/heka)

> **Heka** es un ecosistema multi-agente autónomo (estilo **TradingGoose / OpenClaw**) diseñado para desplegarse mediante **Docker Compose en Dokploy (VPS)**. Utiliza **OpenCode CLI** con el modelo gratuito de alto rendimiento **`opencode/big-pickle`**, herramientas **MCP** (Alpaca y Yahoo Finance) y una interfaz de chat interactiva por **Telegram con botones táctiles**.

---

## 🚀 Guía de Despliegue en 3 Pasos con Dokploy

### Paso 1: Crear el repositorio en GitHub
1. En tu cuenta de GitHub [github.com/iartecnology](https://github.com/iartecnology), crea un repositorio nuevo llamado **`heka`**.
2. Sube este proyecto:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit heka autonomous trading squad"
   git branch -M main
   git remote add origin https://github.com/iartecnology/heka.git
   git push -u origin main
   ```

### Paso 2: Crear el servicio en tu VPS Dokploy
1. Abre tu panel de **Dokploy**.
2. Crea un nuevo proyecto: **`heka`**.
3. Selecciona **Create Service** ➔ **Docker Compose**.
4. Conecta tu repositorio de GitHub: `iartecnology/heka` (rama `main`).
5. Activa la casilla **Auto Deploy** (para que cada `git push` actualice el contenedor automáticamente).

### Paso 3: Configurar Variables de Entorno en Dokploy
En la pestaña **Environment** de tu servicio en Dokploy, agrega:

```env
TELEGRAM_BOT_TOKEN=tu_token_de_botfather
TELEGRAM_ALLOWED_USER_ID=tu_id_numerico_de_telegram
ALPACA_API_KEY=tu_alpaca_api_key
ALPACA_SECRET_KEY=tu_alpaca_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets
OPENCODE_MODEL=opencode/big-pickle
NODE_ENV=production
TZ=America/New_York
```

Presiona **Deploy** en Dokploy. ¡Listo! El sistema quedará operando 24/7 en tu VPS.

---

## 📱 Interfaz Táctil por Telegram

El bot te presenta un **teclado inferior permanente con botones táctiles**:

* 🔘 **`[💡 Ver Nuevas Propuestas]`**: Los agentes investigan el mercado y te proponen oportunidades asimétricas.
* 🔘 **`[📊 Ver Resumen Cartera]`**: Consulta inmediata de balance, equity y estado de tus 7 posiciones en verde/rojo.
* 🔘 **`[🛡️ Blindar Ganancias]`**: Verifica trailing stops para asegurar beneficios de activos que suben.
* 🔘 **`[🔍 Analizar Ticker]`**: Selector rápido de botones para investigar `MSFT`, `GOOGL`, `QQQ`, `SPY`, `GLD`, `TLT`.
* 🔘 **`[🛑 Pausa de Emergencia]`**: Kill-switch para cancelar órdenes vivas en Alpaca inmediatamente.

---

## 🧠 Arquitectura de Agentes y Modelos
* **Motor LLM:** OpenCode CLI ejecutando `opencode/big-pickle` (**Costo: $0 USD**, 200k tokens de contexto).
* **Fuentes MCP:** Alpaca Markets + Yahoo Finance (`yfinance-mcp-server`).
* **Horarios:** Sincronizado en tiempo real con la campana de Wall Street (`America/New_York`).
