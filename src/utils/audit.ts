import fs from 'fs';
import path from 'path';

export interface AuditEvent {
  timestamp: string;
  eventType: 'USER_ACTION' | 'RESEARCH_COMPLETED' | 'RISK_VALIDATION' | 'ORDER_PROPOSAL' | 'ORDER_EXECUTED' | 'EMERGENCY_STOP';
  actor: 'director' | 'market_analyst' | 'risk_manager' | 'alpaca_broker' | 'user';
  details: string;
  payload?: any;
}

export class AuditLogger {
  private logPath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.logPath = path.join(dataDir, 'audit.jsonl');
  }

  log(event: Omit<AuditEvent, 'timestamp'>) {
    const fullEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      ...event
    };

    const line = JSON.stringify(fullEvent) + '\n';
    try {
      fs.appendFileSync(this.logPath, line, 'utf8');
      console.log(`[AUDIT] [${fullEvent.eventType}] [${fullEvent.actor}] ${fullEvent.details}`);
    } catch (err) {
      console.error('Error escribiendo en log de auditoría:', err);
    }
  }
}

export const auditLogger = new AuditLogger();
