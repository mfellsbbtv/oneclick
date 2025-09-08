# OneClick Account Provisioning System

Enterprise-grade account provisioning system for automating new hire onboarding across multiple SaaS platforms.

## Features

- 🚀 **Multi-Provider Support**: Google Workspace, Slack, Microsoft 365, ClickUp, Jira, Confluence, GitHub, Zoom, HubSpot
- 🔄 **Idempotent Operations**: Safe to retry, prevents duplicate accounts
- 📊 **Real-time Progress Tracking**: Monitor provisioning status for each application
- 🔐 **Enterprise Security**: OIDC authentication, audit logging, encrypted secrets
- 🎯 **Smart Validation**: Per-app field validation with helpful error messages
- 📝 **Audit Trail**: Complete logging of all provisioning activities
- 🔧 **Job Queue**: Resilient background processing with retry logic
- 🎨 **Modern UI**: Responsive wizard interface with step-by-step guidance

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, React Hook Form, Zod, Tailwind CSS
- **Backend**: NestJS, TypeScript, TypeORM, PostgreSQL
- **Queue**: Redis, BullMQ
- **Auth**: NextAuth.js (OIDC)
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mfellsbbtv/oneclick.git
cd oneclick
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start services with Docker Compose:
```bash
docker-compose up -d
```

4. Install dependencies:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Configuration

### Required API Credentials

Each provider requires specific credentials. See `.env.example` for the full list.

#### Google Workspace
- Service account with domain-wide delegation
- Admin SDK and Licensing API scopes
- Customer ID

#### Slack
- SCIM token for user provisioning
- Workspace ID
- Bot token for channel invitations

#### Microsoft 365
- Azure AD application registration
- Graph API permissions
- Tenant ID

#### GitHub
- GitHub App with organization management permissions
- Installation ID for your organization

### Provider-Specific Configuration

Each provider has specific fields that can be configured:

- **Google Workspace**: Organizational unit, password policy, license SKU
- **Slack**: Default channels, user role, user groups
- **Microsoft 365**: Usage location, license SKUs, service plans
- **ClickUp**: Workspace, teams, permission presets
- **Jira/Confluence**: Product access, groups, site selection
- **GitHub**: Organization, teams, role assignment
- **Zoom**: License type, add-ons
- **HubSpot**: Seat type, permissions

## API Documentation

### Authentication

All API endpoints require authentication via JWT token obtained through OIDC login.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/users
```

### Core Endpoints

- `POST /api/provision` - Start new provisioning request
- `GET /api/provision/:id` - Get provisioning status
- `GET /api/provision/:id/results` - Get detailed results
- `POST /api/provision/:id/retry` - Retry failed provisions
- `GET /api/users` - List provisioned users
- `GET /api/audit` - View audit logs

## Development

### Project Structure

```
oneclick/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   └── lib/       # Utilities and configurations
├── backend/           # NestJS backend API
│   ├── src/
│   │   ├── auth/      # Authentication module
│   │   ├── users/     # User management
│   │   ├── provisioning/ # Core provisioning logic
│   │   └── providers/ # Provider implementations
├── database/          # Database schemas and migrations
├── docker/           # Docker configurations
└── tests/           # Integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Database Migrations

```bash
# Create new migration
cd backend
npm run migration:create -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Deployment

### Production with Docker

1. Build production images:
```bash
docker-compose -f docker-compose.prod.yml build
```

2. Run production stack:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Configuration

- **Development**: Uses `.env.development`
- **Staging**: Uses `.env.staging`
- **Production**: Uses `.env.production`

### Security Considerations

1. **Secrets Management**: Use a proper secrets manager (Vault, AWS Secrets Manager)
2. **Network Security**: Configure proper firewall rules
3. **Data Encryption**: Enable TLS for all connections
4. **Audit Logging**: Ensure audit logs are stored securely
5. **Rate Limiting**: Configure appropriate rate limits
6. **CORS**: Restrict to specific origins in production

## Monitoring

### Health Checks

- Frontend: http://localhost:3000/api/health
- Backend: http://localhost:3001/health
- Database: http://localhost:3001/health/db
- Redis: http://localhost:3001/health/redis

### Metrics

The application exports metrics in Prometheus format at `/metrics`.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running: `docker-compose ps`
   - Verify DATABASE_URL in .env

2. **Redis Connection Failed**
   - Check Redis is running: `docker-compose ps`
   - Verify REDIS_URL in .env

3. **Provider API Errors**
   - Check API credentials in .env
   - Verify required scopes/permissions
   - Check rate limits

4. **Authentication Issues**
   - Verify OIDC configuration
   - Check NEXTAUTH_SECRET is set
   - Ensure redirect URIs are configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

## Roadmap

- [ ] Bulk import via CSV
- [ ] Role-based templates
- [ ] Webhook listeners for status updates
- [ ] De-provisioning workflows
- [ ] Multi-tenant support
- [ ] Advanced reporting dashboard
- [ ] Mobile application

## Acknowledgments

Built with modern open-source technologies and best practices for enterprise deployment.