# Exercise Management API

A RESTful API built with Next.js for managing exercises and user authentication.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 💪 Exercise management (CRUD operations)
- 🗑️ Soft delete functionality
- 🔄 Refresh token rotation
- 🛡️ Secure password hashing
- 📝 Input validation
- 👥 User exercise interactions (save, favorite, rate)

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Docker desktop (for DB)

## Quick Start

1. Clone and install:
```bash
git clone <repository-url>
cd node-apis-project
npm install
```

2. Configure environment:
- Copy `.env.sample` to `.env`
- Update the variables with your values

3. Start the database:
```bash
docker-compose up -d
```

4. Push the schema:
```bash
npm run prisma:push
```

5. Start the server:
```bash
npm run dev
```

6. View the DB structure and content:
```bash
npx prisma studio
```

The APIs will be available at `http://localhost:3000/api`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Exercises

- `POST /api/exercises` - Create exercise
  - Body: `{ "name": "Push-ups", "description": "Basic push-ups", "difficulty": 3, "isPublic": true }`
- `GET /api/exercises` - List exercises (filters: name, description, difficulty)
- `GET /api/exercises/{id}` - Get exercise by ID
- `PUT /api/exercises/{id}` - Update exercise
- `DELETE /api/exercises/{id}` - Delete exercise

### UserExercises (Interactions)

- `POST /api/exercises/{id}/interactions` - Create/Update user exercise interactions
  - Body: `{ "isSaved": true, "isFavorited": true, "rating": 4 }`

## Development

- Prisma ORM
- TypeScript
- Next.js API routes
- JWT authentication
- PostgreSQL database
- Jest tests

## Testing

### Running Tests

To run all tests:
```bash
npm run test
```

To run tests in watch mode:
```bash
npm run test:watch
```
