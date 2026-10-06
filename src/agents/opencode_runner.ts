import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class OpenCodeRunner {
  private reasoningModel: string;
  private fallbackModel: string;

  constructor() {
    // nemotron-3.5-lightning-free responde en segundos con herramientas de MCP integradas
    this.reasoningModel = process.env.OPENCODE_MODEL || 'opencode/nemotron-3.5-lightning-free';
    this.fallbackModel = 'opencode/mimo-v2.6-flash-free';
  }

  /**
   * Ejecuta una tarea usando el modelo de alta velocidad nemotron-3.5-lightning.
   */
  async runDeepTask(prompt: string): Promise<string> {
    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --model ${this.reasoningModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 75000 });
      return stdout.trim();
    } catch (error: any) {
      console.warn(`Fallback tras error en modelo principal: ${error.message}`);
      return this.runFastTask(prompt);
    }
  }

  /**
   * Fallback a modelo ultraligero
   */
  async runFastTask(prompt: string): Promise<string> {
    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --model ${this.fallbackModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 45000 });
      return stdout.trim();
    } catch (error: any) {
      console.error('Error al ejecutar OpenCode fallback:', error);
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
    const prompt = `Actúa como el Analista Financiero de Heka. Investiga a fondo el activo ${symbol}. Analiza su valoración fundamental actual, múltiplos clave (PER, deuda), catalizadores de mercado y niveles de soporte/resistencia. Concluye de forma clara: Alcista, Neutro o Bajista, con niveles de entrada y Stop-Loss recomendado.`;
    return this.runDeepTask(prompt);
  }

  /**
   * Búsqueda de oportunidades asimétricas con el squad.
   */
  async scanForOpportunities(currentHoldings: string[]): Promise<string> {
    const prompt = `Actúa como el Director de Inversiones y el Oficial de Riesgo de Heka. Revisa el mercado actual. Actualmente tenemos en cartera: ${currentHoldings.join(', ')}. Busca una oportunidad asimétrica de compra para empresas sólidas del S&P 500 o ETFs líderes. Justifica la tesis, define el Stop-Loss estricto (-3%) y Take-Profit (+6% a +12%) y porcentaje de capital sugerido.`;
    return this.runDeepTask(prompt);
  }
}
