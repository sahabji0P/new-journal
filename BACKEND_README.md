# Backend Implementation - Money Management App

This document outlines the complete backend infrastructure that has been implemented for the Money Management Application.

## 🎯 Overview

A complete REST API backend with:
- **Authentication**: Google OAuth via NextAuth.js
- **Database**: PostgreSQL with Prisma ORM (Neon hosting)
- **AI Features**:
  - Real-time insights generation
  - Intelligent chatbot powered by Google Gemini 2.0 Flash
- **Full CRUD APIs**: For all financial entities

## 📁 Project Structure

```
new-journal/
├── app/
│   └── api/
│       ├── auth/[nextauth]/     # NextAuth authentication
│       ├── accounts/            # Financial accounts CRUD
│       ├── transactions/        # Transaction management
│       ├── budgets/             # Budget management
│       ├── categories/          # Category management
│       ├── parties/             # Payee/Payer management
│       ├── goals/               # Savings goals
│       ├── watchlists/          # Spending watchlists
│       ├── recurring/           # Recurring transactions
│       ├── notifications/       # User notifications
│       ├── insights/            # AI-generated insights
│       │   └── generate/        # Insight generation endpoint
│       └── chat/                # AI chatbot
├── prisma/
│   └── schema.prisma           # Database schema
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # NextAuth configuration
│   └── session.ts              # Session helpers
├── types/
│   └── next-auth.d.ts          # NextAuth type extensions
├── .env.example                # Environment variables template
├── API_DOCUMENTATION.md        # Complete API docs
└── DATABASE_SETUP.md           # Database setup guide
```

## 🗄️ Database Schema

### Authentication Tables
- **users**: User accounts (Google OAuth)
- **accounts**: OAuth provider data
- **sessions**: Active user sessions
- **verification_tokens**: Email verification

### Financial Tables
- **financial_accounts**: Bank accounts, credit cards (with balance tracking)
- **transactions**: All income/expense records (auto-updates balances)
- **categories**: Custom transaction categories
- **parties**: Payees and payers (auto-created from transactions)
- **budgets**: Budget plans with sub-categories
- **sub_budgets**: Category-specific budget allocations
- **goals**: Savings goals with progress tracking
- **watchlists**: Custom spending alerts
- **recurring_transactions**: Recurring bills and income

### AI & Features Tables
- **insights**: AI-generated financial insights
- **chat_messages**: Chatbot conversation history
- **notifications**: User notifications
- **user_settings**: User preferences

## 🔐 Authentication

**Provider**: Google OAuth 2.0 via NextAuth.js

