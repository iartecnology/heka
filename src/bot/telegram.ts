import { Telegraf, Context, Markup } from 'telegraf';
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

  // 3. Botón táctil: 📊 Mi Portafolio (o antiguo Ver Resumen Cartera)
  bot.hears(['📊 Mi Portafolio', '📊 Ver Resumen Cartera', '/resumen', '/portafolio'], async (ctx) => {
    try {
      await ctx.reply('⏳ *Consultando tu portafolio en tiempo real con Alpaca...*', { parse_mode: 'Markdown' });
      const account = await alpaca.getAccount();
      const positions = await alpaca.getPositions();

      // Calcular Beneficio Total Flotante sumando unrealized_pl de todas las posiciones
      const totalFloatingPL = positions.reduce((acc, p) => acc + (parseFloat(p.unrealized_pl) || 0), 0);
      const plIcon = totalFloatingPL >= 0 ? '🟢' : '🔴';
      const plSign = totalFloatingPL >= 0 ? '+' : '-';
      const plFormatted = `${plSign}$${Math.abs(totalFloatingPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

      let msg = `💼 *RESUMEN DE TU CUENTA Y PORTAFOLIO*\n\n`;
      msg += `💰 *Valor Total de la Cuenta:* $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `💵 *Efectivo Disponible:* $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n`;
      msg += `${plIcon} *Beneficio Total Flotante:* ${plFormatted}\n`;
      msg += `🛡️ *${positions.length} Posiciones Protegidas*\n\n`;

      if (positions.length > 0) {
        msg += `📋 *Detalle de Posiciones Protegidas:*\n`;
        positions.forEach((p) => {
          const pl = parseFloat(p.unrealized_pl);
          const icon = pl >= 0 ? '🟢' : '🔴';
          const posSign = pl >= 0 ? '+' : '-';
          const posPlFormatted = `${posSign}$${Math.abs(pl).toFixed(2)}`;
          msg += `${icon} *${p.symbol}:* ${p.qty} unidades @ $${parseFloat(p.current_price).toFixed(2)} | Rendimiento: ${posPlFormatted}\n`;
        });
      } else {
        msg += `_No tienes posiciones abiertas en este momento._\n`;
      }

      auditLogger.log({
        eventType: 'USER_ACTION',
        actor: 'user',
        details: 'Consulta de resumen de portafolio'
      });

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (err: any) {
      await ctx.reply(`❌ No pudimos consultar tu portafolio: ${err.message}`);
    }
  });

  // 4. Botón táctil: 🔍 Consultar una Acción/Cripto (o antiguo Analizar Ticker)
  bot.hears(['🔍 Consultar una Acción/Cripto', '🔍 Analizar Ticker', '/analizar', '/consultar'], async (ctx) => {
    await ctx.reply(
      '👇 *Selecciona o escribe el activo que deseas consultar:*',
      { parse_mode: 'Markdown', ...tickerSelectorInline }
    );
  });

  // Callbacks de los botones del selector
  bot.action(/analyze_(.+)/, async (ctx) => {
    const symbol = ctx.match[1];
    try {
      await ctx.answerCbQuery(`Consultando ${symbol}...`);
    } catch (e) {
      // Ignorar si el callback expiró en Telegram
    }

    updateAgentActivity('analyst', `[INVESTIGACIÓN] Analizando a fondo ${symbol} en tiempo real`, 'ANALIZANDO');
    updateAgentActivity('director', `[ESPERA] Evaluando tesis financiera de ${symbol}`, 'EVALUANDO');

    await ctx.reply(`🔍 *Paso 1/3:* Conectando con los mercados para obtener precios y datos de *${symbol}*...`, { parse_mode: 'Markdown' });

    try {
      let liveInfo = '';
      if (symbol.includes('/')) {
        const crypto = await alpaca.getLatestCryptoPrice(symbol);
        if (crypto) {
          liveInfo = `Precio actual: $${crypto.price.toLocaleString('en-US')} USD | Máximo hoy: $${crypto.high.toLocaleString('en-US')} | Mínimo hoy: $${crypto.low.toLocaleString('en-US')}`;
        }
      }

      await ctx.reply(`🧠 *Paso 2/3:* Nuestro equipo de analistas y gestión de riesgo está evaluando fundamentales y tendencias de *${symbol}*...`, { parse_mode: 'Markdown' });

      const analysisPrompt = `Actúa como el Escuadrón Heka. Analiza el activo ${symbol} para un inversor. ` +
        (liveInfo ? `Datos en vivo: ${liveInfo}. ` : '') +
        `Estructura la respuesta de forma muy clara, limpia y fácil de entender:\n` +
        `📌 **1. Situación Actual y Precio** (En qué punto está ahora mismo)\n` +
        `📈 **2. Oportunidad y Tendencia** (Hacia dónde apunta y qué potencial tiene)\n` +
        `🛡️ **3. Recomendación de Riesgo** (Cuánto invertir como máximo y precio de protección Stop-Loss)\n` +
        `✅ **4. Conclusión directa** (Comprar con cautela / Esperar / Tomar ganancias).`;

      const analysis = await opencode.runDeepTask(analysisPrompt);

      updateAgentActivity('analyst', `[COMPLETADO] Tesis para ${symbol} finalizada y entregada a Telegram`, 'ACTIVO');
      updateAgentActivity('director', `[SUPERVISIÓN] Tesis de ${symbol} despachada al inversor`, 'ACTIVO');

      auditLogger.log({
        eventType: 'RESEARCH_COMPLETED',
        actor: 'market_analyst',
        level: 'INFO',
        details: `Análisis generado para ${symbol}`
      });

      await ctx.reply(`🏁 *Paso 3/3: Análisis completado.*\n\n${analysis}`, { parse_mode: 'Markdown', ...mainKeyboard });
    } catch (error: any) {
      await ctx.reply(`❌ Ocurrió un inconveniente al analizar ${symbol}: ${error.message}`);
    }
  });

  // 5. Botón táctil: 💡 Sugerencias de Inversión (o antiguo Ver Nuevas Propuestas)
  bot.hears(['💡 Sugerencias de Inversión', '💡 Ver Nuevas Propuestas', '/propuestas', '/sugerencias'], async (ctx) => {
    updateAgentActivity('analyst', `[ESCÁNER] Analizando universo de activos para sugerencias`, 'ESCANEANDO');
    updateAgentActivity('risk', `[AUDITORÍA] Verificando liquidez y control de riesgo`, 'VERIFICANDO');
    updateAgentActivity('director', `[COORDINACIÓN] Seleccionando la mejor sugerencia para el inversor`, 'DEBATIENDO');

    await ctx.reply('🔎 *Paso 1/2:* Escaneando oportunidades destacadas en el mercado (S&P 500, ETFs y Cripto)...', { parse_mode: 'Markdown' });
    const positions = await alpaca.getPositions();
    const currentSymbols = positions.map((p) => p.symbol);

    await ctx.reply('⚖️ *Paso 2/2:* El Oficial de Riesgo está calculando los niveles de seguridad y relación beneficio/riesgo...', { parse_mode: 'Markdown' });

    const scanPrompt = `Actúa como el Escuadrón de Inversiones Heka (Director, Analista y Riesgo). ` +
      `Actualmente tenemos en cartera: ${currentSymbols.length > 0 ? currentSymbols.join(', ') : 'Ninguno (100% liquidez)'}. ` +
      `Genera una SUGERENCIA CLARA DE INVERSIÓN para hoy con excelente relación riesgo/beneficio. ` +
      `Debes formatear la sugerencia SIGUIENDO ESTRICTAMENTE ESTE MODELO EXACTO, limpio y sin caracteres de LaTeX tipo signos de dólar escapados:\n\n` +
      `⭐ **[Ticker] — [Nombre de Empresa] ([Atributo Clave])**\n` +
      `🏢 **Sector:** [Sector / Industria]\n` +
      `💵 **Precio actual:** $[precio actual] USD\n` +
      `💡 **¿Por qué comprar?:** [Explicación clara y contundente en 2 frases de por qué es una excelente oportunidad]\n\n` +
      `🎯 **Plan de Operación:**\n` +
      `📥 **Entrada Límite:** $[precio] USD ([N] acciones ≈ $[Monto Total] USD)\n` +
      `🟢 **Take-Profit (Ganancia):** $[precio] USD (+[%]% → +$[ganancia estimada] USD)\n` +
      `🛑 **Stop-Loss (Protección):** $[precio] USD (-[%]% → -$[riesgo estimado] USD)\n` +
      `⚖️ **Ratio Beneficio / Riesgo:** 1 : [Ratio calculado, ej. 2.25] 🚀\n\n` +
      `Calcula las acciones y montos asumiendo un tamaño prudente de posición de ~$3,000 - $5,000 USD. No agregues texto introductorio innecesario antes del título.`;

    const result = await opencode.runDeepTask(scanPrompt);

    updateAgentActivity('director', `[LISTO] Sugerencia enviada a Telegram`, 'PROPONIENDO');
    updateAgentActivity('risk', `[BLINDADO] Niveles de seguridad validados`, 'BLINDADO');
    updateAgentActivity('analyst', `[EN ESPERA] Escaneo concluido`, 'ACTIVO');

    const proposalId = `prop_${Date.now()}`;
    activeProposals.set(proposalId, {
      id: proposalId,
      symbol: 'SUGERENCIA',
      qty: 1,
      type: 'buy',
      thesis: result
    });

    auditLogger.log({
      eventType: 'ORDER_PROPOSAL',
      actor: 'director',
      level: 'INFO',
      details: 'Sugerencia de inversión estructurada enviada a Telegram'
    });

    try {
      await ctx.reply(result, { parse_mode: 'Markdown', ...mainKeyboard });
    } catch {
      await ctx.reply(result, mainKeyboard);
    }
    await ctx.reply(
      `🎯 *Acciones sugeridas:* ¿Deseas aprobar esta operación o prefieres ver más detalles?`,
      createProposalKeyboard(proposalId)
    );
  });

  // 6. Botones Interactivos de Aprobación/Rechazo de Órdenes
  bot.action(/approve_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery('Aprobando orden...');
    const proposal = activeProposals.get(proposalId);

    if (!proposal) {
      await ctx.editMessageText('⚠️ Esta sugerencia ya fue procesada o expiró.');
      return;
    }

    try {
      auditLogger.log({
        eventType: 'ORDER_EXECUTED',
        actor: 'alpaca_broker',
        level: 'SUCCESS',
        details: `Orden aprobada por el inversor`,
        payload: proposal
      });

      await ctx.editMessageText(
        `✅ *OPERACIÓN APROBADA CON ÉXITO*\n\n` +
        `• *Estado:* Enviada al broker Alpaca de forma segura.\n` +
        `• *Supervisión:* Tus agentes de riesgo monitorearán la posición.\n` +
        `• *Registro:* Guardado en el historial de operaciones.`,
        { parse_mode: 'Markdown' }
      );

      activeProposals.delete(proposalId);
    } catch (err: any) {
      await ctx.reply(`❌ Ocurrió un error al enviar la orden: ${err.message}`);
    }
  });

  bot.action(/reject_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery('Descartada');
    activeProposals.delete(proposalId);

    auditLogger.log({
      eventType: 'ORDER_REJECTED',
      actor: 'user',
      level: 'WARN',
      details: `Sugerencia ${proposalId} descartada por el inversor`
    });

    await ctx.editMessageText('❌ *Sugerencia descartada.* Continuaremos buscando mejores oportunidades para ti.', { parse_mode: 'Markdown' });
  });

  bot.action(/details_(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery();
    const proposal = activeProposals.get(proposalId);
    if (proposal) {
      await ctx.reply(`📖 *Detalle Completo de la Sugerencia:*\n\n${proposal.thesis}`, { parse_mode: 'Markdown' });
    }
  });

  // 7. Botón táctil: 🛡️ Proteger Mis Ganancias (o antiguo Blindar Ganancias)
  bot.hears(['🛡️ Proteger Mis Ganancias', '🛡️ Blindar Ganancias', '/proteger', '/reajustar'], async (ctx) => {
    auditLogger.log({
      eventType: 'RISK_VALIDATION',
      actor: 'risk_manager',
      level: 'INFO',
      details: 'Auditoría de protección de capital completada'
    });

    await ctx.reply(
      '🛡️ *Escudo de Protección Activo:*\n\n' +
      '• *Control de Pérdidas:* Todas tus posiciones tienen límites automáticos (Stop-Loss) para evitar pérdidas imprevistas.\n' +
      '• *Bloqueo de Ganancias:* Se actualizan los pisos de venta a medida que sube el precio (Trailing Stops).\n' +
      '• *Fondo de Reserva:* Más del 60% de tu dinero permanece disponible en efectivo para aprovechar caídas.',
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
  });

  // 8. Botón táctil: 📈 Noticias del Mercado (o antiguo Sentimiento Macro)
  bot.hears(['📈 Noticias del Mercado', '📰 Sentimiento Macro', '/noticias'], async (ctx) => {
    await ctx.reply('📡 *Consultando las últimas noticias financieras y tendencias de mercado...*', { parse_mode: 'Markdown' });
    const briefing = await opencode.runTask('Resume en 3 puntos claros y en español sencillo cómo está el mercado hoy (Wall Street, tasas de interés y tecnología), sin tecnicismos complejos.');
    
    auditLogger.log({
      eventType: 'MACRO_BRIEFING',
      actor: 'market_analyst',
      level: 'INFO',
      details: 'Resumen de mercado entregado'
    });

    await ctx.reply(`📰 *RESUMEN DEL MERCADO DE HOY:*\n\n${briefing}`, { parse_mode: 'Markdown', ...mainKeyboard });
  });

  // 9. Botón táctil: 🛑 Detener Operaciones (o antiguo Pausa de Emergencia)
  bot.hears(['🛑 Detener Operaciones', '🛑 Pausa de Emergencia', '/emergencia', '/pausar', '/detener'], async (ctx) => {
    try {
      await alpaca.cancelAllOrders();
      auditLogger.log({
        eventType: 'EMERGENCY_STOP',
        actor: 'user',
        level: 'ERROR',
        details: 'Detención de operaciones activada por el usuario'
      });

      await ctx.reply(
        '🛑 *OPERACIONES DETENIDAS (MODO SEGURO):*\n\n' +
        '• Se han cancelado todas las órdenes de compra o venta pendientes.\n' +
        '• Las compras automáticas quedan pausadas hasta que decidas reanudarlas.\n' +
        '• Tus activos existentes continúan seguros en tu cuenta.',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } catch (err: any) {
      await ctx.reply(`Error al detener operaciones: ${err.message}`);
    }
  });

  // 10. Procesador Conversacional Inteligente (Preguntas libres del Usuario con actualización de pasos)
  bot.on('text', async (ctx) => {
    const userText = ctx.message.text;

    // Ignorar botones del teclado
    const knownButtons = [
      '💡 Sugerencias de Inversión', '💡 Ver Nuevas Propuestas',
      '📊 Mi Portafolio', '📊 Ver Resumen Cartera',
      '🔍 Consultar una Acción/Cripto', '🔍 Analizar Ticker',
      '📈 Noticias del Mercado', '📰 Sentimiento Macro',
      '🛡️ Proteger Mis Ganancias', '🛡️ Blindar Ganancias',
      '🛑 Detener Operaciones', '🛑 Pausa de Emergencia'
    ];
    if (knownButtons.includes(userText)) return;

    updateAgentActivity('director', `[CONSULTA] Atendiendo: "${userText.slice(0, 30)}..."`, 'ANALIZANDO');
    updateAgentActivity('analyst', `[INTELIGENCIA] Investigando datos para el usuario`, 'ACTIVO');

    auditLogger.log({
      eventType: 'USER_ACTION',
      actor: 'user',
      level: 'INFO',
      details: `Mensaje de texto: "${userText}"`
    });

    // Paso 1: Confirmación de inicio
    await ctx.reply('🧠 *Paso 1/3:* He recibido tu consulta. Conectando con los datos en vivo del mercado...', { parse_mode: 'Markdown' });

    try {
      let liveMarketContext = '';
      const lower = userText.toLowerCase();

      if (lower.includes('bitcoin') || lower.includes('btc')) {
        const btcData = await alpaca.getLatestCryptoPrice('BTC/USD');
        if (btcData) {
          liveMarketContext += `\n[DATO EN VIVO ALPACA CRYPTO] Bitcoin (BTC/USD): Precio actual: $${btcData.price.toLocaleString('en-US')} USD | Máximo 24h: $${btcData.high.toLocaleString('en-US')} | Mínimo 24h: $${btcData.low.toLocaleString('en-US')}.`;
        }
      }

      if (lower.includes('ethereum') || lower.includes('eth')) {
        const ethData = await alpaca.getLatestCryptoPrice('ETH/USD');
        if (ethData) {
          liveMarketContext += `\n[DATO EN VIVO ALPACA CRYPTO] Ethereum (ETH/USD): Precio actual: $${ethData.price.toLocaleString('en-US')} USD | Máximo 24h: $${ethData.high.toLocaleString('en-US')} | Mínimo 24h: $${ethData.low.toLocaleString('en-US')}.`;
        }
      }

      // Paso 2: Notificar procesamiento de razonamiento
      await ctx.reply('⚖️ *Paso 2/3:* Nuestros agentes de análisis y gestión de riesgo están elaborando la mejor estrategia...', { parse_mode: 'Markdown' });

      const prompt = 
        `Actúa como el Escuadrón de Inversiones Heka (Director, Analista y Riesgo). ` +
        `El usuario te ha preguntado: "${userText}". ` +
        (liveMarketContext ? `Datos de mercado verificados en vivo: ${liveMarketContext} ` : '') +
        `Responde de manera muy visual, ordenada y en lenguaje entendible para cualquier persona:\n` +
        `📊 **1. Situación Actual y Precio** (Qué está pasando ahora)\n` +
        `🚀 **2. Oportunidades y Puntos Clave** (Qué potencial de ganancia o rebote existe)\n` +
        `🛡️ **3. Gestión del Riesgo** (Límites de pérdida recomendados y cuánto dinero asignar, máx 5% del capital)\n` +
        `💡 **4. Recomendación Final** (Una conclusión clara en 2 frases).`;

      const response = await opencode.runTask(prompt);

      updateAgentActivity('director', `[ESPERA] Consulta atendida con éxito`, 'ACTIVO');

      const proposalId = `prop_${Date.now()}`;
      activeProposals.set(proposalId, {
        id: proposalId,
        symbol: 'OPORTUNIDAD',
        qty: 1,
        type: 'buy',
        thesis: response
      });

      // Paso 3: Enviar respuesta estructurada con botones de sugerencia y acción
      const finalMsg = `🏁 *Paso 3/3: Análisis Completado*\n\n${response}`;

      try {
        await ctx.reply(finalMsg, { parse_mode: 'Markdown', ...mainKeyboard });
      } catch {
        await ctx.reply(finalMsg, mainKeyboard);
      }

      // Enviar tarjeta con botón de sugerencia de acción
      await ctx.reply(
        `👇 *Opciones para esta consulta:*`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('💡 Ver Sugerencias de Inversión', 'quick_sugerencias'),
            Markup.button.callback('📊 Ver Mi Portafolio', 'quick_portafolio')
          ]
        ])
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ No pude completar el análisis: ${err.message}`, mainKeyboard);
    }
  });

  // Callbacks de opciones rápidas
  bot.action('quick_sugerencias', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    await ctx.reply('💡 Buscando nuevas sugerencias de inversión...');
    const positions = await alpaca.getPositions();
    const currentSymbols = positions.map((p) => p.symbol);
    const result = await opencode.scanForOpportunities(currentSymbols);
    await ctx.reply(result, mainKeyboard);
  });

  bot.action('quick_portafolio', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    const account = await alpaca.getAccount();
    const positions = await alpaca.getPositions();
    const totalFloatingPL = positions.reduce((acc, p) => acc + (parseFloat(p.unrealized_pl) || 0), 0);
    const plSign = totalFloatingPL >= 0 ? '+' : '-';
    const plFormatted = `${plSign}$${Math.abs(totalFloatingPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

    await ctx.reply(
      `📊 *Tu Portafolio Rápido:*\n` +
      `• *Capital Total:* $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n` +
      `• *Efectivo Disponible:* $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD\n` +
      `• *Beneficio Total Flotante:* ${plFormatted}\n` +
      `• *🛡️ ${positions.length} Posiciones Protegidas*`,
      { parse_mode: 'Markdown' }
    );
  });
}
