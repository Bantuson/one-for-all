# Performance Testing Suite

This directory contains Locust-based performance tests for the One For All Backend API.

## Overview

The performance test suite simulates realistic API usage patterns across multiple user types:

1. **APIUser** - Read-heavy operations (health checks, list applications, status queries)
2. **SubmissionUser** - Application submission workflows with realistic payloads
3. **LegacyAPIUser** - CrewAI tools using legacy API endpoints
4. **HealthMonitor** - High-frequency health monitoring (load balancers, uptime monitors)

## Prerequisites

Install Locust in the development environment:

```bash
cd apps/backend
source .venv/bin/activate
pip install -e ".[dev]"  # Installs locust>=2.0.0
```

## Running Tests

### Local Development

Test against local backend server:

```bash
# Start the backend API first
python -m uvicorn one_for_all.api.app:app --reload

# In another terminal, run Locust
cd apps/backend
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

Then open http://localhost:8089 in your browser to access the Locust web UI.

### Staging Environment

Test against Render staging deployment:

```bash
# Set environment variables
export STAGING_API_URL="https://one-for-all-staging.onrender.com"
export STAGING_API_KEY="your-staging-api-key"

# Run with web UI
locust -f tests/performance/locustfile.py --host=$STAGING_API_URL

# Run headless (CI/CD)
locust -f tests/performance/locustfile.py \
    --headless \
    --users 10 \
    --spawn-rate 2 \
    --run-time 60s \
    --host $STAGING_API_URL
```

### Custom Test Scenarios

```bash
# High load test (100 concurrent users, 5-minute run)
locust -f tests/performance/locustfile.py \
    --headless \
    --users 100 \
    --spawn-rate 10 \
    --run-time 300s \
    --host $STAGING_API_URL

# Spike test (rapid user spawn)
locust -f tests/performance/locustfile.py \
    --headless \
    --users 50 \
    --spawn-rate 50 \
    --run-time 120s \
    --host $STAGING_API_URL

# Endurance test (24-hour sustained load)
locust -f tests/performance/locustfile.py \
    --headless \
    --users 20 \
    --spawn-rate 2 \
    --run-time 24h \
    --host $STAGING_API_URL
```

## User Types Explained

### APIUser (Read-Heavy)
- **Weight Distribution**: Health (50%), List Applications (25%), Get Status (15%), Docs (10%)
- **Wait Time**: 1-3 seconds between requests
- **Use Case**: Dashboard users, monitoring tools

### SubmissionUser (Write-Heavy)
- **Weight Distribution**: Application submission (100%)
- **Wait Time**: 5-10 seconds between submissions
- **Use Case**: Real applicants submitting applications
- **Test Data**: All submissions prefixed with `TEST-` for easy identification

### LegacyAPIUser (CrewAI Tools)
- **Weight Distribution**: Submit (60%), Status Check (40%)
- **Wait Time**: 3-7 seconds between requests
- **Use Case**: CrewAI agents using non-versioned `/api/applications/*` endpoints

### HealthMonitor (High-Frequency)
- **Weight Distribution**: Basic Health (70%), Database Health (30%)
- **Wait Time**: 0.5-2 seconds between checks
- **Use Case**: Load balancers, uptime monitors, alerting systems

## Understanding Results

### Key Metrics

- **RPS (Requests Per Second)**: Total request throughput
- **Response Time (ms)**:
  - p50 (median): 50% of requests complete in this time
  - p95: 95% of requests complete in this time
  - p99: 99% of requests complete in this time
- **Failure Rate**: Percentage of failed requests
- **User Count**: Number of concurrent simulated users

### Success Criteria

✅ **Good Performance**:
- p95 response time < 500ms for read operations
- p95 response time < 2000ms for write operations
- Failure rate < 1%
- RPS scales linearly with user count (up to capacity)

⚠️ **Degraded Performance**:
- p95 response time 500-1000ms for reads
- p95 response time 2000-5000ms for writes
- Failure rate 1-5%

❌ **Poor Performance**:
- p95 response time > 1000ms for reads
- p95 response time > 5000ms for writes
- Failure rate > 5%

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, staging]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd apps/backend
          pip install -e ".[dev]"

      - name: Run Locust tests
        env:
          STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
          STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}
        run: |
          cd apps/backend
          locust -f tests/performance/locustfile.py \
            --headless \
            --users 20 \
            --spawn-rate 5 \
            --run-time 300s \
            --host $STAGING_API_URL \
            --csv=performance-results \
            --html=performance-results.html

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: apps/backend/performance-results*
```

## Troubleshooting

### Common Issues

**Problem**: `ImportError: No module named 'locust'`
```bash
# Solution: Install dev dependencies
pip install -e ".[dev]"
```

**Problem**: All requests return 401 Unauthorized
```bash
# Solution: Set API key environment variable
export STAGING_API_KEY="your-api-key"
```

**Problem**: Connection refused to localhost:8000
```bash
# Solution: Start the backend API first
python -m uvicorn one_for_all.api.app:app --reload
```

**Problem**: High failure rate in staging
```bash
# Check backend logs in Render dashboard
# Verify API key is correct
# Ensure database is accessible
# Check rate limiting configuration
```

## Best Practices

1. **Start Small**: Begin with 10 users and gradually increase
2. **Test Incrementally**:
   - Smoke test: 1-5 users, 1 minute
   - Load test: 10-50 users, 5 minutes
   - Stress test: 50-200 users, 10 minutes
   - Spike test: 1→100 users in 10 seconds
3. **Use Test Data**: All submissions use `TEST-` prefix for easy cleanup
4. **Monitor Resources**: Watch CPU, memory, and database connections in Render
5. **Set Baselines**: Record metrics after each deployment for comparison
6. **Run Regularly**: Schedule daily performance tests in CI/CD

## Test Data Cleanup

Test submissions are prefixed with `TEST-` for easy identification. To clean up:

```sql
-- Delete test applications
DELETE FROM applications
WHERE university_name LIKE 'TEST-%'
   OR personal_info->>'email' LIKE 'test-%@example.com';

-- Delete test sessions
DELETE FROM applicant_sessions
WHERE session_token LIKE 'TEST-%';
```

## Next Steps

- [ ] Add database query performance monitoring
- [ ] Implement custom Locust events for detailed metrics
- [ ] Add distributed load testing support
- [ ] Create performance regression tests
- [ ] Set up Grafana dashboards for result visualization
