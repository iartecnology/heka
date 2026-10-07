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
    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --pure --model ${this.reasoningModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 120000 });
      return stdout.trim();
    } catch (error: any) {
      console.warn(`Fallback tras error en modelo principal: ${error.message}`);
      return this.runFastTask(prompt);
    }
  }

  /**
   * Fallback
   */
  async runFastTask(prompt: string): Promise<string> {
    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --pure --model ${this.fallbackModel} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 60000 });
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
    const prompt = `Actúa como el Analista Financiero de Heka. Investiga el activo ${symbol} de manera concisa y accionable. Analiza su precio actual, soporte, resistencia, catalizadores y valoración. Concluye de forma clara: Alcista, Neutro o Bajista, junto a un Stop-Loss sugerido.`;
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
