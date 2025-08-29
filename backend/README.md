# VideoChat MLM Backend API

RESTful API backend for the VideoChat MLM application with PostgreSQL database.

## 🚀 Features

- **Authentication**: JWT-based authentication with registration and login
- **User Management**: Profile management and user operations
- **MLM System**: 6-level commission tracking and network management
- **Room Management**: Create and manage video chat rooms
- **Payment Processing**: Handle membership payments with crypto currencies
- **Commission Distribution**: Automatic MLM commission distribution
- **Security**: Rate limiting, input validation, and secure headers

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Development**: tsx for TypeScript execution

## 📦 Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup PostgreSQL database**:
   - Install PostgreSQL locally or use a cloud service
   - Create a database named `videochat_mlm_db`
   - Update the `DATABASE_URL` in `.env` file

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Generate Prisma client and run migrations**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

6. **Seed the database with demo data**:
   ```bash
   npm run db:seed
   ```

## 🔧 Development

### Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Database commands:
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with demo data
npm run db:seed
```

### Build for production:
```bash
npm run build
npm start
```

## 📊 Database Schema

### Users
- User authentication and profile information
- MLM sponsor relationships
- Membership status and earnings tracking

### Rooms
- Video chat room management
- Creator and participant tracking
- Room settings and permissions

### Payments
- Membership payment processing
- Transaction hash tracking
- Payment status management

### MLM Commissions
- Commission tracking for 6 MLM levels
- Payment-to-commission relationships
- Commission status and amounts

## 🔐 API Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Demo Credentials
- **Email**: `demo@example.com`
- **Password**: `demo123`

## 🛣️ API Routes

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /demo-login` - Demo user login
- `GET /me` - Get current user profile
- `POST /refresh` - Refresh JWT token

### Users (`/api/users`)
- `GET /profile` - Get detailed user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `GET /:id` - Get user by ID
- `GET /` - Get users list (MLM network)
- `GET /search/:query` - Search users
- `GET /stats/overview` - Get user statistics

### Rooms (`/api/rooms`)
- `GET /` - Get all active rooms
- `GET /:id` - Get room by ID
- `POST /` - Create new room (requires membership)
- `PUT /:id` - Update room (creator only)
- `DELETE /:id` - Delete room (creator only)
- `POST /:id/join` - Join a room
- `POST /:id/leave` - Leave a room
- `GET /my/created` - Get user's created rooms

### Payments (`/api/payments`)
- `GET /` - Get payment history
- `GET /:id` - Get payment by ID
- `POST /` - Create new payment
- `GET /stats/overview` - Get payment statistics
- `POST /:id/verify` - Verify payment (admin)

### MLM (`/api/mlm`)
- `GET /network` - Get MLM network structure
- `GET /commissions` - Get commission history
- `GET /stats` - Get MLM statistics
- `GET /levels/:level` - Get users at specific level
- `GET /referral-link` - Get referral information
- `GET /earnings-report` - Get detailed earnings report

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Joi schema validation for all inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers for Express
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds

## 💰 MLM System

The MLM system supports 6 levels of commissions:

1. **Commission Amount**: $1 USD per level
2. **Level Depth**: Up to 6 levels deep
3. **Membership Requirement**: Only users with active membership receive commissions
4. **Automatic Distribution**: Commissions are distributed automatically when payments are processed
5. **Real-time Tracking**: All commissions are tracked in real-time

## 🌐 Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/videochat_mlm_db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MLM_COMMISSION_AMOUNT=1
MLM_MAX_LEVELS=6
MEMBERSHIP_DURATION_DAYS=28
MEMBERSHIP_PRICE_USD=10
```

## 🧪 Testing

The API includes demo data for testing:

1. **Demo User**: Complete MLM structure with commissions
2. **Sample Rooms**: Various room types and topics
3. **Payment History**: Example transactions and commissions
4. **MLM Network**: Multi-level referral structure

## 📈 Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use production PostgreSQL instance
3. **Security**: Update JWT_SECRET and other sensitive variables
4. **SSL**: Enable HTTPS for production
5. **Monitoring**: Add logging and monitoring solutions

## 🔧 Development Tools

- **Prisma Studio**: Database GUI at `http://localhost:5555`
- **API Documentation**: Available at `/health` endpoint
- **Error Logging**: Detailed error messages in development mode
- **Hot Reload**: Automatic server restart on file changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.
