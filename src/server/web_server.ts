import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { AlpacaClient } from '../agents/alpaca_client';

const execFilePromise = util.promisify(execFile);

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

    // 1.2 API: Modelos disponibles de OpenCode para pruebas
    if (req.url === '/api/opencode/models' && req.method === 'GET') {
      const models = [
        { id: 'opencode/big-pickle', name: '🥒 Big Pickle (200k tokens - CoT Profundo)' },
        { id: 'opencode/mimo-v2.6-flash-free', name: '⚡ Mimo Flash Free (Ultrarrápido)' },
        { id: 'opencode/nemotron-3.5-lightning-free', name: '⚡ Nemotron 3.5 Lightning Free' },
        { id: 'opencode/ling-3.1-flash-free', name: '⚡ Ling 3.1 Flash Free' },
        { id: 'opencode/exo-free', name: '⚡ Exo Free' }
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models }));
      return;
    }

    // 1.3 API: Chat de prueba puro (Raw Prompt - sin prompt de sistema precargado)
    if (req.url === '/api/opencode/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const prompt = parsed.prompt?.trim();
          const selectedModel = parsed.model || 'opencode/mimo-v2.6-flash-free';

          if (!prompt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'El prompt no puede estar vacío.' }));
            return;
          }

          const startTime = Date.now();
          console.log(`🧪 [TEST CHAT] Invocando ${selectedModel} con prompt puro: "${prompt.slice(0, 100)}..."`);
          
          const rawModel = selectedModel.replace('opencode/', '');

          // 1. Crear sesión rápida en el servidor OpenCode local
          const sessionRes = await fetch('http://127.0.0.1:4096/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });

          if (!sessionRes.ok) {
            throw new Error(`No se pudo crear sesión en el servidor OpenCode: ${sessionRes.statusText}`);
          }

          const sessionData: any = await sessionRes.json();
          const sessionId = sessionData.id;

          // 2. Enviar prompt directo sin nada precargado
          const msgRes = await fetch(`http://127.0.0.1:4096/session/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: { providerID: 'opencode', modelID: rawModel },
              parts: [{ type: 'text', text: prompt }]
            })
          });

          if (!msgRes.ok) {
            throw new Error(`Error en el modelo: ${msgRes.statusText}`);
          }

          const msgData: any = await msgRes.json();
          const textResponse = (msgData.parts || [])
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n')
            .trim();

          const duration = ((Date.now() - startTime) / 1000).toFixed(2);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            response: textResponse || '(Sin respuesta de texto)',
            duration: Number(duration),
            model: selectedModel
          }));
        } catch (err: any) {
          console.error(`❌ [TEST CHAT ERROR] ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: err.message || 'Error al ejecutar el modelo'
          }));
        }
      });
      return;
    }

    // 2. API: Historial de Logs ordenados con soporte para filtros y exportación
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (parsedUrl.pathname === '/api/logs') {
      // 2.1 Limpiar bitácora
      if (req.method === 'DELETE') {
        try {
          if (fs.existsSync(auditFile)) {
            fs.writeFileSync(auditFile, '', 'utf8');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', message: 'Bitácora limpiada exitosamente' }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: err.message }));
        }
        return;
      }

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

        let logs = lines
          .map(l => {
            try { return JSON.parse(l); } catch { return null; }
          })
          .filter(Boolean)
          .reverse(); // Los más recientes primero

        const filterActor = parsedUrl.searchParams.get('actor');
        const filterType = parsedUrl.searchParams.get('type');
        const query = parsedUrl.searchParams.get('q')?.toLowerCase();

        if (filterActor && filterActor !== 'ALL') {
          logs = logs.filter(l => l.actor === filterActor);
        }
        if (filterType && filterType !== 'ALL') {
          logs = logs.filter(l => l.eventType === filterType);
        }
        if (query) {
          logs = logs.filter(l => 
            (l.details && l.details.toLowerCase().includes(query)) ||
            (l.actor && l.actor.toLowerCase().includes(query)) ||
            (l.eventType && l.eventType.toLowerCase().includes(query))
          );
        }

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
