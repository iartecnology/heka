# 🚀 Plan de Despliegue e Infraestructura: GitHub + VPS Dokploy + Telegram
## "Alpaca Sentinel Pro" (Sistema Multi-Agente en Producción)

> [!IMPORTANT]
> **Arquitectura de CI/CD Simplificada:** Desarrollas y programas aquí con **OpenCode**, haces `git push` a tu repositorio en **GitHub**, y tu **VPS con Dokploy** detecta el cambio, reconstruye el contenedor Docker automáticamente y mantiene vivo el sistema 24/7 con el bot de Telegram y los agentes financieros activos.

---

## 1. Diagrama de la Infraestructura y Flujo CI/CD

```mermaid
flowchart LR
    subgraph 1. Desarrollo Local
        Dev[Tu Equipo Mac / OpenCode CLI] -->|git push| GH[(Repositorio GitHub)]
    end

    subgraph 2. VPS de Producción (Dokploy)
        GH -->|Webhook / Auto-Deploy| Dokploy[Dokploy Manager en tu VPS]
        Dokploy -->|Builds & Runs| AppContainer[Contenedor Docker: alpaca_sentinel]
        
        subgraph Dentro del Contenedor
            AppContainer --> NodeApp[Node.js / Telegraf Bot]
            AppContainer --> AgentSquad[Squad Multi-Agente & MCPs]
            AppContainer --> CronNYC[Cron Horario Wall Street]
        end
    end

    subgraph 3. Canales Externos y Broker
        NodeApp <-->|Mensajes y Botones| Telegram([Tu Telegram en el Móvil])
        AgentSquad <-->|Trading API & Data| Alpaca([Alpaca Paper / Live API])
        AgentSquad <-->|Datos Fundamentales| Yahoo[Yahoo Finance API / MCP]
    end
```

---

## 2. Cómo se Configura en Dokploy (Paso a Paso)

En el panel de tu **VPS Dokploy**:

1. **Crear Proyecto / Servicio:**
   * Entras a tu Dokploy Dashboard ➔ **Create Project** ➔ Nombre: `alpaca-sentinel`.
   * Haces clic en **Create Service** y seleccionas el tipo: **Docker Compose** (o **Application**).
2. **Conectar tu Repositorio de GitHub:**
   * Proveedor: **GitHub**.
   * Repositorio: `tu-usuario/alpaca-sentinel`.
   * Branch: `main`.
   * Ruta del archivo compose: `./docker-compose.yml`.
3. **Activar Auto-Deploy (CI/CD Automático):**
   * Marcas la casilla **Auto Deploy** (Dokploy genera un Webhook en tu GitHub).
   * Cada vez que hagas `git push origin main`, Dokploy descargará el código nuevo y reiniciará el contenedor sin que tengas que entrar por SSH.
4. **Configurar Variables de Entorno Seguras en Dokploy:**
   En la pestaña **Environment Variables** de Dokploy agregas tus secretos (así **nunca** se suben a GitHub):
   ```env
   # Telegram
   TELEGRAM_BOT_TOKEN=tu_token_de_botfather
   TELEGRAM_ALLOWED_USER_ID=tu_id_numerico_de_telegram

   # Alpaca API
   ALPACA_API_KEY=tu_alpaca_api_key
   ALPACA_SECRET_KEY=tu_alpaca_secret_key
   ALPACA_BASE_URL=https://paper-api.alpaca.markets

   # Configuración de Entorno
   NODE_ENV=production
   TZ=America/New_York
   ```
5. **Persistencia de Volúmenes (Para no perder auditorías ni estados):**
   * En la sección **Volumes** de Dokploy se monta:
     * Host: `/etc/dokploy/volumes/alpaca-data` ➔ Contenedor: `/app/data`

---

## 3. Archivos Clave del Repositorio Git

El repositorio contendrá una estructura limpia lista para que Dokploy la compile sin errores:

```text
alpaca-sentinel/
├── .gitignore                   # Ignora .env, node_modules y /data
├── Dockerfile                   # Node.js 20 LTS + Python/uvx para MCPs
├── docker-compose.yml           # Especificación de servicio para Dokploy
├── package.json                 # Dependencias (Telegraf, typescript, etc.)
├── tsconfig.json                # Configuración TypeScript
├── opencode.json                # Configuración y agentes para OpenCode CLI
├── config/
│   └── mcp_servers.json         # Servidores MCP (Yahoo Finance + Alpaca)
├── src/
│   ├── index.ts                 # Inicializador del sistema
│   ├── bot/
│   │   ├── telegram.ts          # Bot interactivo con Telegraf (botones táctiles)
│   │   └── keyboards.ts         # Teclado fijo y menús interactivos
│   ├── agents/
│   │   ├── orchestrator.ts      # Director de inversiones
│   │   ├── market_analyst.ts    # Analista financiero (Yahoo Finance + Alpaca)
│   │   ├── risk_manager.ts      # Motor de riesgo y trailing stops
│   │   └── alpaca_broker.ts     # Ejecutor en Alpaca
│   ├── scheduler/
│   │   └── cron_jobs.ts         # Tareas programadas de Wall Street
│   └── utils/
│       └── audit.ts             # Registro inmutable de operaciones
└── DOKPLOY_DEPLOY_GUIDE.md      # Guía rápida de configuración en el VPS
```

---

## 4. Ventajas de esta Infraestructura

* **Coste $0 adicional:** Ya tienes tu VPS con Dokploy; no necesitas pagar servicios adicionales como Railway, Render ni servidores serverless.
* **Disponibilidad 24/7:** El bot está siempre despierto en tu VPS; puedes salir de viaje, apagar tu portátil y los agentes seguirán supervisando y enviándote alertas a Telegram.
* **Seguridad Absoluta:** Las API keys de Alpaca y Telegram viven cifradas en la base de datos de Dokploy en tu VPS; en GitHub el código es 100% público o privado pero sin secretos expuestos.
* **Control con 1 Dedo:** Todo el ciclo de vida del negocio lo operas desde tu móvil por chat.
