import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class OpenCodeRunner {
  private reasoningModel: string;
  private fallbackModel: string;

  constructor() {
    // mimo-v2.6-flash-free responde en menos de 10-15s conectando a MCPs sin cuelgues
    this.reasoningModel = process.env.OPENCODE_MODEL || 'opencode/mimo-v2.6-flash-free';
    this.fallbackModel = 'opencode/nemotron-3.5-lightning-free';
  }

  /**
   * Ejecuta una tarea usando el modelo ultrarrápido y compatible con MCP.
   */
  async runDeepTask(prompt: string): Promise<string> {
    const startTime = Date.now();
    console.log(`\n🤖 [OPENCODE] Invocando modelo ${this.reasoningModel}...`);
    console.log(`📝 [PROMPT] ${prompt.slice(0, 150)}...`);

    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --pure --model ${this.reasoningModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 120000 });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [OPENCODE] Respuesta recibida en ${duration}s (${stdout.length} caracteres)`);
      return stdout.trim();
    } catch (error: any) {
      console.warn(`⚠️ [OPENCODE] Fallback tras error en ${this.reasoningModel}: ${error.message}`);
      return this.runFastTask(prompt);
    }
  }

  /**
   * Fallback
   */
  async runFastTask(prompt: string): Promise<string> {
    const startTime = Date.now();
    console.log(`🔄 [OPENCODE FALLBACK] Invocando modelo ${this.fallbackModel}...`);

    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --pure --model ${this.fallbackModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 60000 });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [OPENCODE FALLBACK] Respuesta recibida en ${duration}s`);
      return stdout.trim();
    } catch (error: any) {
      console.error(`❌ [OPENCODE ERROR] ${error.message}`);
      return `Error al invocar OpenCode: ${error.message}`;
    }
  }

  /**
   * Tarea general por defecto (intenta razonamiento profundo).
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

