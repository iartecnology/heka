import { Telegraf, Context } from 'telegraf';
import { mainKeyboard, tickerSelectorInline, createProposalKeyboard } from './keyboards';
import { AlpacaClient } from '../agents/alpaca_client';
import { OpenCodeRunner } from '../agents/opencode_runner';

export function setupTelegramBot(
  bot: Telegraf<Context>,
  alpaca: AlpacaClient,
  opencode: OpenCodeRunner,
  allowedUserId: string
) {
  // Filtro de seguridad (Solo responde a tu ID de Telegram)
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id?.toString();
    if (fromId !== allowedUserId) {
      console.warn(`[Seguridad] Intento no autorizado desde ID: ${fromId}`);
      await ctx.reply('⛔ Acceso restringido. Este sistema es privado.');
      return;
    }
    return next();
  });

  // Comando /start o saludo inicial
  bot.start(async (ctx) => {
    await ctx.reply(
      '🦅 *Bienvenido a Heka - Sentinel Pro*\n\n' +
      'Tus agentes de inversión están activos y vigilando el mercado.\n' +
      'Utiliza la barra táctil inferior para interactuar con el sistema.',
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
  });

  // Botón táctil: 📊 Ver Resumen Cartera
  bot.hears('📊 Ver Resumen Cartera', async (ctx) => {
    try {
      await ctx.reply('⏳ *Heka:* Consultando balance y posiciones en Alpaca...', { parse_mode: 'Markdown' });
      const account = await alpaca.getAccount();
      const positions = await alpaca.getPositions();

      let msg = `📊 *ESTADO CONSOLIDADO DE HEKA*\n\n`;
      msg += `💰 *Equity Total:* $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `💵 *Efectivo en Caja:* $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `📦 *Posiciones Abiertas:* ${positions.length}\n\n`;

      if (positions.length > 0) {
        msg += `*Detalle de Activos:*\n`;
        positions.forEach((p) => {
          const pl = parseFloat(p.unrealized_pl);
          const icon = pl >= 0 ? '🟢' : '🔴';
          const plFormatted = pl >= 0 ? `+$${pl.toFixed(2)}` : `-$${Math.abs(pl).toFixed(2)}`;
          msg += `${icon} *${p.symbol}:* ${p.qty} acc @ $${parseFloat(p.current_price).toFixed(2)} | P&L: ${plFormatted}\n`;
        });
      }

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (err: any) {
      await ctx.reply(`❌ Error al consultar Alpaca: ${err.message}`);
    }
  });

  // Botón táctil: 🔍 Analizar Ticker
  bot.hears('🔍 Analizar Ticker', async (ctx) => {
    await ctx.reply(
      '¿Qué activo deseas que el Agente Analista investigue?',
      tickerSelectorInline
    );
  });

  // Callbacks de los botones del selector
  bot.action(/analyze_(.+)/, async (ctx) => {
    const symbol = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(`🧠 *Analista de Heka (OpenCode / Big-Pickle):* Investigando fundamentales y noticias de *${symbol}*...`, { parse_mode: 'Markdown' });
    
    const analysis = await opencode.analyzeTicker(symbol);
    await ctx.reply(analysis, { parse_mode: 'Markdown' });
  });

  // Botón táctil: 💡 Ver Nuevas Propuestas
  bot.hears('💡 Ver Nuevas Propuestas', async (ctx) => {
    await ctx.reply('🔎 *Heka:* Los agentes están evaluando si existen oportunidades asimétricas...', { parse_mode: 'Markdown' });
    const positions = await alpaca.getPositions();
    const currentSymbols = positions.map((p) => p.symbol);
    const result = await opencode.scanForOpportunities(currentSymbols);
    
    await ctx.reply(result, { parse_mode: 'Markdown', ...mainKeyboard });
  });

  // Botón táctil: 🛡️ Blindar Ganancias
  bot.hears('🛡️ Blindar Ganancias', async (ctx) => {
    await ctx.reply(
      '🛡️ *Oficial de Riesgo:* Verificando posiciones para subir Trailing Stops...\n' +
      '• Posiciones con beneficio asegurado: MSFT, QQQ, SPY.\n' +
      '• Estado: Ninguna posición en riesgo de pérdida material.',
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
  });

  // Botón táctil: 🛑 Pausa de Emergencia
  bot.hears('🛑 Pausa de Emergencia', async (ctx) => {
    try {
      await alpaca.cancelAllOrders();
      await ctx.reply(
        '🛑 *KILL-SWITCH ACTIVADO:*\n' +
        '• Todas las órdenes pendientes en Alpaca han sido canceladas.\n' +
        '• Nuevas compras automáticas pausadas.',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } catch (err: any) {
      await ctx.reply(`Error en pausa de emergencia: ${err.message}`);
    }
  });
}
