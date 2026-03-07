# Testing Strategy & Implementation

## Overview

This document outlines the comprehensive testing strategy implemented for the Smart DOOH platform. All tests follow NestJS best practices and utilize Jest for unit and integration testing.

## Test Coverage

### 1. Unit Tests

#### Ad Selection Engine (`ad-selection-engine.service.spec.ts`)
**Purpose**: Verify the strategy chain pattern and decision-making logic.

**Key Tests**:
- Emergency override takes precedence over all other strategies
- Full strategy chain executes when no override is present
- Empty candidate handling
- Proper strategy invocation order

**Mocked Dependencies**:
- `EmergencyRulesStrategy`
- `ProximityStrategy`
- `PaidPriorityStrategy`
- `ContextRulesStrategy`

**Testing Strategy**: Each strategy is mocked using `jest.fn()`, and we verify:
1. Correct input is passed to each strategy
2. Override logic short-circuits the chain
3. Final output matches expected `AdInstruction[]` format

---

#### Context Engine Service (`context-engine.service.spec.ts`)
**Purpose**: Verify business logic filtering based on driver preferences.

**Key Tests**:
- **Vegetarian Filter**: Meat ads are excluded for vegetarian drivers
- **Kosher Filter**: Non-kosher businesses are excluded for kosher drivers
- **Alcohol Filter**: Bars/alcohol are excluded for non-alcohol drivers
- **Cache Hit/Miss**: Verify Redis caching for POI and Weather APIs
- **API Timeout Handling**: Graceful degradation on external API failures

**Mocked Dependencies**:
- `DriverRepository`
- `BusinessRepository`
- `PlacesApiService` (Google Places)
- `WeatherService` (OpenWeatherMap)
- `CacheService` (Redis)
- `MetricsService` (Prometheus)

**Testing Strategy**: Mock all external dependencies using `Test.createTestingModule()`. Verify that:
1. Filtering logic correctly applies driver preferences
2. Cache hits prevent external API calls
3. Metrics are recorded correctly

---

#### Ad Creative Service (`ad-creative.service.spec.ts`)
**Purpose**: Verify LLM fallback logic and translation caching.

**Key Tests**:
- **Primary Provider**: Gemini is called first
- **LLM Fallback**: GPT-4o is called when Gemini fails
- **Dual Failure**: Throws error when both providers fail
- **Placeholder Replacement**: `{businessName}` is replaced correctly
- **Translation Caching**: Hebrew translations are cached in Redis
- **Moderation**: Creatives are created with `PENDING` status

**Mocked Dependencies**:
- `LlmProviderService`
- `TrendApiService`
- `CacheService`
- `PrismaService`

**Testing Strategy**: Mock LLM provider to simulate success/failure scenarios, verify fallback chain.

---

### 2. Business Logic Tests

#### Context Rules Strategy (`context-rules.strategy.spec.ts`)
**Purpose**: Verify time and weather-based ad boosting.

**Key Tests**:
- **Time-based Triggers**:
  - Dinner ads boosted at 18:30
  - Coffee ads boosted at 8:00 AM
- **Weather-based Triggers**:
  - Umbrella ads boosted during rain
  - Ice cream ads boosted during hot weather (35°C)
- **POI Density**: Shopping ads boosted near high POI density

**Testing Strategy**: Mock context input with specific `timeHour` and `weather` values, verify ad scores are adjusted accordingly.

---

#### Emergency Rules Strategy (`emergency-rules.strategy.spec.ts`)
**Purpose**: Verify emergency alert override logic.

**Key Tests**:
- **Override within Radius**: Emergency alert overrides all ads when driver is within radius
- **No Override Outside Radius**: Regular ads shown when driver is outside alert radius
- **Multiple Alerts**: Highest priority alert is selected
- **No Active Alerts**: Regular flow when no alerts are active

**Mocked Dependencies**:
- `EmergencyAlertRepository`
- `CreativeRepository`

**Testing Strategy**: Mock emergency alerts with different `lat`, `lng`, and `radiusMeters`, verify Haversine distance calculations.

---

### 3. Integration Tests

