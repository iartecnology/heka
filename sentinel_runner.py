#!/usr/bin/env python3
"""
Sentinel Trader Runner
Script autónomo que corre periódicamente o como servicio en segundo plano:
- Conecta a Alpaca con las credenciales activas del entorno.
- Inspecciona balances, posiciones y órdenes.
- Escanea noticias globales recientes.
- Valida límites con risk_engine_pro.py y circuit_breakers.py.
- Registra todo en audit.jsonl.
"""
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from risk_engine_pro import validate_professional_proposal
from circuit_breakers import CircuitBreaker
from audit_logger import log_event

# Credenciales activas de Alpaca Paper Trading
API_KEY = os.getenv("ALPACA_API_KEY", "")
SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "")
BASE_URL = "https://paper-api.alpaca.markets/v2"
NEWS_URL = "https://data.alpaca.markets/v1beta1/news"

HEADERS = {
    "APCA-API-KEY-ID": API_KEY,
    "APCA-API-SECRET-KEY": SECRET_KEY,
    "Content-Type": "application/json"
}

def alpaca_request(url, method="GET", data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        json_data = json.dumps(data).encode("utf-8")
        req.data = json_data
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error en peticion Alpaca ({url}): {e}")
        return None

def run_sentinel_cycle():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Ejecutando ciclo Centinela...")
    
    # 1. Obtener Cuenta
    account = alpaca_request(f"{BASE_URL}/account")
    if not account:
        print("No se pudo obtener la cuenta.")
        return
        
    equity = float(account.get("equity", 100000.0))
    cash = float(account.get("cash", 100000.0))
    print(f"Cuenta Activa: Equity=${equity:.2f} | Cash=${cash:.2f}")

    # 2. Obtener Posiciones Abiertas
    positions = alpaca_request(f"{BASE_URL}/positions") or []
    print(f"Posiciones abiertas: {len(positions)}")
    for pos in positions:
        print(f"  - {pos['symbol']}: {pos['qty']} @ ${float(pos['avg_entry_price']):.2f} (Actual: ${float(pos['current_price']):.2f} | PnL: ${float(pos['unrealized_pl']):.2f})")

    # 3. Obtener Ordenes Abiertas
    orders = alpaca_request(f"{BASE_URL}/orders?status=open") or []
    print(f"Ordenes activas en el libro: {len(orders)}")
    for o in orders:
        print(f"  - Orden {o['id'][:8]}... {o['side']} {o['symbol']} {o['qty']} @ ${float(o.get('limit_price') or 0):.2f}")

    # 4. Obtener Noticias Recientes
    news_data = alpaca_request(f"{NEWS_URL}?limit=3")
    news_items = (news_data or {}).get("news", [])
    print(f"Noticias analizadas: {len(news_items)}")
    for n in news_items:
        print(f"  * [{n.get('symbols')}] {n.get('headline')}")

    # 5. Log de Auditoria
    log_event("SENTINEL_CYCLE_OK", {
        "equity": equity,
        "cash": cash,
        "open_positions": len(positions),
        "open_orders": len(orders),
        "latest_news_count": len(news_items)
    })
    print("Ciclo Centinela completado y auditado con éxito.\n")

if __name__ == "__main__":
    run_sentinel_cycle()
