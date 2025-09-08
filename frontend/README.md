# OneClick Frontend

A Next.js frontend application for the OneClick multi-provider application provisioning platform.

## Features

- **Multi-step Provisioning Wizard**: Guided setup for deploying applications across multiple cloud providers
- **Provider Support**: AWS, Azure, GCP, Docker, and Kubernetes
- **Application Templates**: Pre-configured templates for web apps, databases, APIs, and more
- **Type Safety**: Full TypeScript support with Zod validation
- **Modern UI**: Tailwind CSS with shadcn/ui components
- **Authentication**: NextAuth.js integration
- **API Integration**: React Query for data fetching

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: NextAuth.js
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── provision/               # Provisioning wizard
│   │   ├── page.tsx            # Main wizard page
│   │   └── [step]/page.tsx     # Dynamic step pages
│   └── api/                     # API routes
│       └── auth/                # Authentication routes
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   ├── wizard/                  # Wizard-specific components
│   ├── forms/                   # Form components
│   └── providers/               # Provider-specific components
└── lib/                         # Utility libraries
    ├── api.ts                   # API client
    ├── validations.ts           # Zod schemas
    ├── providers.ts             # Provider configurations
    └── utils.ts                 # Utility functions
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   ```
   
   Update the environment variables:
   - `NEXTAUTH_SECRET`: Generate a secure secret for NextAuth.js
   - `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)
   - `NEXT_PUBLIC_BACKEND_URL`: Backend API URL
   - `BACKEND_URL`: Internal backend URL for server-side requests

3. **Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Configuration

### Provider Configuration

The application supports multiple cloud providers defined in `/src/lib/providers.ts`:

- **AWS**: EC2, ECS, Lambda, RDS, S3
- **Azure**: App Services, VMs, Container Instances, SQL Database
- **GCP**: Compute Engine, App Engine, Cloud Run, Cloud SQL
- **Docker**: Container deployment with registry support
- **Kubernetes**: Helm-based deployments

### Application Templates

Pre-configured application templates in `/src/lib/providers.ts`:

- Web Application
- Database (PostgreSQL, MySQL, MongoDB)
- REST API
- Monitoring Stack (Prometheus, Grafana)
- CI/CD Pipeline
- Message Queue (Redis, RabbitMQ)

### Form Validation

All forms use Zod schemas defined in `/src/lib/validations.ts`:

- User information validation
- Provider credential validation
- Application configuration validation

## API Integration

The frontend communicates with the backend through:

- **API Client** (`/src/lib/api.ts`): Centralized API calls
- **React Query**: Data fetching and caching
- **NextAuth.js**: Authentication state management

## Styling

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components
- **CSS Variables**: Theme customization support
- **Responsive Design**: Mobile-first approach

## Authentication

NextAuth.js configuration supports:

- Credentials provider (email/password)
- JWT strategy for stateless authentication
- Custom sign-in and error pages
- Role-based access control

## Development Notes

- The project uses the new Next.js App Router
- All components are built with TypeScript for type safety
- Forms use React Hook Form for performance and validation
- UI components follow the shadcn/ui design system
- API calls are centralized and typed

## Environment Variables

Required environment variables:

```bash
NEXTAUTH_SECRET=           # NextAuth.js secret key
NEXTAUTH_URL=             # Application URL
NEXT_PUBLIC_BACKEND_URL=  # Public backend API URL
BACKEND_URL=              # Internal backend API URL
NODE_ENV=                 # Environment (development/production)
```

## Next Steps

To complete the setup:

1. Install dependencies: `npm install`
2. Configure environment variables
3. Start the development server
4. Ensure backend API is running on configured port
5. Test the provisioning wizard flow