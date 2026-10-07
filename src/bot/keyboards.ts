import { Markup } from 'telegraf';

// Teclado inferior fijo persistente para el móvil (lenguaje natural y amigable)
export const mainKeyboard = Markup.keyboard([
  ['💡 Sugerencias de Inversión', '📊 Mi Portafolio'],
  ['🔍 Consultar una Acción/Cripto', '📈 Noticias del Mercado'],
  ['🛡️ Proteger Mis Ganancias', '🛑 Detener Operaciones']
]).resize();

// Selector dinámico de activos frecuentes con nombres claros
export const tickerSelectorInline = Markup.inlineKeyboard([
  [
    Markup.button.callback('💻 Microsoft (MSFT)', 'analyze_MSFT'),
    Markup.button.callback('🌐 Google (GOOGL)', 'analyze_GOOGL')
  ],
  [
    Markup.button.callback('🚀 Nasdaq 100 (QQQ)', 'analyze_QQQ'),
    Markup.button.callback('🇺🇸 S&P 500 (SPY)', 'analyze_SPY')
  ],
  [
    Markup.button.callback('🪙 Bitcoin (BTC)', 'analyze_BTC/USD'),
    Markup.button.callback('🪙 Ethereum (ETH)', 'analyze_ETH/USD')
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
