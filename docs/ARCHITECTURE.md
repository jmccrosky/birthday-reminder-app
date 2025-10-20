# Birthday Reminder App - Architecture Documentation

## Overview

The Birthday Reminder App is a full-stack application that helps users track and receive notifications for upcoming birthdays. The system is built with a mobile-first approach, featuring a React Native iOS app backed by a cloud-native API on Google Cloud Platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                               │
│  ┌──────────────────┐                                           │
│  │  iOS App         │                                           │
│  │  (React Native)  │                                           │
│  └────────┬─────────┘                                           │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │ HTTPS/REST
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                    Google Cloud Platform                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Cloud Run (API)                                         │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Fastify API Server                                │  │  │
│  │  │  - Authentication (JWT)                            │  │  │
│  │  │  - Birthday CRUD operations                        │  │  │
│  │  │  - Push notification management                    │  │  │
│  │  └─────────┬──────────────────────────┬───────────────┘  │  │
│  └────────────┼──────────────────────────┼──────────────────┘  │
│               │                          │                      │
│  ┌────────────▼───────────┐   ┌─────────▼────────────────┐    │
│  │  Cloud SQL             │   │  Pub/Sub Topic           │    │
│  │  (PostgreSQL)          │   │  (Notifications)         │    │
│  │  - Users               │   └──────────────────────────┘    │
│  │  - Birthdays           │                                    │
│  └────────────────────────┘                                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Cloud Scheduler                                         │ │
│  │  - Daily birthday check (9 AM)                          │ │
│  │  - Triggers notification job                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Artifact Registry                                       │ │
│  │  - Docker images for API                                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │
            │ APNs
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                    Apple Push Notification Service               │
│                     (Push Notifications)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend - React Native iOS App

**Location**: `packages/mobile/`

**Technology Stack**:
- React Native 0.73
- TypeScript
- React Navigation for routing
- Axios for API communication
- AsyncStorage for local data persistence
- APNs integration for push notifications

**Key Features**:
- User authentication (login/register)
- Birthday list view with CRUD operations
- Date picker for birthday selection
- Push notification preferences
- Offline data persistence

**Screens**:
- `LoginScreen`: User authentication
- `RegisterScreen`: New user registration
- `HomeScreen`: Birthday list with delete/edit actions
- `AddBirthdayScreen`: Create new birthday entry
- `EditBirthdayScreen`: Update existing birthday

**Services**:
- `api.ts`: REST API client with authentication
- `notifications.ts`: Push notification setup and handling

### Backend - Node.js/Fastify API

**Location**: `packages/backend/`

**Technology Stack**:
- Node.js 20
- TypeScript
- Fastify (web framework)
- Drizzle ORM (database)
- PostgreSQL
- JWT authentication
- Google Cloud Pub/Sub
- Bcrypt for password hashing

**API Routes**:

1. **Authentication** (`/api/auth`)
   - `POST /register`: Create new user account
   - `POST /login`: Authenticate user and receive JWT

2. **Birthdays** (`/api/birthdays`)
   - `GET /`: List all birthdays for authenticated user
   - `POST /`: Create new birthday
   - `GET /:id`: Get birthday details
   - `PUT /:id`: Update birthday
   - `DELETE /:id`: Delete birthday

3. **Users** (`/api/users`)
   - `GET /me`: Get current user profile
   - `POST /device-token`: Register device for push notifications

**Database Schema**:

