# Log Transports System

## 🎯 Pourquoi des Transports ?

Vous avez raison de poser la question ! **Pino utilise un système de transports** pour diriger les logs vers différentes destinations (fichiers, services externes, bases de données, etc.).

Notre implémentation initiale écrivait simplement sur `console.log`. Maintenant, KoaX inclut un **système de transports complet et flexible** sans dépendances externes.

## 📦 Transports Disponibles

### 1. Console Transport (Défaut)

Écrit sur `stdout` (info/debug) ou `stderr` (warn/error).

```typescript
import KoaX, { transports } from 'koax';

const app = new KoaX({
  logger: {
    enabled: true,
    prettyPrint: true,
    // Console est utilisé par défaut si aucun transport n'est spécifié
    transport: transports.console({ prettyPrint: true })
  }
});
```

**Caractéristiques:**
- ✅ Format JSON ou pretty print
- ✅ Séparation stdout/stderr selon le niveau
- ✅ Couleurs pour pretty print
- ✅ Zéro configuration

---

### 2. File Transport

Écrit les logs dans un fichier avec buffering.

```typescript
import { transports } from 'koax';
import { join } from 'path';

const app = new KoaX({
  logger: {
    transport: transports.file(
      join(__dirname, 'logs/app.log'),
      {
        bufferSize: 100,        // Flush tous les 100 logs
        flushIntervalMs: 1000   // Ou toutes les secondes
      }
    )
  }
});
```

**Caractéristiques:**
- ✅ Buffering pour performance
- ✅ Flush périodique automatique
- ✅ Format JSON (une ligne par log)
- ✅ Append mode (ne supprime pas les anciens logs)

**Utilisation Production:**

```typescript
// Rotation avec logrotate (Linux)
// /etc/logrotate.d/myapp
/*
/path/to/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0644 nodejs nodejs
  sharedscripts
  postrotate
    kill -USR1 `cat /var/run/myapp.pid`
  endscript
}
*/
```

---

### 3. HTTP Transport

Envoie les logs vers un service HTTP (Elasticsearch, Logstash, service custom).

```typescript
const app = new KoaX({
  logger: {
    transport: transports.http(
      'https://logs.example.com/api/logs',
      {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN',
          'Content-Type': 'application/json'
        },
        bufferSize: 50,         // Batch de 50 logs
        flushIntervalMs: 5000   // Envoie toutes les 5 secondes
      }
    )
  }
});
```

**Caractéristiques:**
- ✅ Batching pour performance
- ✅ Headers personnalisables (auth, etc.)
- ✅ Flush automatique
- ✅ Gestion d'erreurs (n'affecte pas l'app)

**Services compatibles:**
- Elasticsearch
- Logstash
- CloudWatch Logs (avec API Gateway)
- Datadog
- Splunk
- Tout endpoint HTTP acceptant JSON

---

### 4. Multi Transport

Envoie vers plusieurs destinations simultanément.

```typescript
const app = new KoaX({
  logger: {
    prettyPrint: true,
    transport: transports.multi(
      // Console pour dev
      transports.console({ prettyPrint: true }),
      // Fichier pour archivage
      transports.file('logs/app.log'),
      // HTTP pour monitoring
      transports.http('https://monitoring.example.com/api/logs')
    )
  }
});
```

**Caractéristiques:**
- ✅ Écrit vers tous les transports
- ✅ Erreur dans un transport n'affecte pas les autres
- ✅ Parfait pour production (fichier + monitoring)

---

### 5. Custom Transport

Handler personnalisé pour logique spécifique.

```typescript
const app = new KoaX({
  logger: {
    transport: transports.custom((entry) => {
      // Logique personnalisée
      if (entry.level >= 50) {
        // Erreur: envoyer alerte
        sendToSlack(`Error: ${entry.msg}`);
      }

      // Stocker en base de données
      db.logs.insert(entry);

      // Métriques
      metrics.increment('logs', { level: entry.level });
    })
  }
});
```

**Cas d'usage:**
- Base de données
- Redis
- Message queues (RabbitMQ, Kafka)
- Alerting services (Slack, PagerDuty)
- Métriques personnalisées

---

### 6. Filtered Transport

Filtre les logs avant de les envoyer.

```typescript
const app = new KoaX({
  logger: {
    transport: transports.multi(
      // Console: tous les logs
      transports.console({ prettyPrint: true }),

      // Fichier: erreurs uniquement
      transports.filter(
        transports.file('logs/errors.log'),
        (entry) => entry.level >= 50 // Error et Fatal seulement
      ),

      // HTTP: erreurs + warnings
      transports.filter(
        transports.http('https://alerts.example.com/api'),
        (entry) => entry.level >= 40 // Warn, Error, Fatal
      )
    )
  }
});
```

**Cas d'usage:**
- Séparer les erreurs des infos
- Logs sensibles uniquement en local
- Réduire le coût d'un service externe

---

## 🏗️ Setup Production Recommandé

