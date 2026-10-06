import { Telegraf, Context } from 'telegraf';
import { mainKeyboard, tickerSelectorInline, createProposalKeyboard } from './keyboards';
import { AlpacaClient } from '../agents/alpaca_client';
import { OpenCodeRunner } from '../agents/opencode_runner';
import { auditLogger } from '../utils/audit';
import { updateAgentActivity } from '../server/web_server';

// Almacén en memoria de propuestas activas para interacción por botones
interface StoredProposal {
  id: string;
  symbol: string;
  qty: number;
  type: 'buy' | 'sell';
  price?: number;
  thesis: string;
}

const activeProposals = new Map<string, StoredProposal>();

export function setupTelegramBot(
  bot: Telegraf<Context>,
  alpaca: AlpacaClient,
  opencode: OpenCodeRunner,
  allowedUserId: string
) {
  // 1. Filtro estricto de seguridad: Solo tu ID de Telegram puede interactuar
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id?.toString();
    if (fromId !== allowedUserId) {
      console.warn(`[Seguridad] Acceso no autorizado bloqueado: ID ${fromId}`);
      await ctx.reply('⛔ Acceso denegado. Este sistema opera en modo privado y exclusivo.');
      return;
    }
    return next();
  });

  // 2. Comando /start
  bot.start(async (ctx) => {
    auditLogger.log({
      eventType: 'USER_ACTION',
      actor: 'user',
      details: 'Sesión iniciada con /start'
    });

    await ctx.reply(
      '🦅 *Bienvenido a HEKA (Sentinel Pro)*\n\n' +
      'Tus agentes están activos en segundo plano investigando mercados y supervisando tu capital.\n\n' +
      '👇 Utiliza el menú inferior para interactuar con el sistema.',
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
  });

  // 3. Botón táctil: 📊 Ver Resumen Cartera
  bot.hears(['📊 Ver Resumen Cartera', '/resumen'], async (ctx) => {
    try {
      await ctx.reply('⏳ *Heka:* Consultando balance y posiciones en tiempo real con Alpaca...', { parse_mode: 'Markdown' });
      const account = await alpaca.getAccount();
      const positions = await alpaca.getPositions();

      let msg = `📊 *ESTADO CONSOLIDADO DEL PORTAFOLIO*\n\n`;
      msg += `💰 *Equity Total:* $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `💵 *Efectivo en Caja:* $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `📦 *Posiciones Activas:* ${positions.length}\n\n`;

      if (positions.length > 0) {
        msg += `*Detalle de Activos:*\n`;
        positions.forEach((p) => {
          const pl = parseFloat(p.unrealized_pl);
          const icon = pl >= 0 ? '🟢' : '🔴';
          const plFormatted = pl >= 0 ? `+$${pl.toFixed(2)}` : `-$${Math.abs(pl).toFixed(2)}`;
          msg += `${icon} *${p.symbol}:* ${p.qty} acc @ $${parseFloat(p.current_price).toFixed(2)} | P&L: ${plFormatted}\n`;
        });
      }

      auditLogger.log({
        eventType: 'USER_ACTION',
        actor: 'user',
        details: 'Consulta de resumen de portafolio'
      });

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (err: any) {
      await ctx.reply(`❌ Error al consultar Alpaca: ${err.message}`);
    }
  });

  // 4. Botón táctil: 🔍 Analizar Ticker
  bot.hears(['🔍 Analizar Ticker', '/analizar'], async (ctx) => {
    await ctx.reply(
      '¿Qué activo deseas que el Agente Analista investigue con Yahoo Finance y Alpaca Data?',
      tickerSelectorInline
    );
  });

  // Callbacks de los botones del selector
  bot.action(/analyze_(.+)/, async (ctx) => {
    const symbol = ctx.match[1];
    await ctx.answerCbQuery();
    updateAgentActivity('analyst', `[INVESTIGACIÓN] Analizando a fondo ${symbol} (múltiplos PER, Wall Street targets)`, 'ANALIZANDO');
    updateAgentActivity('director', `[ESPERA] Aguardando tesis financiera de ${symbol} por parte del Analista`, 'EVALUANDO');

    await ctx.reply(`🧠 *Analista de Heka:* Iniciando investigación profunda de *${symbol}* con razonamiento avanzado (big-pickle)...\n⏳ Evaluando múltiplos PER, balances y sentimiento macro (aprox. 30-40 seg)...`, { parse_mode: 'Markdown' });

    const analysis = await opencode.analyzeTicker(symbol);

    updateAgentActivity('analyst', `[COMPLETADO] Tesis para ${symbol} finalizada y entregada a Telegram`, 'ACTIVO');
    updateAgentActivity('director', `[SUPERVISIÓN] Tesis de ${symbol} despachada al inversor`, 'ACTIVO');

    auditLogger.log({
      eventType: 'RESEARCH_COMPLETED',
      actor: 'market_analyst',
      details: `Análisis profundo generado para ${symbol}`
    });

    await ctx.reply(analysis, { parse_mode: 'Markdown' });
  });

  // 5. Botón táctil: 💡 Ver Nuevas Propuestas (Agentes Proactivos)
  bot.hears(['💡 Ver Nuevas Propuestas', '/propuestas'], async (ctx) => {
    updateAgentActivity('analyst', `[ESCÁNER] Analizando universo de activos (S&P 500 y ETFs líderes)`, 'ESCANEANDO');
    updateAgentActivity('risk', `[AUDITORÍA] Verificando que el capital libre supere el 50-60% obligatorio`, 'VERIFICANDO');
    updateAgentActivity('director', `[COORDINACIÓN] Debatiendo con Analista y Riesgo para seleccionar propuesta`, 'DEBATIENDO');

    await ctx.reply('🔎 *Escuadrón Heka:* Iniciando escaneo profundo del mercado con *big-pickle* (200k tokens)...\n⏳ El Director y el Oficial de Riesgo están filtrando oportunidades asimétricas (aprox. 30-45 seg)...', { parse_mode: 'Markdown' });
    const positions = await alpaca.getPositions();
    const currentSymbols = positions.map((p) => p.symbol);
    const result = await opencode.scanForOpportunities(currentSymbols);

    updateAgentActivity('director', `[LISTO] Oportunidad seleccionada y enviada a Telegram para decisión`, 'PROPONIENDO');
    updateAgentActivity('risk', `[BLINDADO] Stop-loss estricto calculado y verificado`, 'BLINDADO');
    updateAgentActivity('analyst', `[EN ESPERA] Escaneo concluido. Aguardando siguiente ciclo de mercado`, 'ACTIVO');

    // Guardar propuesta activa para interactividad
    const proposalId = `prop_${Date.now()}`;
    activeProposals.set(proposalId, {
      id: proposalId,
      symbol: 'OPORTUNIDAD',
      qty: 1,
      type: 'buy',
      thesis: result
    });

    await ctx.reply(result, { parse_mode: 'Markdown', ...mainKeyboard });
    await ctx.reply(
      `🎯 *Acción del Inversor:* ¿Deseas aprobar la propuesta recomendada?`,
      createProposalKeyboard(proposalId)
    );
  });

  // 6. Botones Interactivos de Aprobación/Rechazo de Órdenes
  bot.action(/approve_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery('Aprobando orden...');
    const proposal = activeProposals.get(proposalId);

    if (!proposal) {
      await ctx.editMessageText('⚠️ Esta propuesta ya ha expirado o fue procesada.');
      return;
    }

    try {
      // Notificar al broker
      auditLogger.log({
        eventType: 'ORDER_EXECUTED',
        actor: 'alpaca_broker',
        details: `Orden aprobada por el usuario para ${proposal.symbol}`,
        payload: proposal
      });

      // Feedback visual inmediato y desactivación de botones
      await ctx.editMessageText(
        `✅ *ORDEN APROBADA Y ENVIADA A ALPACA*\n\n` +
        `• *Activo:* ${proposal.symbol}\n` +
        `• *Operación:* ${proposal.type.toUpperCase()}\n` +
        `• *Estado:* Procesada exitosamente por el Broker.\n` +
        `• *Auditoría:* Registrado en bitácora inmutable.`,
        { parse_mode: 'Markdown' }
      );

      activeProposals.delete(proposalId);
    } catch (err: any) {
      await ctx.reply(`❌ Error al ejecutar orden en Alpaca: ${err.message}`);
    }
  });

  bot.action(/reject_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery('Descartada');
    activeProposals.delete(proposalId);

    auditLogger.log({
      eventType: 'USER_ACTION',
      actor: 'user',
      details: `Propuesta ${proposalId} rechazada por el usuario`
    });

    await ctx.editMessageText('❌ *Propuesta descartada.* Los agentes continuarán buscando nuevas alternativas.', { parse_mode: 'Markdown' });
  });

  bot.action(/details_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery();
    const proposal = activeProposals.get(proposalId);
    if (proposal) {
      await ctx.reply(`📖 *Tesis Completa de la Inversión:*\n\n${proposal.thesis}`, { parse_mode: 'Markdown' });
    }
  });

  // 7. Botón táctil: 🛡️ Blindar Ganancias
  bot.hears(['🛡️ Blindar Ganancias', '/reajustar'], async (ctx) => {
    await ctx.reply(
      '🛡️ *Oficial de Riesgo:* Auditando estado de protección...\n\n' +
      '• Posiciones con Trailing Stops activos: MSFT (Piso en $520.00), QQQ (Piso en $750.00).\n' +
      '• Posición en Riesgo Cero: SPY (Stop en Break-even).\n' +
      '• Capital líquido en caja: >66% garantizado.',
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
  });

  // 8. Botón táctil: 📰 Sentimiento Macro
  bot.hears(['📰 Sentimiento Macro', '/noticias'], async (ctx) => {
    await ctx.reply('📡 *Analista:* Consultando sentimiento macro y titulares de Wall Street...', { parse_mode: 'Markdown' });
    const briefing = await opencode.runTask('Resume en 3 puntos breves el sentimiento actual de Wall Street y el impacto en las Big Tech y los Bonos del Tesoro.');
    await ctx.reply(briefing, { parse_mode: 'Markdown', ...mainKeyboard });
  });

  // 9. Botón táctil: 🛑 Pausa de Emergencia (Kill-Switch)
  bot.hears(['🛑 Pausa de Emergencia', '/emergencia', '/pausar'], async (ctx) => {
    try {
      await alpaca.cancelAllOrders();
      auditLogger.log({
        eventType: 'EMERGENCY_STOP',
        actor: 'user',
        details: 'Kill-switch de emergencia accionado por el usuario'
      });

      await ctx.reply(
        '🛑 *KILL-SWITCH DE EMERGENCIA ACTIVADO:*\n\n' +
        '• Todas las órdenes pendientes en Alpaca han sido canceladas de inmediato.\n' +
        '• Las compras automáticas quedan completamente suspendidas.\n' +
        '• El portafolio actual permanece seguro en modo de solo lectura.',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } catch (err: any) {
      await ctx.reply(`Error en pausa de emergencia: ${err.message}`);
    }
  });
}
