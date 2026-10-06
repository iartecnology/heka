import dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import { AlpacaClient } from './agents/alpaca_client';
import { OpenCodeRunner } from './agents/opencode_runner';
import { setupTelegramBot } from './bot/telegram';
import { setupActiveScheduler } from './scheduler/cron_jobs';
import { startWebServer } from './server/web_server';

async function bootstrap() {
  console.log('🚀 [HEKA] Iniciando Sistema Multi-Agente de Trading...');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const allowedUser = process.env.TELEGRAM_ALLOWED_USER_ID;
  const port = parseInt(process.env.PORT || '3000', 10);

  if (!botToken || !allowedUser) {
    console.error('❌ [HEKA] Error: TELEGRAM_BOT_TOKEN o TELEGRAM_ALLOWED_USER_ID no definidos.');
    process.exit(1);
  }

  const alpaca = new AlpacaClient();
  const opencode = new OpenCodeRunner();
  const bot = new Telegraf(botToken);

  // Iniciar servidor web de estado y logs
  startWebServer(alpaca, port);

  // Configurar comandos y botones de Telegram
  setupTelegramBot(bot, alpaca, opencode, allowedUser);

  // Capturar errores no controlados para que el bot nunca muera
  bot.catch((err: any, ctx) => {
    console.error(`[Telegraf Error] en update ${ctx.update.update_id}:`, err);
  });

  // Configurar bucles activos y cron jobs
  setupActiveScheduler(bot, alpaca, opencode, allowedUser);

  // Iniciar bot
  await bot.launch();
  console.log('✅ [HEKA] Bot conectado a Telegram y Agentes Activos en ejecución.');

  // Manejar parada segura
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error en Heka:', err);
  process.exit(1);
});
