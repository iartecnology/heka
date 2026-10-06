import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { AlpacaClient } from '../agents/alpaca_client';
import { OpenCodeRunner } from '../agents/opencode_runner';

export function setupActiveScheduler(
  bot: Telegraf,
  alpaca: AlpacaClient,
  opencode: OpenCodeRunner,
  chatId: string
) {
  // 1. Pre-Market Briefing (8:45 AM ET, Lunes a Viernes)
  cron.schedule('45 8 * * 1-5', async () => {
    try {
      const prompt = 'Genera un Pre-Market Briefing conciso para Telegram con el sentimiento de Wall Street hoy y catalizadores clave para MSFT, GOOGL, QQQ, SPY, GLD, TLT.';
      const briefing = await opencode.runTask(prompt);
      await bot.telegram.sendMessage(
        chatId,
        `🌅 *HEKA: PRE-MARKET BRIEFING*\n\n${briefing}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Error en Pre-Market cron:', e);
    }
  }, { timezone: 'America/New_York' });

  // 2. Campana de Cierre & Auditoría Diaria (4:15 PM ET, Lunes a Viernes)
  cron.schedule('15 16 * * 1-5', async () => {
    try {
      const account = await alpaca.getAccount();
      await bot.telegram.sendMessage(
        chatId,
        `🔔 *HEKA: CIERRE DE MERCADO*\n\n` +
        `• *Equity Final:* $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n` +
        `• *Efectivo en Caja:* $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n` +
        `• Todas las posiciones siguen protegidas por el Oficial de Riesgo.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Error en Cierre cron:', e);
    }
  }, { timezone: 'America/New_York' });

  // 3. Heartbeat Activo (Cada 15 minutos en horario de mercado: 9:30 AM a 4:00 PM ET)
  cron.schedule('*/15 9-16 * * 1-5', async () => {
    try {
      const clock = await alpaca.getClock();
      if (!clock.is_open) return;

      // Vigilancia silenciosa de riesgo
      const positions = await alpaca.getPositions();
      for (const p of positions) {
        const plpc = parseFloat(p.unrealized_plpc) * 100;
        // Si una posición sube más de +3%, avisar y sugerir trailing stop
        if (plpc > 3.0) {
          await bot.telegram.sendMessage(
            chatId,
            `🚀 *HEKA ALERTA DE RENDIMIENTO:* *${p.symbol}* ha ganado *+${plpc.toFixed(2)}%*.\n` +
            `El Oficial de Riesgo recomienda subir el Trailing Stop para blindar la ganancia.`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (e) {
      console.error('Error en Heartbeat cron:', e);
    }
  }, { timezone: 'America/New_York' });
}
