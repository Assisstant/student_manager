# 🚀 Deployment Guide - Full Stack Application
## Converting to Real Web App with Database

---

## 📋 Overview

This guide explains how to convert the current client-side app into a full-stack application with:
- ✅ Backend server
- ✅ Database (persistent storage)
- ✅ User authentication
- ✅ Free hosting
- ✅ Multi-user support

---

## 🏗️ Architecture Options

### Option 1: Node.js + PostgreSQL (Recommended)
**Stack**: Node.js, Express, PostgreSQL, React (optional)
- **Pros**: Modern, scalable, great free tier options
- **Cons**: Learning curve if new to Node.js
- **Best for**: Growing applications with multiple users

### Option 2: Python + SQLite/PostgreSQL
**Stack**: Python, Flask/Django, SQLite/PostgreSQL
- **Pros**: Easy to learn, rapid development
- **Cons**: Fewer free hosting options
- **Best for**: Quick prototypes, Python developers

### Option 3: Firebase (Easiest)
**Stack**: Firebase (Google), Firestore, Authentication
- **Pros**: No backend code needed, real-time sync
- **Cons**: Vendor lock-in, limited free tier
- **Best for**: Quick deployment, minimal coding

---

## 🎯 Recommended Approach: Node.js Stack

### Technology Stack
```
Frontend:  HTML, CSS, JavaScript (current code - minimal changes)
Backend:   Node.js + Express.js
Database:  PostgreSQL
Auth:      JWT (JSON Web Tokens) or Passport.js
Hosting:   Frontend: Vercel/Netlify | Backend: Render/Railway
```

---

## 📊 Database Schema Design

### Tables Structure

#### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'teacher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

#### 2. Students Table
```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    plan_type INTEGER NOT NULL CHECK (plan_type BETWEEN 1 AND 6),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Schedule Table
```sql
CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL, -- monday, tuesday, etc.
    time_slot INTEGER NOT NULL CHECK (time_slot BETWEEN 0 AND 4),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Plan Templates Table
```sql
CREATE TABLE plan_templates (
    id SERIAL PRIMARY KEY,
    plan_type INTEGER NOT NULL CHECK (plan_type BETWEEN 1 AND 6),
    activity_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Student Progress Table
```sql
CREATE TABLE student_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    activity_index INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completion_date VARCHAR(50),
    completion_time VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Backend Implementation (Node.js)

### Step 1: Initialize Project

```bash
# Create backend folder
mkdir student-manager-backend
cd student-manager-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express pg dotenv bcryptjs jsonwebtoken cors
npm install --save-dev nodemon
```

### Step 2: Project Structure

```
student-manager-backend/
├── server.js              # Main server file
├── config/
│   └── database.js        # Database configuration
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── students.js       # Student routes
│   ├── schedule.js       # Schedule routes
│   ├── plans.js          # Plan templates routes
│   └── progress.js       # Progress routes
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── models/
│   └── database.sql      # Database schema
├── .env                  # Environment variables
└── package.json
```

### Step 3: Basic Server Setup (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/progress', require('./routes/progress'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### Step 4: Database Connection (config/database.js)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
```

### Step 5: Authentication Middleware (middleware/auth.js)

```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = authenticateToken;
```

### Step 6: API Routes Example (routes/students.js)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Get all students for logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM students WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new student
router.post('/', authenticateToken, async (req, res) => {
    const { name, grade, plan_type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO students (name, grade, plan_type, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, grade, plan_type, req.user.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update student
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, grade, plan_type } = req.body;
    try {
        const result = await db.query(
            'UPDATE students SET name = $1, grade = $2, plan_type = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
            [name, grade, plan_type, id, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete student
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(
            'DELETE FROM students WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### Step 7: Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/student_manager

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# Server
PORT=3000
NODE_ENV=development
```

---

## 🌐 Frontend Changes

### Update API Calls

```javascript
// config.js - Add this file
const API_URL = 'https://your-backend-url.com/api';
// or for development: 'http://localhost:3000/api'

const getAuthToken = () => localStorage.getItem('authToken');

const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// Example: Replace localStorage with API calls
async function saveStudent() {
    const name = document.getElementById('studentName').value.trim();
    const grade = document.getElementById('studentGrade').value.trim();
    const planType = document.getElementById('studentPlanType').value;
    
    if (!name || !grade) {
        alert('Ве молиме пополнете ги сите полиња');
        return;
    }
    
    try {
        if (editingStudentId) {
            // Update existing student
            await apiRequest(`/students/${editingStudentId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, grade, plan_type: planType })
            });
        } else {
            // Create new student
            await apiRequest('/students', {
                method: 'POST',
                body: JSON.stringify({ name, grade, plan_type: planType })
            });
        }
        
        await loadStudents(); // Reload from API
        closeModal('addStudentModal');
    } catch (error) {
        alert('Грешка: ' + error.message);
    }
}