**Endpoints**:
- `GET/POST /api/auth/signin` - Sign in
- `GET/POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

**Protected Routes**: All `/api/*` routes (except `/api/auth/*`) require authentication.

## 🤖 AI Features

### 1. Real-time Insights (`/api/insights/generate`)

Automatically generates insights based on:
- Spending patterns and trends
- Budget usage alerts
- Goal progress milestones
- Anomaly detection (unusual transactions)
- Category breakdowns

**Insight Types**:
- `spending_pattern` - Spending trends and analysis
- `budget_alert` - Budget threshold warnings
- `goal_progress` - Goal milestone celebrations
- `recommendation` - AI-generated recommendations
- `anomaly` - Unusual spending detection

### 2. AI Chatbot (`/api/chat`)

**Powered by**: Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`)

**Capabilities**:
- Natural language queries about finances
- Access to all user financial data
- Context-aware responses
- Personalized insights
- Financial advice and recommendations

**Available Context**:
- All accounts and current balances
- Transaction history (last 3 months)
- Active budgets and spending
- Goal progress
- Category breakdowns
- Recent insights

**Example Queries**:
- "How much did I spend on groceries this month?"
- "Am I on track with my savings goal?"
- "What's my biggest expense category?"
- "Should I be worried about my spending?"
- "How much can I afford to spend this week?"

## 🔧 API Features

### Smart Transaction Handling
- **Auto-balance updates**: Transactions automatically update account balances
- **Auto-party creation**: New payees/payers are automatically created
- **Recurring transaction links**: Tracks which transactions came from recurring bills
- **Category auto-suggest**: Categories are tracked and suggested

### Budget Management
- **Sub-budget support**: Break budgets into category-specific allocations
- **Alert thresholds**: Configurable spending alerts
- **Rollover support**: Unused budget can roll to next period
- **Real-time tracking**: Spending is calculated in real-time

### Goal Tracking
- **Progress calculation**: Automatic progress percentage
- **Milestone notifications**: Alerts at 25%, 50%, 75%, 100%
- **Account linking**: Goals can be linked to specific accounts
- **Monthly contribution tracking**: Track if you're on pace

### Insights Generation
- **Automatic analysis**: Compares current vs. previous months
- **Top category identification**: Highlights biggest spending areas
- **Budget alerts**: Warns when approaching limits
- **Trend detection**: Identifies spending increases/decreases
- **Smart notifications**: Only generates relevant insights

## 📊 Key Metrics Tracked

- Total balance across all accounts
- Monthly income vs. expenses
- Category-wise spending breakdown
- Budget utilization percentages
- Goal progress percentages
- Spending trends (MoM)
- Unusual transaction detection

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Fill in your credentials (see DATABASE_SETUP.md)
```

### 3. Set Up Database
```bash
npm run db:push
```

### 4. Run Development Server
```bash
npm run dev
```

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio (DB GUI)
```

## 🔑 Required Environment Variables

```env
DATABASE_URL          # PostgreSQL connection string (from Neon)
NEXTAUTH_SECRET       # Generated secret for NextAuth
NEXTAUTH_URL          # Application URL (http://localhost:3000 for dev)
GOOGLE_CLIENT_ID      # Google OAuth client ID
GOOGLE_CLIENT_SECRET  # Google OAuth client secret
GEMINI_API_KEY        # Google Gemini API key
```

See `.env.example` for the complete template.

## 📚 Documentation

- **API_DOCUMENTATION.md**: Complete REST API reference
- **DATABASE_SETUP.md**: Step-by-step database setup guide

## 🎨 API Design Principles

1. **RESTful**: Standard HTTP methods (GET, POST, PATCH, DELETE)
2. **Consistent**: All endpoints follow the same patterns
3. **Secure**: Authentication required, user data isolation
4. **Validated**: Input validation on all endpoints
5. **Error Handling**: Consistent error response format
6. **Performance**: Indexed queries, efficient relations

## 🔒 Security Features

- **Session-based auth**: Secure database sessions
- **User isolation**: All queries filtered by userId
- **SQL injection protection**: Prisma parameterized queries
- **Environment variables**: Secrets stored in .env (gitignored)
- **OAuth 2.0**: Secure Google authentication

## 🧪 Testing the API

### Using Prisma Studio
```bash
npm run db:studio
```
Opens a GUI to view and edit database data.

### Using the Frontend
Once the frontend is connected, you can:
1. Sign in with Google
2. Create accounts
3. Add transactions
4. Chat with the AI assistant
5. View insights

### Using API Clients (Postman/Insomnia)
1. Sign in via the frontend to get a session cookie
2. Use the session cookie in your API client
3. Make requests to any `/api/*` endpoint

## 🎯 Next Steps

### Frontend Integration (To Do)
1. Create authentication UI (sign in/out)
2. Connect existing components to API endpoints
3. Build AI chatbot UI component
4. Create insights dashboard widget
5. Add real-time data synchronization
6. Replace localStorage with API calls

### Future Enhancements
- [ ] Batch transaction imports (CSV/OFX)
- [ ] Email notifications
- [ ] Scheduled insight generation (daily/weekly)
- [ ] Advanced analytics and charts
- [ ] Budget recommendations
- [ ] Spending predictions
- [ ] Multi-currency support
- [ ] Export/backup features

## 🐛 Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is correct
- Verify Neon project is active
- Run `npm run db:push` to sync schema

### Authentication Issues
- Verify Google OAuth credentials
- Check `NEXTAUTH_URL` matches your domain
- Ensure redirect URIs are configured in Google Console

### Gemini API Issues
- Verify `GEMINI_API_KEY` is valid
- Check API quota hasn't been exceeded
- Model: `gemini-2.0-flash-exp` (update if deprecated)

## 📞 Support Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://next-auth.js.org
- **Neon Docs**: https://neon.tech/docs
- **Gemini API Docs**: https://ai.google.dev/docs

## ✅ What's Been Completed

- ✅ Full database schema with proper relations
- ✅ NextAuth Google OAuth setup
- ✅ Complete CRUD APIs for all entities
- ✅ AI-powered insights generation
- ✅ Intelligent chatbot with Gemini 2.0 Flash
- ✅ Auto-balance updates on transactions
- ✅ Smart party/category creation
- ✅ Budget tracking and alerts
- ✅ Goal progress tracking
- ✅ Notification system
- ✅ Complete API documentation
- ✅ Database setup guide
- ✅ Type safety with TypeScript
- ✅ Environment configuration

## 🎉 Ready for Frontend Integration!

The backend is fully functional and ready to be integrated with the frontend. All APIs are documented and tested. Follow the API_DOCUMENTATION.md for endpoint details.
