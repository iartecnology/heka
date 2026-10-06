"""
Motor de Riesgo Profesional basado en la especificación institucional de trading con Alpaca.
El código es la barrera innegociable.
"""
from typing import Dict, Any, Tuple, List

# Constantes fijas de riesgo (código inviolable)
ALLOWED_ASSETS = ["SPY", "VTI", "QQQ", "DIA"]
MAX_RISK_PER_TRADE_PCT = 0.01      # Máximo 1% de pérdida del capital si toca Stop Loss
MAX_ORDER_VALUE_PCT = 0.05         # Máximo 5% del capital por orden
MAX_POSITION_PER_ASSET_PCT = 0.20  # Máximo 20% del capital en un solo activo
MIN_CASH_RESERVE_PCT = 0.20        # Mínimo 20% del capital siempre en efectivo
MAX_DAILY_TRADES = 3               # Máximo 3 operaciones ejecutadas por día
ALLOWED_ORDER_TYPE = "limit"
ALLOWED_TIME_IN_FORCE = "day"
MAX_SLIPPAGE_PCT = 0.001           # 0.1% de margen sobre el precio actual

def validate_professional_proposal(
    proposal: Dict[str, Any],
    capital_total: float,
    efectivo_disponible: float,
    current_positions: List[Dict[str, Any]],
    current_prices: Dict[str, float],
    operaciones_hoy: int
) -> Tuple[bool, str]:
    """
    Valida la propuesta contra los límites innegociables del documento:
    - Retorna (True, "Mensaje de aprobación") o (False, "Motivo de rechazo")
    """
    accion = proposal.get("accion", "").upper()

    # Si la propuesta es MANTENER, es válida por definición
    if accion == "MANTENER":
        return True, "Acción MANTENER validada correctamente."

    if accion not in ["COMPRAR", "VENDER"]:
        return False, f"Acción '{accion}' no permitida. Solo COMPRAR, VENDER o MANTENER."

    simbolo = proposal.get("simbolo")
    if simbolo not in ALLOWED_ASSETS:
        return False, f"Símbolo '{simbolo}' prohibido. Solo se permite: {', '.join(ALLOWED_ASSETS)}."

    # Límite de operaciones por día
    if operaciones_hoy >= MAX_DAILY_TRADES:
        return False, f"Límite diario alcanzado: ya se han realizado {operaciones_hoy} operaciones hoy."

    cantidad = proposal.get("cantidad", 0)
    if not isinstance(cantidad, int) or cantidad < 1:
        return False, f"Cantidad inválida ({cantidad}). Debe ser un número entero >= 1."

    precio_limite = float(proposal.get("precio_limite") or 0)
    if precio_limite <= 0:
        return False, "Precio límite inválido o menor a 0."

    precio_actual = current_prices.get(simbolo)
    if not precio_actual:
        return False, f"No hay cotización reciente de mercado para {simbolo}."

    # 1. Reglas específicas para COMPRAR
    if accion == "COMPRAR":
        # Deslizamiento de compra: <= precio_actual * 1.001
        max_precio_compra = round(precio_actual * (1 + MAX_SLIPPAGE_PCT), 2)
        if precio_limite > max_precio_compra:
            return False, f"Precio límite de compra (${precio_limite}) excede el deslizamiento máximo de 0.1% (${max_precio_compra})."

        # Stop loss obligatorio
        stop_loss = float(proposal.get("stop_loss") or 0)
        if stop_loss <= 0 or stop_loss >= precio_limite:
            return False, f"Stop loss inválido (${stop_loss}). Debe ser menor al precio de entrada (${precio_limite})."

        # Riesgo por operación: (precio_limite - stop_loss) * cantidad <= 1% capital
        riesgo_dolares = (precio_limite - stop_loss) * cantidad
        max_riesgo_dolares = capital_total * MAX_RISK_PER_TRADE_PCT
        if riesgo_dolares > max_riesgo_dolares:
            return False, f"Riesgo de pérdida (${riesgo_dolares:.2f}) excede el 1% del capital (${max_riesgo_dolares:.2f})."

        # Valor de la orden <= 5% capital
        costo_orden = precio_limite * cantidad
        max_costo_orden = capital_total * MAX_ORDER_VALUE_PCT
        if costo_orden > max_costo_orden:
            return False, f"Valor de orden (${costo_orden:.2f}) excede el 5% del capital (${max_costo_orden:.2f})."

        # Posición total en el símbolo <= 20% capital
        posicion_actual_valor = sum(p["valor"] for p in current_positions if p["simbolo"] == simbolo)
        if (posicion_actual_valor + costo_orden) > (capital_total * MAX_POSITION_PER_ASSET_PCT):
            return False, f"Posición acumulada en {simbolo} excedería el límite del 20% del capital."

        # Efectivo después de la orden >= 20% capital
        efectivo_restante = efectivo_disponible - costo_orden
        min_efectivo_requerido = capital_total * MIN_CASH_RESERVE_PCT
        if efectivo_restante < min_efectivo_requerido:
            return False, f"Efectivo restante (${efectivo_restante:.2f}) sería menor al 20% mínimo (${min_efectivo_requerido:.2f})."

    # 2. Reglas específicas para VENDER
    elif accion == "VENDER":
        # Deslizamiento de venta: >= precio_actual * 0.999
        min_precio_venta = round(precio_actual * (1 - MAX_SLIPPAGE_PCT), 2)
        if precio_limite < min_precio_venta:
            return False, f"Precio límite de venta (${precio_limite}) está por debajo del 0.1% permitido (${min_precio_venta})."

        # Debe poseer la posición
        posicion_existente = next((p for p in current_positions if p["simbolo"] == simbolo), None)
        if not posicion_existente or posicion_existente["cantidad"] < cantidad:
            return False, f"No puedes vender {cantidad} acciones de {simbolo} porque no tienes suficientes títulos en cartera."

    return True, f"Propuesta de {accion} para {simbolo} validada con éxito bajo todas las reglas de riesgo."
