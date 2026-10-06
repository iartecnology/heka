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
  }) {
    const res = await this.client.post('/v2/orders', params);
    return res.data;
  }

  async cancelAllOrders() {
    const res = await this.client.delete('/v2/orders');
    return res.data;
  }
}
