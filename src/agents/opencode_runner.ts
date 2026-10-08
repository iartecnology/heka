import { execFile } from 'child_process';
import util from 'util';
import http from 'http';

const execFilePromise = util.promisify(execFile);

export class OpenCodeRunner {
  private reasoningModel: string;
  private fallbackModel: string;
  private serverPort: number = 4096;
  private serverStarted: boolean = false;

  constructor() {
    this.reasoningModel = process.env.OPENCODE_MODEL || 'opencode/big-pickle';
    this.fallbackModel = 'opencode/mimo-v2.6-flash-free';
    this.ensureServer();
  }

  /**
   * Garantiza que el servidor de OpenCode esté corriendo en segundo plano para respuestas instantáneas
   */
  private ensureServer() {
    if (this.serverStarted) return;
    try {
      const { spawn } = require('child_process');
      const srv = spawn('opencode', ['serve', '--port', String(this.serverPort)], {
        detached: true,
        stdio: 'ignore'
      });
      srv.unref();
      this.serverStarted = true;
      console.log(`🚀 [OPENCODE DAEMON] Servidor headless iniciado en puerto ${this.serverPort}`);
    } catch (e: any) {
      console.warn(`⚠️ [OPENCODE DAEMON] No se pudo arrancar el servidor daemon: ${e.message}`);
    }
  }

  /**
   * Envía un mensaje vía HTTP API rápida a la sesión de OpenCode
   */
  private async queryServer(modelId: string, prompt: string, timeoutMs: number = 180000): Promise<string> {
    const rawModel = modelId.replace('opencode/', '');
    
    // Asegurar que el daemon responde; si no, reiniciar spawn
    try {
      await fetch(`http://127.0.0.1:${this.serverPort}/path`, { signal: AbortSignal.timeout(3000) });
    } catch {
      this.serverStarted = false;
      this.ensureServer();
      await new Promise(r => setTimeout(r, 2000));
    }

    // 1. Crear sesión
    const createSessionRes = await fetch(`http://127.0.0.1:${this.serverPort}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!createSessionRes.ok) {
      throw new Error(`Fallo al crear sesión HTTP: ${createSessionRes.statusText}`);
    }
    const sessionData: any = await createSessionRes.json();
    const sessionId = sessionData.id;

    // 2. Enviar prompt
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const msgRes = await fetch(`http://127.0.0.1:${this.serverPort}/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: { providerID: 'opencode', modelID: rawModel },
          parts: [{ type: 'text', text: prompt }]
        })
      });

      if (!msgRes.ok) {
        throw new Error(`Error en servidor OpenCode: ${msgRes.statusText}`);
      }

      const msgData: any = await msgRes.json();
      const textParts = (msgData.parts || [])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('\n');

      return textParts.trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Ejecuta una tarea con modelo especificado o por defecto, usando la API rápida de OpenCode
   */
  async runTaskWithModel(model: string, prompt: string): Promise<string> {
    const startTime = Date.now();
    console.log(`\n🤖 [OPENCODE] Invocando modelo ${model} via daemon...`);
    console.log(`📝 [PROMPT] ${prompt.slice(0, 100)}...`);

    try {
      const response = await this.queryServer(model, prompt, 180000);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [OPENCODE] Respuesta recibida en ${duration}s (${response.length} chars)`);
      return response;
    } catch (err: any) {
      console.warn(`⚠️ [OPENCODE] Error vía daemon HTTP (${err.message}). Intentando CLI directo...`);
      try {
        const { stdout } = await execFilePromise('opencode', ['run', '--pure', '--model', model, prompt], {
          timeout: 120000
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ [OPENCODE CLI] Respuesta recibida en ${duration}s`);
        return stdout.trim();
      } catch (cliErr: any) {
        console.error(`❌ [OPENCODE CLI ERROR] ${cliErr.message}`);
        throw new Error(`El modelo tardó más de lo esperado o el servicio no respondió a tiempo. Intenta de nuevo.`);
      }
    }
  }

  /**
   * Ejecuta una tarea con razonamiento profundo
   */
  async runDeepTask(prompt: string): Promise<string> {
    return this.runTaskWithModel(this.reasoningModel, prompt);
  }

  /**
   * Fallback ultrarrápido con mimo-v2.6-flash-free
   */
  async runFastTask(prompt: string): Promise<string> {
    return this.runTaskWithModel(this.fallbackModel, prompt);
  }

  /**
   * Tarea general por defecto
   */
  async runTask(prompt: string): Promise<string> {
    return this.runDeepTask(prompt);
  }

  /**
   * Agente Analista investiga a fondo un ticker.
   */
  async analyzeTicker(symbol: string): Promise<string> {
    const prompt = `Actúa como el Analista Financiero de Heka. Investiga el activo ${symbol} de manera concisa y accionable. Analiza su precio actual, soporte, resistencia, catalizadores y valoración. Concluye de forma clara: Alcista, Neutro o Bajista, junto a un Stop-Loss sugerido.`;
    return this.runDeepTask(prompt);
  }

  /**
   * Búsqueda de oportunidades asimétricas con el squad con plantilla estructurada.
   */
  async scanForOpportunities(currentHoldings: string[]): Promise<string> {
    const prompt = `Actúa como el Escuadrón de Inversiones Heka (Director, Analista y Riesgo). ` +
      `Actualmente en cartera tenemos: ${currentHoldings.length > 0 ? currentHoldings.join(', ') : 'Ninguno (100% liquidez)'}. ` +
      `Selecciona la mejor oportunidad de compra hoy (S&P 500, ETF líder o Big Tech sólida). ` +
      `Debes formatear la sugerencia SIGUIENDO ESTRICTAMENTE ESTE MODELO EXACTO, limpio y sin caracteres de LaTeX tipo signos de dólar escapados:\n\n` +
      `⭐ **[Ticker] — [Nombre de Empresa] ([Atributo Clave])**\n` +
      `🏢 **Sector:** [Sector / Industria]\n` +
      `💵 **Precio actual:** $[precio actual] USD\n` +
      `💡 **¿Por qué comprar?:** [Explicación clara y contundente en 2 frases de por qué es una excelente oportunidad]\n\n` +
      `🎯 **Plan de Operación:**\n` +
      `📥 **Entrada Límite:** $[precio] USD ([N] acciones ≈ $[Monto Total] USD)\n` +
      `🟢 **Take-Profit (Ganancia):** $[precio] USD (+[%]% → +$[ganancia estimada] USD)\n` +
      `🛑 **Stop-Loss (Protección):** $[precio] USD (-[%]% → -$[riesgo estimado] USD)\n` +
      `⚖️ **Ratio Beneficio / Riesgo:** 1 : [Ratio calculado, ej. 2.3] 🚀\n\n` +
      `Calcula las acciones y montos asumiendo un tamaño prudente de posición de ~$3,000 - $5,000 USD. No agregues texto introductorio innecesario antes del título.`;
    return this.runDeepTask(prompt);
  }
}

