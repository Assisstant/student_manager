# 🚀 Student Manager Backend API

Backend API for the Student Treatment Manager application.

---

## 📋 Quick Start

### Prerequisites
- Node.js 16+ installed
- PostgreSQL database (local or cloud)

### Installation

1. **Clone and Navigate**
```bash
cd backend-example
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Environment Variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your database credentials
```

4. **Setup Database**
```bash
# Create database
createdb student_manager

# Run schema
psql student_manager < database.sql

# Or use pgAdmin/DBeaver to run database.sql
```

5. **Start Server**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

---

## 🔌 API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "teacher1",
  "email": "teacher@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "teacher1",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "teacher1",
    "email": "teacher@example.com"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### Students

#### Get All Students
```http
GET /api/students
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Single Student
```http
GET /api/students/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Create Student
```http
POST /api/students
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Марија Чадамова",
  "grade": "VI-а",
  "plan_type": 1,
  "notes": "Optional notes"
}
```

#### Update Student
```http
PUT /api/students/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Марија Чадамова",
  "grade": "VI-а",
  "plan_type": 2
}
```

#### Delete Student
```http
DELETE /api/students/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🗂️ Project Structure

```
backend-example/
├── server.js              # Main entry point
├── config/
│   └── database.js       # Database connection
├── routes/
│   ├── auth.js          # Authentication endpoints
│   ├── students.js      # Student CRUD
│   ├── schedule.js      # Schedule management
│   ├── plans.js         # Plan templates
│   └── progress.js      # Progress tracking
├── middleware/
│   └── auth.js          # JWT authentication
├── database.sql         # Database schema
├── .env.example         # Environment template
└── package.json         # Dependencies
```

---

## 🔐 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- SQL injection prevention (parameterized queries)
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation

---

## 🧪 Testing with Postman/Thunder Client

### 1. Register a User
```
POST http://localhost:3000/api/auth/register
Body: {
  "username": "demo",
  "email": "demo@example.com",
  "password": "demo123"
}
```

### 2. Login
```
POST http://localhost:3000/api/auth/login
Body: {
  "username": "demo",
  "password": "demo123"
}
```
Copy the `token` from response!

### 3. Create a Student
```
POST http://localhost:3000/api/students
Headers: Authorization: Bearer YOUR_TOKEN_HERE
Body: {
  "name": "Test Student",
  "grade": "V-б",
  "plan_type": 1
}
```

---

## 🚀 Deployment

### Deploy to Render.com

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial backend"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

2. **Create Web Service on Render**
- Go to render.com
- New → Web Service
- Connect your GitHub repo
- Build Command: `npm install`
- Start Command: `npm start`

3. **Add Environment Variables**
```
DATABASE_URL (from Render PostgreSQL)
JWT_SECRET (generate random 32+ char string)
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

4. **Create PostgreSQL Database**
- On Render: New → PostgreSQL
- Copy DATABASE_URL
- Paste into Web Service environment variables

5. **Deploy**
- Click "Create Web Service"
- Wait for deployment
- Run database.sql in database

---

## 📊 Database Management

### Using psql
```bash
# Connect
psql -d student_manager

# List tables
\dt

# View data
SELECT * FROM users;
SELECT * FROM students;

# Quit
\q
```

### Using GUI Tools
- **pgAdmin** (Free, powerful)
- **DBeaver** (Free, cross-platform)
- **Postico** (Mac only, beautiful)

---

## 🔧 Development Tips

### Watch Logs
```bash
npm run dev
# Server logs all queries and errors
```

### Reset Database
```bash
psql student_manager < database.sql
```

### Test API
```bash
curl http://localhost:3000/api/health
```

---

## 📝 TODO

Create remaining routes:
- [ ] `routes/schedule.js` - Schedule management
- [ ] `routes/plans.js` - Plan templates
- [ ] `routes/progress.js` - Progress tracking

All follow the same pattern as `students.js`!

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL in .env
- Make sure PostgreSQL is running
- Test connection: `psql -d student_manager`

### "Invalid token"
- Token might be expired (7 days default)
- Login again to get new token
- Check JWT_SECRET is set

### "Port 3000 already in use"
- Change PORT in .env
- Or kill process: `npx kill-port 3000`

---

## 📚 Resources

- **Express.js**: https://expressjs.com
- **PostgreSQL**: https://postgresqltutorial.com
- **JWT**: https://jwt.io
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js

---

## 📞 Support

For help, check:
- Main DEPLOYMENT_GUIDE.md
- Express.js documentation
- PostgreSQL documentation

---

**Happy coding! 🎉**
