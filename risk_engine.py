import os
from typing import Dict, Any, Tuple

# Constantes fijas de riesgo (código inviolable)
MAX_ALLOCATION_PCT = 0.05  # Máximo 5% de la cuenta por posición
MIN_RISK_REWARD_RATIO = 1.8  # Mínimo ratio beneficio/riesgo
ALLOWED_ORDER_TYPES = ["limit"]
ALLOWED_ASSETS = ["NVDA", "MSFT", "AAPL", "TSLA", "BTC/USD", "ETH/USD", "SOL/USD"]

def validate_proposal(proposal: Dict[str, Any], account_equity: float) -> Tuple[bool, str]:
    """
    Valida una propuesta de operación emitida por la IA contra las reglas estrictas de riesgo.
    Retorna (True, "OK") o (False, "Motivo de rechazo").
    """
    # 1. Validar activo permitido
    symbol = proposal.get("symbol")
    if symbol not in ALLOWED_ASSETS:
        return False, f"Activo {symbol} no está en la lista de activos permitidos (Whitelist)."

    # 2. Validar tipo de orden (debe ser limit)
    order_type = proposal.get("order_type", "").lower()
    if order_type not in ALLOWED_ORDER_TYPES:
        return False, f"Tipo de orden '{order_type}' prohibida. Solo se permiten órdenes 'limit'."

    # 3. Validar asignación máxima de capital (<= 5%)
    limit_price = float(proposal.get("target_limit_price", 0))
    shares = float(proposal.get("shares", 0))
    total_cost = limit_price * shares
    max_allowed = account_equity * MAX_ALLOCATION_PCT

    if total_cost > max_allowed:
        return False, f"Asignación solicitada (${total_cost:.2f}) excede el límite máximo de 5% (${max_allowed:.2f})."

    # 4. Validar Stop Loss obligatorio
    stop_loss = proposal.get("stop_loss_price")
    if not stop_loss or float(stop_loss) <= 0:
        return False, "Operación rechazada: Stop Loss es obligatorio y debe ser mayor a 0."
    
    stop_loss = float(stop_loss)
    if stop_loss >= limit_price:
        return False, f"Stop Loss (${stop_loss}) debe ser menor al precio límite de entrada (${limit_price})."

    # 5. Validar Take Profit y Ratio Riesgo/Beneficio
    take_profit = proposal.get("take_profit_price")
    if not take_profit or float(take_profit) <= limit_price:
        return False, "Operación rechazada: Take Profit debe ser superior al precio límite de entrada."

    take_profit = float(take_profit)
    risk = limit_price - stop_loss
    reward = take_profit - limit_price
    rr_ratio = reward / risk if risk > 0 else 0

    if rr_ratio < MIN_RISK_REWARD_RATIO:
        return False, f"Ratio Riesgo/Beneficio ({rr_ratio:.2f}) es inferior al mínimo permitido ({MIN_RISK_REWARD_RATIO})."

    return True, f"Propuesta validada correctamente. Riesgo/Beneficio: {rr_ratio:.2f}, Costo: ${total_cost:.2f}"
