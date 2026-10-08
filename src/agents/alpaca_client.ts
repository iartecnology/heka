import axios, { AxiosInstance } from 'axios';

export interface AlpacaAccount {
  equity: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export class AlpacaClient {
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.ALPACA_API_KEY || '';
    const secretKey = process.env.ALPACA_SECRET_KEY || '';
    const baseURL = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

    this.client = axios.create({
      baseURL,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async getAccount(): Promise<AlpacaAccount> {
    const res = await this.client.get('/v2/account');
    return res.data;
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    const res = await this.client.get('/v2/positions');
    return res.data;
  }

  async getClock(): Promise<{ is_open: boolean; next_open: string; next_close: string }> {
    const res = await this.client.get('/v2/clock');
    return res.data;
  }

  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    time_in_force: 'day' | 'gtc';
    limit_price?: number;
    stop_price?: number;
    order_class?: 'simple' | 'bracket' | 'oto' | 'oco';
    take_profit?: { limit_price: number };
    stop_loss?: { stop_price: number; limit_price?: number };
  }) {
    const res = await this.client.post('/v2/orders', params);
    return res.data;
  }

  async getLatestCryptoPrice(symbol: string = 'BTC/USD'): Promise<{ price: number; open: number; high: number; low: number; timestamp: string } | null> {
    try {
      const apiKey = process.env.ALPACA_API_KEY || '';
      const secretKey = process.env.ALPACA_SECRET_KEY || '';
      const formatted = symbol.includes('/') ? symbol : `${symbol}/USD`;
      const res = await axios.get(`https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${formatted}`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': secretKey
        }
      });
      const bar = res.data?.bars?.[formatted];
      if (!bar) return null;
      return {
        price: bar.c,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        timestamp: bar.t
      };
    } catch {
      return null;
    }
  }

  async getLatestStockPrice(symbol: string): Promise<number | null> {
    try {
      const apiKey = process.env.ALPACA_API_KEY || '';
      const secretKey = process.env.ALPACA_SECRET_KEY || '';
      const res = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/bars/latest`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': secretKey
        }
      });
      return res.data?.bar?.c || null;
    } catch {
      return null;
    }
  }

  async cancelAllOrders() {
    const res = await this.client.delete('/v2/orders');
    return res.data;
  }
}
