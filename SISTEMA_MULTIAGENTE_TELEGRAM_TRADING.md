# 🦅 Plataforma Multi-Agente Autónoma de Trading & Auditoría ("Alpaca Sentinel Pro")
## Inspiración: TradingGoose Studio + Telegram Interactivo + MCPs Financieros

> [!IMPORTANT]
> **Visión General:** Transformar el sistema de supervisión diaria en una plataforma contenerizada (Docker) multi-agente donde tú interactúas **directamente por Telegram (Chat)**. Los agentes investigan el mercado en tiempo real, auditan el riesgo y ejecutan en Alpaca. Para órdenes críticas, el bot te envía una tarjeta interactiva con botones **[✅ Aprobar]** y **[❌ Rechazar]** antes de disparar la orden al broker.

---

## 1. Arquitectura del Sistema: "Squad" Multi-Agente

Basado en las lecciones de **TradingGoose Studio** (arquitectura de agentes especializados con debate de mercado) y el protocolo **MCP**:

```mermaid
graph TD
    TelegramUser([Usuario vía Telegram Chat]) <--> BotGateway[Telegram Bot Gateway (Telegraf.js)]
    BotGateway <--> Orchestrator[Agente Director / Orquestador]

    subgraph Squad de Agentes Especializados
        Orchestrator <--> AgentResearch[Agente 1: Analista de Mercado & Macro]
        Orchestrator <--> AgentRisk[Agente 2: Oficial de Riesgo & Cumplimiento]
        Orchestrator <--> AgentBroker[Agente 3: Broker de Ejecución Alpaca]
    end

    subgraph Capa de Datos e Inteligencia MCP
        AgentResearch --> MCPYahoo[Yahoo Finance MCP (yfinance)]
        AgentResearch --> MCPAlpacaData[Alpaca Market Data & News MCP]
        AgentResearch --> SearchPerplefina[Búsqueda Financiera / RSS]
    end

    subgraph Ejecución y Auditoría Criptográfica
        AgentBroker --> MCPAlpacaTrade[Alpaca Trading MCP API]
        AgentRisk --> AuditEngine[(Motor de Logs JSONL & SQLite)]
    end
```

---

## 2. Los 4 Agentes Especializados y sus Roles

### 🧠 Agente 1: Director / Orquestador (`orchestrator.ts`)
* **Misión:** Coordina la rutina diaria (Pre-Market 8:45 AM, Sesión continua y Cierre 4:15 PM).
* **Manejo del Chat:** Responde a tus preguntas por Telegram en lenguaje natural ("*¿Cómo vamos hoy?*", "*¿Qué noticias hay de Microsoft?*", "*Analiza si compramos Tesla*").
* **Debate Interno:** Consulta al Analista de Mercado y somete cualquier propuesta al Oficial de Riesgo antes de molestarte o ejecutar.

### 🔍 Agente 2: Analista de Mercado & Macro (`market_analyst.ts`)
* **Conexiones:**
  * **Yahoo Finance MCP:** Extrae PER, recomendaciones de analistas de Wall Street, precios objetivos a 12 meses y fechas de presentación de resultados (*Earnings*).
  * **Alpaca Market Data MCP:** Velas en tiempo real, cotizaciones y noticias de última hora (`get_news`).
* **Función:** Genera una matriz de sentimiento (**Alcista / Neutro / Bajista**) con justificación fundamental y técnica.

### 🛡️ Agente 3: Oficial de Riesgo & Cumplimiento (`risk_manager.ts`)
* **Reglas Inmutables:**
  * **Reserva de Liquidez:** Mínimo **$50\% - 60\%$ en efectivo intocable** en todo momento.
  * **Límite de Exposición:** Máximo $10\%$ en una sola acción, $15\%$ en un ETF.
  * **Trailing Stops Dinámicos:** Si una acción sube $>2.5\%$, calcula el nuevo piso para asegurar beneficios. Si sube $>1.0\%$, mueve el Stop a Breakeven ($0$ riesgo).
  * **Poder de Veto:** Si el analista propone una compra pero el riesgo excede los límites, la orden es rechazada automáticamente con explicación técnica.

### ⚡ Agente 4: Broker de Ejecución Alpaca (`alpaca_broker.ts`)
* **Conexiones:** Alpaca Trading MCP (`get_account_info`, `get_all_positions`, `place_stock_order`, `replace_order_by_id`, `cancel_order_by_id`).
* **Ejecución Asistida:**
  * Ajustes de *Trailing Stop* y *Breakeven*: Se ejecutan automáticamente de forma silenciosa para proteger capital.
  * Nuevas compras o cierre anticipado: Envía solicitud a Telegram y **solo ejecuta si presionas [✅ Aprobar]**.

---

## 3. Experiencia por Chat (Telegram Bot Interactivo)

El bot no es solo un emisor pasivo de alertas; es un **asistente bidireccional**:

