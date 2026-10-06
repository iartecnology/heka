import { Markup } from 'telegraf';

// Teclado inferior fijo persistente para el móvil
export const mainKeyboard = Markup.keyboard([
  ['💡 Ver Nuevas Propuestas', '📊 Ver Resumen Cartera'],
  ['🛡️ Blindar Ganancias', '📰 Sentimiento Macro'],
  ['🔍 Analizar Ticker', '🛑 Pausa de Emergencia']
]).resize();

// Selector dinámico de tickers frecuentes
export const tickerSelectorInline = Markup.inlineKeyboard([
  [
    Markup.button.callback('🏢 MSFT', 'analyze_MSFT'),
    Markup.button.callback('🔍 GOOGL', 'analyze_GOOGL'),
    Markup.button.callback('📈 QQQ', 'analyze_QQQ')
  ],
  [
    Markup.button.callback('🇺🇸 SPY', 'analyze_SPY'),
    Markup.button.callback('🥇 GLD', 'analyze_GLD'),
    Markup.button.callback('🏦 TLT', 'analyze_TLT')
  ]
]);

// Tarjeta de decisión con botones interactivos para órdenes
export function createProposalKeyboard(proposalId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Aprobar Compra', `approve_${proposalId}`),
      Markup.button.callback('❌ Descartar', `reject_${proposalId}`)
    ],
    [
      Markup.button.callback('🔍 Ver Tesis Detallada', `details_${proposalId}`)
    ]
  ]);
}