```typescript
// Users table
{
  id: uuid (PK)
  email: string (unique)
  passwordHash: string
  name: string
  deviceToken: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}

// Birthdays table
{
  id: uuid (PK)
  userId: uuid (FK -> users.id)
  name: string
  birthDate: date
  notes: string (nullable)
  notificationEnabled: boolean
  notificationDaysBefore: integer
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Services**:
- `notification-cron.ts`: Daily job to check for upcoming birthdays
- `push-notifications.ts`: Pub/Sub integration for sending notifications

### Infrastructure - Google Cloud Platform

**Location**: `terraform/`

**Resources Created**:

1. **Networking**:
   - VPC network with private subnet
   - VPC Access Connector for Cloud Run to Cloud SQL communication

2. **Compute**:
   - Cloud Run service for API hosting
   - Auto-scaling (0-10 instances)
   - 1 CPU, 512Mi memory per instance

3. **Database**:
   - Cloud SQL PostgreSQL 15
   - Private IP only (no public access)
   - SSL required
   - Automated backups
   - Point-in-time recovery (production)

4. **Messaging**:
   - Pub/Sub topic for notification queue
   - Pub/Sub subscription with push delivery

5. **Scheduling**:
   - Cloud Scheduler job (daily at 9 AM)
   - Triggers birthday check endpoint

6. **Storage**:
   - Artifact Registry for Docker images
   - GCS bucket for Terraform state

7. **IAM**:
   - Service account for API with minimal permissions
   - Cloud SQL client role
   - Pub/Sub publisher role

**Security**:
- All communication encrypted (TLS)
- Database requires SSL
- Private networking for database
- Service accounts with least privilege
- Secrets managed via environment variables

### CI/CD - GitHub Actions

**Location**: `.github/workflows/`

**Pipelines**:

1. **Backend Pipeline** (`backend.yml`):
   ```
   Trigger: Push to main or PR affecting backend
   Steps:
   1. Lint and test
   2. Build Docker image
   3. Push to Artifact Registry
   4. Deploy to Cloud Run
   ```

2. **Mobile Pipeline** (`mobile.yml`):
   ```
   Trigger: Push to main or PR affecting mobile
   Steps:
   1. Lint and test
   2. Install dependencies (CocoaPods)
   3. Sync certificates (Fastlane Match)
   4. Build iOS app
   5. Upload to TestFlight
   ```

3. **Infrastructure Pipeline** (`terraform.yml`):
   ```
   Trigger: Push to main or PR affecting terraform
   Steps:
   1. Format check
   2. Validate configuration
   3. Plan changes
   4. Apply (main branch only)
   ```

## Data Flow

### User Registration/Login

```
1. User enters credentials in iOS app
2. App sends POST to /api/auth/register or /api/auth/login
3. Backend validates credentials
4. Backend generates JWT token
5. Token returned to app
6. App stores token in AsyncStorage
7. Token included in Authorization header for future requests
```

### Creating a Birthday

```
1. User fills out birthday form in app
2. App sends POST to /api/birthdays with birthday data
3. Backend validates JWT token
4. Backend inserts birthday into database
5. Returns created birthday to app
6. App updates local state and displays confirmation
```

### Daily Notification Flow

```
1. Cloud Scheduler triggers at 9 AM daily
2. Scheduler calls /api/notifications/check endpoint
3. Backend queries database for birthdays today
4. For each birthday with notifications enabled:
   a. Create notification message
   b. Publish to Pub/Sub topic
   c. Pub/Sub delivers to subscription