### Comandos y Consultas Disponibles:
* `/resumen` o "*¿cómo vamos?*": Devuelve el `Equity`, ganancia del día, efectivo disponible y tabla limpia de posiciones.
* `/analizar TICKER` (ej. `/analizar NVDA`): El Analista y el de Riesgo investigan en Yahoo Finance y Alpaca y te devuelven una ficha completa.
* `/reajustar`: Ejecuta la verificación de trailing stops y te muestra qué posiciones se protegieron.

### Tarjeta Interactiva de Confirmación de Órdenes:
Cuando el sistema detecta una oportunidad óptima, te envía un mensaje enriquecido con botones:

```text
🚨 PROPUESTA DE NUEVA ENTRADA (Alpaca Sentinel)
Activo: SPY (S&P 500)
Operación: COMPRA de 2 acciones a $775.20 USD
Asignación: $1,550.40 USD (1.5% de tu capital)
Efectivo restante en caja: 65.3% (SEGURO)
Stop-Loss inicial: $755.00 USD (-2.6%)
Take-Profit inicial: $810.00 USD (+4.5%)
Tesis: Rompimiento de resistencia con flujo comprador y soporte macro.

¿Autorizas la ejecución en Alpaca Paper Trading?
[ ✅ Aprobar Orden ]    [ ❌ Rechazar ]
```

* Al presionar **[✅ Aprobar Orden]**, el botón cambia en vivo a *"Orden #1029 Ejecutada a $775.20 ✅"* y el Agente Broker coloca la orden en Alpaca inmediatamente.

---

## 4. Mejores Prácticas de Auditoría y Seguridad de Logs

Siguiendo estándares institucionales (estilo SEC Rule 17a-4 / MiFID II):

1. **Audit Trail Inmutable (`audit.jsonl` + SQLite):**
   * Cada evento tiene: `timestamp_utc`, `event_type` (`ANALYSIS_RUN`, `RISK_CHECK`, `USER_TELEGRAM_DECISION`, `BROKER_EXECUTION`), `actor` (cuál agente tomó la decisión), `payload` y `reasoning`.
   * Si tú aprobaste una orden por Telegram, se guarda el `telegram_user_id` y el hash de la propuesta.
2. **Seguridad Absoluta de Credenciales:**
   * Las llaves de Alpaca (`ALPACA_API_KEY`, `ALPACA_SECRET_KEY`) y el `TELEGRAM_BOT_TOKEN` van en un archivo `.env` que **nunca** se sube a repositorios Git.
   * **Filtro de Usuario en Telegram:** El bot únicamente responde y acepta órdenes de tu **ID numérico de Telegram** (`TELEGRAM_ALLOWED_USER_ID`); cualquier otra persona que intente interactuar recibe un acceso denegado.
3. **Mecanismo de Desconexión de Emergencia (*Kill-Switch*):**
   * El comando `/emergencia` o `/pausar` congela todas las operaciones automáticas y cancela órdenes pendientes al instante.

---

## 5. Estructura del Proyecto Dockerizado

```text
alpaca-sentinel-platform/
├── docker-compose.yml             # Despliegue de 1 comando
├── Dockerfile                     # Node.js 20 LTS + Python 3.11 + uvx (para MCPs)
├── .env                           # Variables privadas (Alpaca + Telegram + Modelos)
├── .env.example                   # Plantilla pública
├── package.json                   # Dependencias (Telegraf, @modelcontextprotocol/sdk)
├── config/
│   └── mcp_servers.json           # Servidores MCP: Alpaca + Yahoo Finance
├── data/
│   ├── audit.jsonl                # Historial de auditoría
│   └── sentinel.db                # Base de datos SQLite ligera
└── src/
    ├── index.ts                   # Punto de entrada
    ├── bot/
    │   ├── telegram.ts            # Bot de Telegram con inline keyboards
    │   └── handlers.ts            # Comandos: /resumen, /analizar, /reajustar
    ├── agents/
    │   ├── orchestrator.ts        # Coordinador del equipo
    │   ├── market_analyst.ts      # Conector Yahoo Finance & Alpaca News
    │   ├── risk_manager.ts        # Reglas de preservación de capital
    │   └── alpaca_broker.ts       # Ejecución en Alpaca
    ├── scheduler/
    │   └── cron_jobs.ts           # Horarios de Nueva York (8:45 AM, 4:15 PM)
    └── utils/
        └── logger.ts              # Logger estructurado de auditoría
```

---

## 6. Configuración de Servicios MCP (`config/mcp_servers.json`)

```json
{
  "mcpServers": {
    "alpaca": {
      "command": "uvx",
      "args": ["alpaca-mcp-server"],
      "env": {
        "ALPACA_API_KEY": "${ALPACA_API_KEY}",
        "ALPACA_SECRET_KEY": "${ALPACA_SECRET_KEY}",
        "ALPACA_BASE_URL": "https://paper-api.alpaca.markets"
      }
    },
    "yahoo-finance": {
      "command": "uvx",
      "args": ["yfinance-mcp-server"]
    }
  }
}
```
