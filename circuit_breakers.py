"""
Módulo de Disyuntores de Emergencia (Circuit Breakers)
Apaga o pausa automáticamente el agente si se violan umbrales críticos de seguridad técnica o financiera.
"""
from typing import Tuple

class CircuitBreaker:
    def __init__(self, capital_inicial: float):
        self.capital_inicial = capital_inicial
        self.max_equity_historico = capital_inicial
        self.consecutive_api_errors = 0
        self.consecutive_invalid_json = 0
        self.consecutive_rejections = 0
        self.is_tripped = False
        self.trip_reason = ""

    def update_equity(self, current_equity: float, daily_starting_equity: float) -> Tuple[bool, str]:
        """Verifica límites de pérdida diaria (2%) y caída máxima (10%)."""
        if current_equity > self.max_equity_historico:
            self.max_equity_historico = current_equity

        # Pérdida diaria >= 2%
        daily_loss_pct = (daily_starting_equity - current_equity) / daily_starting_equity
        if daily_loss_pct >= 0.02:
            self.is_tripped = True
            self.trip_reason = f"Disyuntor activado: Pérdida diaria ({daily_loss_pct*100:.2f}%) alcanzó o superó el 2%."
            return False, self.trip_reason

        # Caída total desde máximos (Drawdown) >= 10%
        drawdown_pct = (self.max_equity_historico - current_equity) / self.max_equity_historico
        if drawdown_pct >= 0.10:
            self.is_tripped = True
            self.trip_reason = f"Disyuntor activado: Caída total ({drawdown_pct*100:.2f}%) superó el 10% desde máximos."
            return False, self.trip_reason

        return True, "Límites financieros normales."

    def record_api_error(self) -> Tuple[bool, str]:
        self.consecutive_api_errors += 1
        if self.consecutive_api_errors >= 3:
            self.is_tripped = True
            self.trip_reason = "Disyuntor activado: 3 errores consecutivos de API en Alpaca."
            return False, self.trip_reason
        return True, f"Error de API registrado ({self.consecutive_api_errors}/3)."

    def record_invalid_json(self) -> Tuple[bool, str]:
        self.consecutive_invalid_json += 1
        if self.consecutive_invalid_json >= 2:
            self.is_tripped = True
            self.trip_reason = "Disyuntor activado: 2 respuestas JSON consecutivas inválidas de la IA."
            return False, self.trip_reason
        return True, f"Respuesta inválida registrada ({self.consecutive_invalid_json}/2)."

    def record_proposal_rejection(self) -> Tuple[bool, str]:
        self.consecutive_rejections += 1
        if self.consecutive_rejections >= 5:
            self.is_tripped = True
            self.trip_reason = "Disyuntor activado: 5 propuestas consecutivas rechazadas por el motor de riesgo."
            return False, self.trip_reason
        return True, f"Rechazo registrado ({self.consecutive_rejections}/5)."

    def reset_success(self):
        """Reinicia los contadores de fallos tras una operación o respuesta exitosa."""
        self.consecutive_api_errors = 0
        self.consecutive_invalid_json = 0
        self.consecutive_rejections = 0