5. Notification worker sends push to APNs
6. APNs delivers notification to user's device
7. iOS app displays notification
```

## Deployment Architecture

### Development Environment

- Local PostgreSQL database
- Local API server (port 3000)
- iOS Simulator for testing
- No cloud resources required

### Production Environment

- Cloud Run hosts API (auto-scaling)
- Cloud SQL PostgreSQL (managed)
- Artifact Registry for Docker images
- Cloud Scheduler for cron jobs
- Pub/Sub for async messaging
- TestFlight for beta distribution

## Scalability Considerations

### Current Capacity

- **API**: Auto-scales 0-10 instances
- **Database**: db-f1-micro (upgradeable)
- **Concurrent Users**: ~1000 (can be increased)

### Scaling Strategy

1. **Horizontal Scaling**:
   - Cloud Run auto-scales based on request volume
   - Increase max instances in Terraform config

2. **Database Scaling**:
   - Upgrade Cloud SQL tier as needed
   - Enable read replicas for read-heavy workloads
   - Implement connection pooling (PgBouncer)

3. **Caching**:
   - Add Cloud Memorystore (Redis) for session/data caching
   - Implement HTTP caching headers

4. **CDN**:
   - Use Cloud CDN for static assets
   - Cache API responses where appropriate

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication
- **Password Security**: Bcrypt hashing (10 rounds)
- **Token Validation**: Middleware on protected routes
- **User Isolation**: Row-level security (userId foreign key)

### Network Security

- **TLS Everywhere**: HTTPS for all API communication
- **Private Database**: No public IP, VPC-only access
- **VPC Access Connector**: Secure Cloud Run to Cloud SQL
- **IAM Policies**: Least privilege service accounts

### Data Security

- **Encryption at Rest**: Cloud SQL encrypted by default
- **Encryption in Transit**: TLS 1.2+
- **Secrets Management**: Environment variables, not in code
- **Database Backups**: Automated daily backups

### Mobile Security

- **Keychain**: Sensitive data stored in iOS Keychain
- **Certificate Pinning**: Can be added for API communication
- **Jailbreak Detection**: Can be added if needed

## Monitoring & Observability

### Logging

- **Cloud Run Logs**: Automatic logging of all requests
- **Application Logs**: Structured JSON logging
- **Database Logs**: Query performance and errors

### Metrics

- **Cloud Run Metrics**:
  - Request count
  - Request latency
  - Error rate
  - Instance count

- **Database Metrics**:
  - Connection count
  - Query performance
  - Storage usage

### Alerts (Can be configured)

- High error rate
- Database connection issues
- High latency
- Storage approaching limits

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups
- **Point-in-time Recovery**: Enabled for production
- **Retention**: 7 days (configurable)
- **Terraform State**: Versioned in GCS

### Recovery Procedures

1. **Database Restore**:
   ```bash
   gcloud sql backups restore BACKUP_ID \
     --backup-instance=SOURCE \
     --backup-project=PROJECT
   ```

2. **API Rollback**:
   ```bash
   # Revert to previous image
   gcloud run deploy birthday-reminder-api \
     --image=PREVIOUS_IMAGE_SHA
   ```

3. **Infrastructure Recovery**:
   ```bash
   # Terraform state is versioned
   # Can recreate entire infrastructure
   terraform apply
   ```

## Future Enhancements

### Short-term

1. Email notifications as backup to push
2. Birthday import from contacts
3. Custom notification times
4. Birthday reminders multiple days in advance
5. Recurring events (anniversaries)

### Long-term

1. Android app support
2. Web dashboard
3. Social features (shared birthdays)
4. Gift suggestions integration
5. Calendar integration
6. Birthday cards/messages
7. Multi-language support

## Performance Optimization

### Current Optimizations

- Database indexing on userId and birthDate
- JWT for stateless authentication (no session lookups)
- Cloud Run cold start mitigation (min instances)
- Connection pooling for database

### Future Optimizations

- Redis caching for frequently accessed data
- GraphQL for efficient data fetching
- Database query optimization
- Image CDN for profile pictures
- Background job processing for heavy tasks

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and alerts
- **Monthly**: Database performance analysis
- **Quarterly**: Security audit and dependency updates
- **Annually**: Cost optimization review

### Dependency Updates

```bash
# Backend
cd packages/backend
pnpm update

# Mobile
cd packages/mobile
pnpm update
bundle update
pod update
```

### Database Maintenance

```sql
-- Vacuum and analyze (PostgreSQL)
VACUUM ANALYZE birthdays;
VACUUM ANALYZE users;

-- Check index usage
SELECT * FROM pg_stat_user_indexes;
```

## Testing Strategy

### Backend Testing

- Unit tests for services and utilities
- Integration tests for API endpoints
- Database migration testing
- Load testing with k6 or similar

### Mobile Testing

- Unit tests for business logic
- Component tests with React Testing Library
- E2E tests with Detox (future)
- Manual testing on TestFlight

### Infrastructure Testing

- Terraform validate
- Terraform plan review
- Staged deployments (dev → staging → prod)

## Cost Analysis

### Monthly Estimates (Low Traffic)

- Cloud Run: $5-10 (mostly free tier)
- Cloud SQL: $10-15 (db-f1-micro)
- Pub/Sub: <$1
- Cloud Scheduler: <$1
- Artifact Registry: <$1
- Networking: $2-5

**Total**: ~$20-30/month for low traffic

### Cost Optimization Tips

- Use Cloud SQL for development only when needed
- Enable Cloud Run scale-to-zero
- Clean up old Docker images
- Use committed use discounts for production
- Monitor and set budget alerts

## Compliance & Privacy

### Data Privacy

- User data stored in US region (configurable)
- GDPR considerations for EU users
- Data deletion on account closure
- Minimal data collection

### Apple Guidelines

- Privacy policy required for App Store
- Appropriate data usage declarations
- Push notification permissions
- No data sharing with third parties

## Contact & Support

For technical questions or issues:
- GitHub Issues
- Team email: [your-team@example.com]
- Documentation: This repository
