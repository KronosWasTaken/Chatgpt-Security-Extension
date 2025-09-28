# Metrics Calculation System

## Overview

The metrics in your application are calculated dynamically from the database data rather than being hardcoded. This document explains how each metric is calculated and provides options for optimization.

## Current Metrics

### 1. Apps Monitored
**Definition**: Number of unique AI services being monitored for a client

**Calculation**:
```sql
SELECT COUNT(DISTINCT id) 
FROM client_ai_services 
WHERE client_id = ?
```

**Real Implementation**:
```python
async def _calculate_apps_monitored(self, client_id: str) -> int:
    query = select(func.count(ClientAIServices.id.distinct())).where(
        ClientAIServices.client_id == client_id
    )
    result = await self.session.execute(query)
    return result.scalar() or 0
```

### 2. Interactions Monitored
**Definition**: Total daily interactions across all AI services

**Calculation**:
```sql
-- Department interactions
SELECT SUM(interactions) 
FROM department_engagement 
WHERE client_id = ? AND date = ?

-- Application interactions  
SELECT SUM(interactions_per_day) 
FROM application_engagement 
WHERE client_id = ? AND date = ?

-- Total = Department + Application
```

**Real Implementation**:
```python
async def _calculate_interactions_monitored(self, client_id: str, target_date: date) -> int:
    # Department interactions
    dept_query = select(func.sum(DepartmentEngagement.interactions)).where(
        and_(
            DepartmentEngagement.client_id == client_id,
            DepartmentEngagement.date == target_date
        )
    )
    dept_result = await self.session.execute(dept_query)
    dept_interactions = dept_result.scalar() or 0
    
    # Application interactions
    app_query = select(func.sum(ApplicationEngagement.interactions_per_day)).where(
        and_(
            ApplicationEngagement.client_id == client_id,
            ApplicationEngagement.date == target_date
        )
    )
    app_result = await self.session.execute(app_query)
    app_interactions = app_result.scalar() or 0
    
    return dept_interactions + app_interactions
```

### 3. Agents Deployed
**Definition**: Number of active AI agents deployed

**Calculation**:
```sql
SELECT COUNT(*) 
FROM agent_engagement 
WHERE client_id = ? AND deployed > 0
```

**Real Implementation**:
```python
async def _calculate_agents_deployed(self, client_id: str) -> int:
    query = select(func.count(AgentEngagement.id)).where(
        and_(
            AgentEngagement.client_id == client_id,
            AgentEngagement.deployed > 0
        )
    )
    result = await self.session.execute(query)
    return result.scalar() or 0
```

### 4. Risk Score
**Definition**: Calculated risk score based on alerts and unsanctioned usage

**Calculation**:
```
Base Risk = 0
+ High severity alerts (last 30 days) × 25 points
+ Medium severity alerts (last 30 days) × 15 points  
+ Unsanctioned AI services × 20 points
= Min(Total Risk, 100)
```

**Real Implementation**:
```python
async def _calculate_risk_score(self, client_id: str, target_date: date) -> float:
    base_risk = 0.0
    
    # High severity alerts
    high_alerts_query = select(func.count(Alert.id)).where(
        and_(
            Alert.client_id == client_id,
            Alert.severity == "High",
            Alert.created_at >= target_date - timedelta(days=30)
        )
    )
    high_alerts_result = await self.session.execute(high_alerts_query)
    high_alerts = high_alerts_result.scalar() or 0
    base_risk += high_alerts * 25
    
    # Medium severity alerts
    medium_alerts_query = select(func.count(Alert.id)).where(
        and_(
            Alert.client_id == client_id,
            Alert.severity == "Medium",
            Alert.created_at >= target_date - timedelta(days=30)
        )
    )
    medium_alerts_result = await self.session.execute(medium_alerts_query)
    medium_alerts = medium_alerts_result.scalar() or 0
    base_risk += medium_alerts * 15
    
    # Unsanctioned services
    unsanctioned_query = select(func.count(ClientAIServices.id)).where(
        and_(
            ClientAIServices.client_id == client_id,
            ClientAIServices.status == "Unsanctioned"
        )
    )
    unsanctioned_result = await self.session.execute(unsanctioned_query)
    unsanctioned_count = unsanctioned_result.scalar() or 0
    base_risk += unsanctioned_count * 20
    
    return min(base_risk, 100.0)
```

