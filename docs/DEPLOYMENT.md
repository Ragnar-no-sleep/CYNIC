# CYNIC Deployment Guide

> Production deployment for CYNIC MCP Server

---

## Quick Start

### Local Development (Docker Compose)

```bash
# 1. Copy environment file
cp packages/mcp/.env.example .env

# 2. Set required password
echo "POSTGRES_PASSWORD=your_secure_password" >> .env

# 3. Start all services
docker-compose up -d

# 4. Check health
curl http://localhost:3000/health
```

### Render Deployment

1. Connect your GitHub repo to Render
2. Select "Blueprint" and point to `render.yaml`
3. Render will create:
   - `cynic-mcp` - Web service (Docker)
   - `cynic-db` - PostgreSQL database
   - `cynic-redis` - Redis cache

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Production Stack                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Client    │───►│  CYNIC MCP  │───►│ PostgreSQL  │        │
│   │  (Claude)   │    │   Server    │    │  (cynic-db) │        │
│   └─────────────┘    └──────┬──────┘    └─────────────┘        │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │    Redis    │                            │
│                      │   (cache)   │                            │
│                      └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MCP_MODE` | Transport mode | `http` (production) |
| `PORT` | HTTP port | `3000` |
| `CYNIC_DATABASE_URL` | PostgreSQL connection | `postgresql://...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CYNIC_REDIS_URL` | Redis connection | (memory fallback) |
| `CYNIC_LOG_LEVEL` | Log verbosity | `info` |
| `NODE_ENV` | Environment | `production` |

### Docker Compose Specific

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password (required) |
| `POSTGRES_DB` | Database name |

---

## Docker

### Build Image

```bash
docker build -f packages/mcp/Dockerfile -t cynic-mcp .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e MCP_MODE=http \
  -e CYNIC_DATABASE_URL=postgresql://... \
  cynic-mcp
```

### Multi-Stage Build

The Dockerfile uses multi-stage builds:

1. **deps** - Install production dependencies
2. **production** - Minimal runtime image

Features:
- Node.js 20 slim base
- Non-root user (`cynic`)
- Health check endpoint
- ~150MB final image

---

## Render Configuration

### render.yaml Blueprint

```yaml
services:
  - type: web
    name: cynic-mcp
    runtime: docker
    dockerfilePath: packages/mcp/Dockerfile
    healthCheckPath: /health
    autoDeploy: true

  - type: redis
    name: cynic-redis

databases:
  - name: cynic-db
    plan: starter
```

### Manual Setup

1. **Create Web Service**
   - Runtime: Docker
   - Dockerfile: `packages/mcp/Dockerfile`
   - Docker Context: `.` (root)

2. **Create PostgreSQL**
   - Plan: Starter or higher
   - Copy connection string

3. **Create Redis** (optional)
   - Plan: Starter
   - Copy connection string

4. **Set Environment Variables**
   ```
   NODE_ENV=production
   MCP_MODE=http
   PORT=3000
   CYNIC_DATABASE_URL=<from PostgreSQL>
   CYNIC_REDIS_URL=<from Redis>
   ```

5. **Configure Deploy Hook** (for CI/CD)
   - Copy deploy hook URL
   - Add as `RENDER_DEPLOY_HOOK_URL` secret in GitHub

---

## CI/CD Pipeline

### GitHub Actions

The `.github/workflows/ci.yml` pipeline:

1. **test** - Run all package tests (Node 20.x, 22.x)
2. **consensus-tests** - Multi-node integration tests
3. **lint** - ESLint checks
4. **docker** - Build Docker image
5. **deploy** - Trigger Render deploy (main branch only)

### Deployment Flow

```
Push to main
    │
    ▼
┌─────────────┐
│    Tests    │──► Fail → Stop
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│    Lint     │──► Fail → Stop
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│Docker Build │──► Fail → Stop
└──────┬──────┘
       │ Pass
       ▼
┌─────────────┐
│   Deploy    │──► Render webhook
└─────────────┘
```

---

## Health Checks

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /metrics` | Prometheus metrics |
| `GET /dashboard` | HTML status page |

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health')..."
```

### Render Health Check

```yaml
healthCheckPath: /health
```

---

## Monitoring

### Prometheus Metrics

Scrape endpoint: `GET /metrics`

Key metrics:
- `cynic_judgments_total{verdict}`
- `cynic_avg_q_score`
- `cynic_active_sessions`
- `cynic_poj_chain_height`
- `cynic_uptime_seconds`

### Grafana Dashboard

Import the dashboard from `/docs/grafana-dashboard.json` (if available).

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs cynic-mcp

# Common issues:
# - Missing CYNIC_DATABASE_URL
# - PostgreSQL not ready (use depends_on with healthcheck)
# - Port already in use
```

### Database Connection Failed

```bash
# Test connection
psql $CYNIC_DATABASE_URL -c "SELECT 1"

# Check if migrations ran
psql $CYNIC_DATABASE_URL -c "\dt cynic_*"
```

### Health Check Failing

```bash
# Test locally
curl -v http://localhost:3000/health

# Check inside container
docker exec cynic-mcp node -e "console.log('ok')"
```

### Memory Issues

- Increase container memory limit
- Check for memory leaks with `--inspect`
- Consider Redis for session caching

---

## Packages Included

| Package | Description |
|---------|-------------|
| `@cynic/core` | φ constants, types |
| `@cynic/protocol` | Consensus protocol |
| `@cynic/node` | Judge, agents, burns |
| `@cynic/persistence` | Database repositories |
| `@cynic/holdex` | HolDex K-Score integration |
| `@cynic/gasdf` | GASdf gasless transactions |
| `@cynic/zk` | Zero-knowledge proofs |
| `@cynic/mcp` | MCP server |

---

## Security Considerations

1. **Non-root user** - Container runs as `cynic` user
2. **No secrets in code** - Use environment variables
3. **Internal networks** - Redis/PostgreSQL not exposed publicly
4. **Health checks** - Automatic restart on failure
5. **φ⁻¹ confidence** - Never claim certainty

---

*"Loyal to truth, not to comfort"* - κυνικός
