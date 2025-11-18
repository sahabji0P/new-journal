# Database Setup Guide

This guide will help you set up the PostgreSQL database for the Money Management Application using Neon.

## Prerequisites

- Node.js installed
- A Neon account (sign up at https://neon.tech)
- Google Cloud Console account for OAuth

## Step 1: Create Neon Database

1. Go to https://neon.tech and sign in
2. Click "Create Project"
3. Choose a name for your project (e.g., "money-tracker")
4. Select a region close to your users
5. Copy the connection string - it will look like:
   ```
   postgresql://username:password@ep-xxx-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your `.env` file:

```env
# Database Configuration
DATABASE_URL="your-neon-connection-string-here"

# NextAuth Configuration
# Generate using: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Gemini API (get from Google AI Studio)
GEMINI_API_KEY="your-gemini-api-key"
```

## Step 3: Get Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - Your production URL when deploying
7. Copy the Client ID and Client Secret to your `.env` file

## Step 4: Get Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key to your `.env` file

## Step 5: Generate NextAuth Secret

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env` file.

## Step 6: Push Database Schema

Run the following command to create all tables in your Neon database:

```bash
npm run db:push
```

This will:
- Connect to your Neon database
- Create all tables defined in `prisma/schema.prisma`
- Generate the Prisma Client

## Step 7: Verify Database

You can verify your database setup by opening Prisma Studio:

```bash
npm run db:studio
```

This will open a browser window where you can view and edit your database data.

## Database Schema Overview

The application includes the following main tables:

### Authentication
- `users` - User accounts
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification

### Financial Data
- `financial_accounts` - Bank accounts, credit cards
- `transactions` - Income and expense records
- `categories` - Transaction categories
- `parties` - Payees and payers
- `budgets` - Budget plans
- `sub_budgets` - Category-specific budgets
- `goals` - Savings goals
- `watchlists` - Spending alerts
- `recurring_transactions` - Recurring bills

### AI Features
- `insights` - AI-generated insights
- `chat_messages` - Chatbot conversation history
- `notifications` - User notifications
- `user_settings` - User preferences

## Common Commands

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify your `DATABASE_URL` is correct
2. Make sure your Neon project is active (Neon auto-suspends after inactivity)
3. Check that your IP is allowed (Neon allows all IPs by default)

### Schema Sync Issues

If you modify `schema.prisma`:
1. Run `npm run db:generate` to regenerate the client
2. Run `npm run db:push` to sync changes to the database

### Migration Issues

If you need to reset everything:
```bash
npx prisma migrate reset
npm run db:push
```

## Production Deployment

When deploying to production:

1. Create a production Neon database
2. Update `NEXTAUTH_URL` to your production domain
3. Add your production URL to Google OAuth authorized redirect URIs
4. Use environment variables in your hosting platform (Vercel, Railway, etc.)
5. Never commit your `.env` file to git

## Next Steps

After setting up the database:

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
3. Sign in with Google
4. Start using the application!

The database will automatically populate as you use the app:
- Create accounts
- Add transactions
- Set budgets
- Use the AI chatbot
- View insights

## Database Backups

Neon provides automatic backups. You can also export your data:

1. Open Prisma Studio: `npm run db:studio`
2. Export data manually, or
3. Use Neon's dashboard to create backups

## Support

For issues:
- Neon: https://neon.tech/docs
- Prisma: https://www.prisma.io/docs
- NextAuth: https://next-auth.js.org/