### 5. Compliance Coverage
**Definition**: Percentage of AI services that are properly permitted

**Calculation**:
```sql
SELECT 
  (COUNT(CASE WHEN status = 'Permitted' THEN 1 END) / COUNT(*)) * 100
FROM client_ai_services 
WHERE client_id = ?
```

**Real Implementation**:
```python
async def _calculate_compliance_coverage(self, client_id: str) -> float:
    # Total services
    total_services_query = select(func.count(ClientAIServices.id)).where(
        ClientAIServices.client_id == client_id
    )
    total_result = await self.session.execute(total_services_query)
    total_services = total_result.scalar() or 0
    
    if total_services == 0:
        return 0.0
    
    # Permitted services
    permitted_services_query = select(func.count(ClientAIServices.id)).where(
        and_(
            ClientAIServices.client_id == client_id,
            ClientAIServices.status == "Permitted"
        )
    )
    permitted_result = await self.session.execute(permitted_services_query)
    permitted_services = permitted_result.scalar() or 0
    
    coverage = (permitted_services / total_services) * 100
    return round(coverage, 1)
```

## Implementation Options

### Option 1: Real-time Calculation (Current)
**Pros**:
- Always up-to-date
- No background processing needed
- Simple implementation

**Cons**:
- Higher database load
- Slower API responses
- Multiple queries per request

**Usage**:
```python
# In API endpoints
calculator = MetricsCalculator(session)
metrics = await calculator.calculate_client_metrics(client_id)
```

### Option 2: Background Calculation (Recommended for Production)
**Pros**:
- Faster API responses
- Lower database load
- Can be cached/optimized

**Cons**:
- Slight delay in updates
- Requires background processing
- More complex setup

**Usage**:
```bash
# Update metrics manually
uv run python scripts/update_metrics.py

# Or set up cron job for automatic updates
# 0 * * * * cd /path/to/backend && uv run python scripts/update_metrics.py
```

## Files Created

1. **`app/services/metrics_calculator.py`** - Core calculation logic
2. **`app/services/metrics_updater.py`** - Background update service
3. **`scripts/demo_metrics_calculation.py`** - Demo script
4. **`scripts/update_metrics.py`** - Manual update script

## Testing the Calculation

```bash
# Run demo to see how metrics are calculated
cd backend
uv run python scripts/demo_metrics_calculation.py

# Update all client metrics
uv run python scripts/update_metrics.py
```

## Customization

You can easily modify the calculation logic by editing the methods in `MetricsCalculator`:

- **Risk Score**: Adjust point values for different alert types
- **Compliance Coverage**: Add more sophisticated compliance checks
- **Interactions**: Include additional data sources
- **Agents Deployed**: Change the criteria for "active" agents

## Performance Considerations

For production use, consider:

1. **Caching**: Cache calculated metrics for frequently accessed clients
2. **Batch Updates**: Update multiple clients in a single transaction
3. **Incremental Updates**: Only recalculate when data changes
4. **Database Indexing**: Ensure proper indexes on frequently queried columns

## Example: Custom Risk Score

```python
async def _calculate_custom_risk_score(self, client_id: str) -> float:
    # Your custom risk calculation logic
    base_risk = 0.0
    
    # Add custom factors
    base_risk += self._calculate_data_exposure_risk(client_id)
    base_risk += self._calculate_usage_pattern_risk(client_id)
    base_risk += self._calculate_compliance_gap_risk(client_id)
    
    return min(base_risk, 100.0)
```

This system provides a flexible foundation for calculating metrics that can be easily extended and customized based on your specific business requirements.
