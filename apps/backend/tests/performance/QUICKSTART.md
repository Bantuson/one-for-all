# Performance Testing Quick Start

## 5-Minute Setup

```bash
# 1. Install dependencies
cd apps/backend
source .venv/bin/activate
pip install -e ".[dev]"

# 2. Start local API (in one terminal)
python -m uvicorn one_for_all.api.app:app --reload

# 3. Run Locust (in another terminal)
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

Then open http://localhost:8089 and configure:
- **Number of users**: 10
- **Spawn rate**: 2 users/second
- Click "Start Swarming"

## Quick Commands

### Test Against Localhost
```bash
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

### Test Against Staging (Headless)
```bash
export STAGING_API_URL="https://your-app.onrender.com"
export STAGING_API_KEY="your-api-key"

locust -f tests/performance/locustfile.py \
    --headless \
    --users 10 \
    --spawn-rate 2 \
    --run-time 60s \
    --host $STAGING_API_URL
```

### Quick Smoke Test
```bash
# 5 users for 30 seconds
locust -f tests/performance/locustfile.py \
    --headless --users 5 --spawn-rate 1 --run-time 30s \
    --host http://localhost:8000
```

## Understanding User Types

The test suite runs **4 different user types simultaneously**:

1. **APIUser** (Read-heavy)
   - Health checks, list applications, status queries
   - 1-3 second wait between requests

2. **SubmissionUser** (Write-heavy)
   - Application submissions with full payloads
   - 5-10 second wait between submissions
   - Uses TEST- prefix for all data

3. **LegacyAPIUser** (CrewAI)
   - Legacy `/api/applications/*` endpoints
   - 3-7 second wait between requests

4. **HealthMonitor** (High-frequency)
   - Constant health checks
   - 0.5-2 second wait between checks

## Reading Results

### Key Metrics to Watch

```
Requests/sec:    100    ← Total throughput
Failures:        0.5%   ← Should be < 1%
Response Times:
  - p50:    120ms       ← Median (should be < 200ms)
  - p95:    350ms       ← 95th percentile (should be < 500ms)
  - p99:    800ms       ← 99th percentile (should be < 1000ms)
```

### Is My API Performing Well?

✅ **GOOD**: p95 < 500ms for reads, < 2000ms for writes, failures < 1%
⚠️ **DEGRADED**: p95 500-1000ms for reads, 2000-5000ms for writes, failures 1-5%
❌ **POOR**: p95 > 1000ms for reads, > 5000ms for writes, failures > 5%

## Common Issues

**Can't import locust**
```bash
pip install -e ".[dev]"
```

**Connection refused**
```bash
# Start the API first
python -m uvicorn one_for_all.api.app:app --reload
```

**All 401 errors**
```bash
export STAGING_API_KEY="your-api-key"
```

## Next Steps

See [README.md](./README.md) for:
- Detailed user type explanations
- Advanced test scenarios
- CI/CD integration examples
- Troubleshooting guide