#### Ad Selection Controller (`ad-selection.controller.spec.ts`)
**Purpose**: Verify full flow from HTTP request → Controller → Service → Repository → Response.

**Key Tests**:
- `GET /ad-selection/ranked`: Returns ranked ads based on driver location
- `POST /ad-selection/select`: Records ad selection and latency metrics
- **Input Validation**: Required fields are validated
- **Empty Candidates**: Handles no available ads gracefully

**Testing Strategy**: Mock service and repository layers, verify controller correctly orchestrates calls and returns DTOs.

---

#### Context Engine Controller (`context-engine.controller.spec.ts`)
**Purpose**: Verify context retrieval flow.

**Key Tests**:
- `GET /context-engine/context`: Returns filtered businesses, POIs, and weather
- **Input Validation**: Validates `driverId`, `lat`, `lng`, `radius`

---

#### Impressions Controller (`impressions.controller.spec.ts`)
**Purpose**: Verify idempotent impression recording.

**Key Tests**:
- `POST /impressions`: Records impression with `client_uuid`
- **Idempotency**: Duplicate `client_uuid` returns existing impression
- **Input Validation**: `client_uuid` must be non-empty
- `GET /impressions/count`: Returns count by `client_uuid`

**Testing Strategy**: Mock service layer, verify controller enforces idempotency using `client_uuid` as unique key.

---

### 4. Payments & Admin Service Tests

#### Payments Service (`payments.service.spec.ts`)
**Purpose**: Verify payment processing and driver earnings calculation.

**Key Tests**:
- **Stripe Payment Intent**: Creates payment intent and `Payment` record
- **Tranzila Redirect**: Generates redirect URL for Tranzila
- **Complete Payment**: Marks payment as `COMPLETED` and increments campaign budget
- **Driver Earnings**: Calculates earnings at **0.05 ILS per impression**
- **Monthly Earnings Generation**: Creates `DriverEarnings` records for all drivers
- **Payout Creation**: Creates payout record with bank details

**Edge Cases**:
- Negative amounts rejected
- Invalid currency handled
- Duplicate payment completion (no double-increment)
- Zero impressions return zero earnings
- Large impression counts (10,000+) calculated correctly

**Mocked Dependencies**:
- `PrismaService`
- `Stripe` SDK

**Testing Strategy**: Mock Stripe API and Prisma, verify payment state transitions and earnings formulas.

---

#### Admin Service (`admin.service.spec.ts`)
**Purpose**: Verify analytics, moderation, and campaign management.

**Key Tests**:
- **OTS Calculation**: Uses `COUNT(DISTINCT md5(lat_hash))` for unique locations
- **Conversion Rate**: `totalRedemptions / totalImpressions`
- **Creative Moderation**: Lists `PENDING` creatives, approves/rejects
- **Campaign CRUD**: Create, update, delete campaigns with geofences
- **Redemption Recording**: Records coupon redemptions

**Edge Cases**:
- Zero impressions return 0 OTS and 0 conversion rate
- High conversion rate (50%) calculated correctly

**Testing Strategy**: Mock Prisma `$queryRaw` for OTS calculation, verify analytics formulas.

---

### 5. Repository Tests (N+1 Prevention)

#### Campaign Repository (`campaign.repository.spec.ts`)
**Purpose**: Verify efficient query patterns to avoid N+1 problems.

**Key Tests**:
- **N+1 Prevention**: Uses `include` to fetch campaigns + creatives + business in **one query**
- **Creative Filtering**: Only fetches `ACTIVE` creatives in the same query
- **Empty Results**: Handles no active campaigns gracefully

**Testing Strategy**: Mock Prisma, verify `findMany` is called with `include` to fetch relations.

---

#### Business Repository (`business.repository.spec.ts`)
**Purpose**: Verify PostGIS query efficiency.

**Key Tests**:
- **PostGIS `ST_DWithin`**: Uses spatial index for efficient geo queries
- **Radius Conversion**: Correctly converts meters to PostGIS units
- **Empty Results**: Handles no businesses within radius

**Testing Strategy**: Mock `$queryRaw`, verify SQL query contains `ST_DWithin` and `ST_MakePoint`.

