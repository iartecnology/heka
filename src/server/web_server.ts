import http from 'http';
import fs from 'fs';
import path from 'path';
import { AlpacaClient } from '../agents/alpaca_client';

export interface AgentTelemetry {
  director: { status: string; activity: string; lastUpdated: string };
  analyst: { status: string; activity: string; lastUpdated: string };
  risk: { status: string; activity: string; lastUpdated: string };
  broker: { status: string; activity: string; lastUpdated: string };
}

export const agentState: AgentTelemetry = {
  director: {
    status: 'ACTIVO',
    activity: '[ORQUESTADOR] Supervisando consenso y evaluando condiciones de Wall Street.',
    lastUpdated: new Date().toISOString()
  },
  analyst: {
    status: 'ESCANEANDO',
    activity: '[INTELIGENCIA] Monitoreando noticias de Alpaca y múltiplos fundamentales en Yahoo Finance.',
    lastUpdated: new Date().toISOString()
  },
  risk: {
    status: 'BLINDADO',
    activity: '[RADAR DE RIESGO] Trailing stops vigilados. Efectivo líquido >66% garantizado.',
    lastUpdated: new Date().toISOString()
  },
  broker: {
    status: 'EN ESPERA',
    activity: '[BROKER] Cuenta Alpaca Paper activa. Esperando aprobaciones tácticas.',
    lastUpdated: new Date().toISOString()
  }
};

export function updateAgentActivity(agent: keyof AgentTelemetry, activity: string, status: string = 'ACTIVO') {
  agentState[agent] = {
    status,
    activity,
    lastUpdated: new Date().toISOString()
  };
}

export function startWebServer(alpaca: AlpacaClient, port: number = 3000) {
  const publicDir = path.resolve(process.cwd(), 'public');
  const dataDir = path.resolve(process.cwd(), 'data');
  const auditFile = path.join(dataDir, 'audit.jsonl');

  const server = http.createServer(async (req, res) => {
    // 0. API: Telemetría de Agentes en tiempo real
    if (req.url === '/api/agents') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agentState));
      return;
    }
    // 1. API: Estado del sistema y métricas
    if (req.url === '/api/status') {
      try {
        const account = await alpaca.getAccount();
        const positions = await alpaca.getPositions();
        const clock = await alpaca.getClock();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          marketOpen: clock.is_open,
          account,
          positions,
          positionsCount: positions.length,
          timestamp: new Date().toISOString()
        }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
      return;
    }

    // 1.1 API: Kill-Switch de Emergencia desde la Web
    if (req.url === '/api/panic' && req.method === 'POST') {
      try {
        await alpaca.cancelAllOrders();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Kill switch triggered' }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
      return;
    }

    // 2. API: Historial de Logs ordenados
    if (req.url === '/api/logs') {
      try {
        if (!fs.existsSync(auditFile)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        const lines = fs.readFileSync(auditFile, 'utf8')
          .trim()
          .split('\n')
          .filter(l => l.length > 0);

        const logs = lines
          .map(l => {
            try { return JSON.parse(l); } catch { return null; }
          })
          .filter(Boolean)
          .reverse(); // Los más recientes primero

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
      return;
    }

    // 3. Servir interfaz HTML estática
    const filePath = req.url === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, req.url || '');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes: { [k: string]: string } = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`🌐 [HEKA] Panel de estado y auditoría disponible en: http://localhost:${port}`);
  });

  return server;
}