async function loadStudents() {
    try {
        students = await apiRequest('/students');
        renderStudents();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}
```

---

## 🆓 Free Hosting Options

### Backend Hosting

#### 1. **Render.com** (Recommended)
- **Free Tier**: 750 hours/month
- **Database**: Free PostgreSQL
- **Pros**: Easy setup, auto-deploy from Git
- **Cons**: Spins down after 15 min inactivity

**Setup:**
```bash
1. Push code to GitHub
2. Go to render.com
3. New → Web Service
4. Connect GitHub repo
5. Set build command: npm install
6. Set start command: node server.js
7. Add environment variables
8. Deploy!
```

#### 2. **Railway.app**
- **Free Tier**: $5 credit/month
- **Database**: Free PostgreSQL
- **Pros**: Very easy, great DX
- **Cons**: Limited free tier

#### 3. **Fly.io**
- **Free Tier**: 3 small VMs
- **Pros**: Global deployment
- **Cons**: More complex setup

### Database Hosting

#### 1. **Neon.tech** (Recommended)
- **Free Tier**: 512 MB storage, unlimited queries
- **Type**: PostgreSQL
- **Pros**: Serverless, very fast

#### 2. **Supabase**
- **Free Tier**: 500 MB database
- **Pros**: Built-in auth, real-time subscriptions
- **Cons**: Pauses after 1 week inactivity

#### 3. **ElephantSQL**
- **Free Tier**: 20 MB storage
- **Pros**: Reliable, simple
- **Cons**: Very limited storage

### Frontend Hosting

#### 1. **Vercel** (Easiest)
```bash
1. Install Vercel CLI: npm i -g vercel
2. In frontend folder: vercel
3. Follow prompts
4. Done!
```

#### 2. **Netlify**
- Drag & drop deployment
- Auto SSL
- Custom domains

#### 3. **GitHub Pages**
- Free for public repos
- Great for static sites

---

## 📝 Step-by-Step Deployment

### Phase 1: Setup Backend (Week 1)

1. **Create Backend Project**
```bash
mkdir student-manager-backend
cd student-manager-backend
npm init -y
npm install express pg dotenv bcryptjs jsonwebtoken cors
```

2. **Create Database Schema**
- Sign up for Neon.tech
- Create database
- Run SQL schema

3. **Implement API Routes**
- Auth routes (login, register)
- Students CRUD
- Schedule CRUD
- Plans CRUD
- Progress CRUD

4. **Test Locally**
```bash
npm run dev
# Test with Postman or Thunder Client
```

### Phase 2: Deploy Backend (Week 2)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial backend"
git remote add origin <your-repo>
git push -u origin main
```

2. **Deploy to Render**
- Connect GitHub
- Add environment variables
- Deploy

3. **Test Production API**
- Use Postman with production URL

### Phase 3: Update Frontend (Week 3)

1. **Add API Integration**
- Create config.js with API URL
- Replace localStorage calls with API calls
- Add loading states
- Add error handling

2. **Add Authentication UI**
- Login page
- Registration page
- JWT token management

3. **Test Integration**
- Test all features with backend

### Phase 4: Deploy Frontend (Week 4)

1. **Deploy to Vercel**
```bash
cd student-manager
vercel
```

2. **Configure CORS**
- Add frontend URL to backend CORS whitelist

3. **Final Testing**
- Test complete flow
- Test on mobile devices

---

## 🔐 Security Considerations

### Essential Security Measures

1. **Password Hashing**
```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);
```

2. **JWT Tokens**
```javascript
const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);
```

3. **Input Validation**
```javascript
const validateStudent = (data) => {
    if (!data.name || data.name.length < 2) {
        throw new Error('Invalid name');
    }
    // More validation...
};
```

4. **SQL Injection Prevention**
```javascript
// Always use parameterized queries
db.query('SELECT * FROM students WHERE id = $1', [studentId]);
// NEVER: `SELECT * FROM students WHERE id = ${studentId}`
```

5. **CORS Configuration**
```javascript
app.use(cors({
    origin: ['https://your-frontend.vercel.app'],
    credentials: true
}));
```

6. **Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

---

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Render | 750 hrs/month | Spins down after 15min |
| Neon DB | 512 MB | 1 project |
| Vercel | Unlimited | 100 GB bandwidth |
| **Total** | **$0/month** | Suitable for 1-50 users |

### When to Upgrade?

- More than 50 active users
- Need 24/7 uptime
- More than 512 MB data
- Need backups and monitoring

**Paid tier**: ~$20-30/month for serious usage

---

## 🚀 Quick Start (Fastest Way)

### Using Firebase (No Backend Code!)

1. **Create Firebase Project**
```bash
npm install firebase
```

2. **Initialize Firebase**
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-project-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
```

3. **Replace localStorage with Firestore**
```javascript
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Save student
await addDoc(collection(db, 'students'), {
    name: studentName,
    grade: studentGrade,
    planType: planType,
    userId: auth.currentUser.uid
});

// Load students
const querySnapshot = await getDocs(collection(db, 'students'));
students = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));
```

4. **Deploy**
```bash
firebase deploy
```

**Done in 1 day!** ✅

---

## 📚 Learning Resources

- **Node.js**: nodejs.dev/learn
- **Express**: expressjs.com
- **PostgreSQL**: postgresqltutorial.com
- **Firebase**: firebase.google.com/docs

---

## 🎯 Recommended Path

**For Beginners**: Start with Firebase → Migrate to Node.js later
**For Developers**: Go directly with Node.js + PostgreSQL
**For Quick Prototype**: Firebase
**For Production App**: Node.js + PostgreSQL + Proper hosting

---

## 📞 Need Help?

Common issues and solutions:
1. **CORS errors**: Check backend CORS config
2. **401 Unauthorized**: Check JWT token
3. **Database connection**: Check DATABASE_URL
4. **Slow response**: Check database queries

---

**Good luck with your deployment! 🚀**