---

#### Impressions Repository (`impressions.repository.spec.ts`)
**Purpose**: Verify idempotent impression recording.

**Key Tests**:
- **Upsert**: Uses `upsert` to avoid select-then-insert pattern (N+1)
- **Idempotency**: Duplicate `client_uuid` returns existing impression
- **Count Queries**: Efficient counting by campaign, driver, etc.

**Testing Strategy**: Mock Prisma `upsert`, verify **only one DB call** per impression.

---

#### Driver Repository (`driver.repository.spec.ts`)
**Purpose**: Verify driver preference retrieval.

**Key Tests**:
- **Find by ID**: Retrieves driver with preferences (`isVegetarian`, `isKosher`, `allowsAlcohol`)
- **Find All**: Retrieves all active drivers

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run Specific Test File
```bash
npx jest ad-selection-engine.service.spec.ts
```

---

## Test Configuration

### `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    '!apps/**/src/**/*.interface.ts',
    '!apps/**/src/**/*.dto.ts',
    '!apps/**/src/**/main.ts',
  ],
  coverageDirectory: './coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

---

## Coverage Goals

| Component             | Target Coverage | Notes                                  |
|-----------------------|-----------------|----------------------------------------|
| Services              | 90%+            | Core business logic must be well-tested |
| Repositories          | 85%+            | Focus on query correctness             |
| Controllers           | 80%+            | Focus on integration flows             |
| Strategies            | 90%+            | Critical decision-making logic         |

---

## Best Practices

### 1. Use `Test.createTestingModule()` for DI
Always use NestJS testing module to properly mock dependencies via Dependency Injection.

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: MyRepository, useValue: mockRepository },
  ],
}).compile();
```

### 2. Mock All External Services
Never call real APIs, databases, or third-party services in unit tests. Use `jest.fn()` to mock:
- HTTP clients (Axios, Fetch)
- Database clients (Prisma, TypeORM)
- External SDKs (Stripe, Google Places)

### 3. Test Business Logic, Not Implementation
Focus tests on behavior and outcomes, not internal implementation details.

**Good**: `expect(result.filteredBusinesses).not.toContainEqual(meatBusiness)`

**Bad**: `expect(service['privateMethod']).toHaveBeenCalled()`

### 4. Use Realistic Test Data
Use realistic mock data that matches production schemas. Avoid magic strings.

**Good**: `{ lat: 32.0642, lng: 34.7718, radiusMeters: 5000 }`

**Bad**: `{ lat: 1, lng: 1, radiusMeters: 1 }`

### 5. Test Edge Cases
Always test:
- Empty results (`[]`, `null`, `undefined`)
- API timeouts and errors
- Invalid inputs
- Boundary conditions (zero, negative, very large numbers)

### 6. Verify N+1 Prevention
For repository tests, verify that:
1. Relations are fetched using `include` (not separate queries)
2. `upsert` is used instead of `findOne` + `create`
3. Only one database call per operation

---

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:cov
```

---

## Future Enhancements

1. **E2E Tests**: Add Playwright/Cypress for full system tests
2. **Performance Tests**: Add load testing for ad selection latency
3. **Contract Tests**: Add Pact for mobile-backend API contracts
4. **Mutation Tests**: Add Stryker for mutation testing coverage

---

## Troubleshooting

### "Cannot find module '@nestjs/testing'"
Run `npm install` to install testing dependencies.

### "Timeout of 5000ms exceeded"
Increase Jest timeout in specific tests:
```typescript
jest.setTimeout(10000); // 10 seconds
```

### "Mock functions not being called"
Ensure mocks are properly injected via DI and not instantiated directly.

---

## Testing Philosophy

> "Tests are documentation that never lies."

Our testing strategy prioritizes:
1. **Reliability**: Tests must be deterministic and fast
2. **Maintainability**: Tests should be easy to update when requirements change
3. **Coverage**: Critical business logic must have 90%+ coverage
4. **Realism**: Test data should match production scenarios

By following these principles, we ensure production-grade reliability for the Smart DOOH platform.