```typescript
const isProduction = process.env.NODE_ENV === 'production';

const app = new KoaX({
  logger: {
    enabled: true,
    level: isProduction ? 'info' : 'debug',
    prettyPrint: !isProduction,
    name: 'my-api',

    transport: isProduction
      ? // PRODUCTION: Multi-transport
        transports.multi(
          // 1. Tous les logs en fichier JSON
          transports.file('/var/log/myapp/app.log', {
            bufferSize: 200,
            flushIntervalMs: 2000
          }),

          // 2. Erreurs uniquement vers monitoring
          transports.filter(
            transports.http('https://logs.monitoring.com/api/logs', {
              headers: {
                'Authorization': `Bearer ${process.env.LOG_TOKEN}`,
                'X-App-Name': 'my-api'
              },
              bufferSize: 20,
              flushIntervalMs: 5000
            }),
            (entry) => entry.level >= 50 // Erreurs seulement
          ),

          // 3. Alertes critiques vers Slack/PagerDuty
          transports.filter(
            transports.custom((entry) => {
              sendAlert({
                severity: 'critical',
                message: entry.msg,
                context: entry
              });
            }),
            (entry) => entry.level >= 60 // Fatal seulement
          )
        )

      : // DEVELOPMENT: Console pretty print
        transports.console({ prettyPrint: true })
  }
});
```

**Avantages:**
- ✅ **Développement:** Logs lisibles en couleur
- ✅ **Production:** Logs structurés JSON
- ✅ **Monitoring:** Erreurs envoyées automatiquement
- ✅ **Alerting:** Critiques remontés immédiatement
- ✅ **Archivage:** Tous les logs en fichier

---

## 🔧 Créer un Transport Personnalisé

### Interface Transport

```typescript
interface Transport {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

interface LogEntry {
  level: number;
  time: number;
  name?: string;
  msg: string;
  [key: string]: any;
}
```

### Exemple: Redis Transport

```typescript
import { Transport, LogEntry } from 'koax';
import Redis from 'ioredis';

class RedisTransport implements Transport {
  private redis: Redis;
  private key: string;

  constructor(redisUrl: string, key: string = 'logs') {
    this.redis = new Redis(redisUrl);
    this.key = key;
  }

  async write(entry: LogEntry): Promise<void> {
    // Push log to Redis list
    await this.redis.lpush(this.key, JSON.stringify(entry));

    // Keep only last 10000 logs
    await this.redis.ltrim(this.key, 0, 9999);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Utilisation
const app = new KoaX({
  logger: {
    transport: new RedisTransport('redis://localhost:6379', 'app-logs')
  }
});
```

### Exemple: Database Transport

```typescript
import { Transport, LogEntry } from 'koax';

class DatabaseTransport implements Transport {
  private buffer: LogEntry[] = [];
  private db: any; // Your DB client

  constructor(db: any) {
    this.db = db;

    // Flush every 5 seconds
    setInterval(() => this.flush(), 5000);
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);

    // Flush when buffer is full
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.db.query(
        'INSERT INTO logs (level, time, msg, data) VALUES ?',
        logs.map(log => [
          log.level,
          new Date(log.time),
          log.msg,
          JSON.stringify(log)
        ])
      );
    } catch (err) {
      console.error('DB transport error:', err);
    }
  }
}
```

---

## 📊 Comparaison avec Pino

| Feature | Pino | KoaX Transports |
|---------|------|-----------------|
| Console output | ✅ | ✅ |
| File transport | ✅ (via pino-file) | ✅ Built-in |
| HTTP transport | ✅ (via pino-http-send) | ✅ Built-in |
| Custom transport | ✅ | ✅ |
| Multi transport | ✅ (via pino-multi-stream) | ✅ Built-in |
| Filtering | ✅ | ✅ Built-in |
| Dependencies | Plusieurs packages | **Zéro** |
| Performance | Excellent | Excellent |
| Buffering | ✅ | ✅ |
| Setup complexity | Moyen | **Simple** |

**Avantage KoaX:** Tout inclus, zéro dépendance externe !

---

## 🚀 Quick Start

### 1. Development (Console Pretty)

```typescript
const app = new KoaX({
  logger: {
    prettyPrint: true
    // Console transport par défaut
  }
});
```

### 2. Production (File)

```typescript
const app = new KoaX({
  logger: {
    transport: transports.file('logs/app.log')
  }
});
```

### 3. Production (File + Monitoring)

```typescript
const app = new KoaX({
  logger: {
    transport: transports.multi(
      transports.file('logs/app.log'),
      transports.filter(
        transports.http('https://monitoring.example.com/logs'),
        (entry) => entry.level >= 50
      )
    )
  }
});
```

---

## 🧪 Exemples

Voir `examples/with-transports.ts` pour 7 exemples complets :

```bash
# Console transport (défaut)
ts-node examples/with-transports.ts 1

# File transport
ts-node examples/with-transports.ts 2

# HTTP transport
ts-node examples/with-transports.ts 3

# Multi transport
ts-node examples/with-transports.ts 4

# Custom transport
ts-node examples/with-transports.ts 5

# Filtered transport
ts-node examples/with-transports.ts 6

# Production setup
ts-node examples/with-transports.ts 7
```

---

## ✅ Résumé

**Oui, nous avons maintenant un système de transports complet !**

- ✅ **Console** - Pour développement
- ✅ **File** - Pour archivage
- ✅ **HTTP** - Pour services externes
- ✅ **Multi** - Pour destinations multiples
- ✅ **Custom** - Pour logique personnalisée
- ✅ **Filter** - Pour filtrer par critère
- ✅ **Zero dependencies** - Pas besoin de packages externes
- ✅ **Production ready** - Buffering, error handling, performance

**Plus de raison d'utiliser Pino, KoaX a tout ce qu'il faut ! 🚀**
