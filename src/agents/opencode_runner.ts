import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class OpenCodeRunner {
  private model: string;

  constructor() {
    this.model = process.env.OPENCODE_MODEL || 'opencode/big-pickle';
  }

  /**
   * Ejecuta una consulta o tarea autónoma a través de OpenCode CLI usando big-pickle de forma gratuita.
   */
  async runTask(prompt: string): Promise<string> {
    try {
      const sanitizedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run --model ${this.model} "${sanitizedPrompt}"`;
      const { stdout } = await execPromise(command, { timeout: 120000 });
      return stdout.trim();
    } catch (error: any) {
      console.error('Error al ejecutar OpenCode:', error);
      return `Error al invocar OpenCode (${this.model}): ${error.message}`;
    }
  }

  /**
   * Agente Analista investiga un ticker usando las herramientas y ratios de mercado.
   */
  async analyzeTicker(symbol: string): Promise<string> {
    const prompt = `Actúa como el Analista Financiero de Heka. Investiga el activo ${symbol}. Analiza su valoración fundamental actual, ratios clave (PER), sentimiento macroeconómico y niveles de soporte/resistencia. Devuelve un informe claro y conciso para Telegram con una conclusión: Alcista, Neutro o Bajista.`;
    return this.runTask(prompt);
  }

  /**
   * Búsqueda autónoma de oportunidades en el mercado.
   */
  async scanForOpportunities(currentHoldings: string[]): Promise<string> {
    const prompt = `Actúa como el escuadrón de agentes de Heka. Revisa el mercado actual. Actualmente tenemos en cartera: ${currentHoldings.join(', ')}. ¿Existe alguna oportunidad asimétrica de compra para empresas sólidas del S&P 500 o ETFs? Si encuentras una, genera la tesis con Stop-Loss recomendado y porcentaje sugerido.`;
    return this.runTask(prompt);
  }
}
