# Kraft Envios API

A robust NestJS-based REST API for managing multi-carrier shipping operations. This API provides comprehensive shipping quote comparison, label generation, and logistics management by integrating with multiple Mexican shipping carriers.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control
- 📦 **Multi-Carrier Integration**: Connect with 4 major shipping providers
- 💰 **Rate Comparison**: Get real-time shipping quotes from multiple carriers
- 🏷️ **Label Generation**: Create shipping labels across different carriers
- 📍 **Address Management**: Store and manage shipping addresses
- 👥 **User Management**: Complete user registration and profile management
- ⚙️ **Global Configuration**: Centralized settings management
- 📧 **Email Notifications**: Automated email system for password resets and notifications

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: AWS Lambda via Serverless Framework
- **Email**: React Email with Resend API
- **Testing**: Jest
- **Package Manager**: Bun

## Prerequisites

- Node.js (v22.x or higher)
- Bun (recommended) or npm
- MongoDB Atlas account
- AWS account (for deployment)
- API keys for shipping providers

## Installation

```bash
# Install dependencies
bun install
# or
npm install
```

## Environment Configuration

Create a `.env.local` file in the root directory based on `.env-example`:

```bash
# Database
CLUSTER=your-cluster-name
MONGO_CLUSTER_SUFFIX=.xxxxx.mongodb.net
MONGO_USER=your-username
MONGO_PWD=your-password
MONGO_DB_NAME=your-database
MONGO_CONNECTION=mongodb+srv

# Authentication
JWT_KEY=your-jwt-secret
ONE_TIME_JWT_KEY=your-one-time-jwt-secret
PUBLIC_KEY=your-public-key
ROLE_KEY=your-role-key

# Frontend
FRONTEND_URI=http://localhost:3000
FRONTEND_PORT=3000

# Email
RESEND_API_KEY=your-resend-api-key
MAILER_MAIL=noreply@yourdomain.com

# Shipping Provider APIs
GUIA_ENVIA_KEY=your-guia-envia-key
GUIA_ENVIA_URI=https://api.guiaenvia.com

T1_URI=https://api.t1.com
T1_CLIENT_ID=your-t1-client-id
T1_CLIENT_SECRET=your-t1-client-secret
T1_USERNAME=your-t1-username
T1_PASSWORD=your-t1-password
T1_STORE_ID=your-store-id

PAKKE_KEY=your-pakke-key
PAKKE_URI=https://api.pakke.mx

MANUABLE_EM=your-manuable-email
MANUABLE_PSS=your-manuable-password
MANUABLE_URI=https://api.manuable.com

NODE_ENV=development
```

## Running the Application

```bash
# Development mode
bun run watch
# or
npm run watch

# Development with Serverless offline
bun run dev:sls

# Production mode
bun run start:prod
```

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/reset-password` - Request password reset

### Users

- `GET /users` - Get all users (admin)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Quotes

- `POST /quotes` - Get shipping quotes from multiple carriers
- `GET /quotes/:id` - Get quote details

### Addresses

- `GET /addresses` - List user addresses
- `POST /addresses` - Create new address
- `PUT /addresses/:id` - Update address
- `DELETE /addresses/:id` - Delete address

### Shipping Providers

- `POST /ge/*` - Guía Envía endpoints
- `POST /tone/*` - T1 endpoints
- `POST /pkk/*` - Pakke endpoints
- `POST /mn/*` - Manuable endpoints

### Configuration

- `GET /global-configs` - Get global configurations
- `PUT /global-configs` - Update configurations

## Testing

```bash
# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Test coverage
bun run test:cov

# Watch mode
bun run test:watch
```

## Deployment

Deploy to AWS Lambda using Serverless Framework:

```bash
# Build and deploy
bun run deploy

# Or step by step
bun run build
serverless deploy
```

The API will be deployed to AWS Lambda in the `us-east-1` region with API Gateway.

## Project Structure

```
src/
├── addresses/         # Address management module
├── auth/             # Authentication & authorization
├── database/         # MongoDB configuration
├── exceptions/       # Global exception filters
├── general-info-db/  # General information storage
├── global-configs/   # Application configuration
├── guia-envia/       # Guía Envía integration
├── mail/             # Email service
├── manuable/         # Manuable integration
├── middlewares/      # Custom middlewares
├── pakke/            # Pakke integration
├── quotes/           # Quote management
├── t1/               # T1 integration
├── token-manager/    # Token management
├── users/            # User management
├── app.module.ts     # Main application module
├── config.ts         # Configuration loader
└── main.ts           # Application entry point
```

## Security

- All sensitive credentials are stored in environment variables
- JWT-based authentication with role-based access control
- Password hashing with bcrypt
- Input validation using class-validator
- MongoDB connection with authentication

## License

**Proprietary** - This software is private and for internal use only. All rights reserved.
