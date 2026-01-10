/**
 * CFO Dashboard Backend Server
 * Express server with SQLite database
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'cfo-dashboard-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
let db;
const dbPath = path.join(__dirname, 'cfo_database.db');

async function initDatabase() {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Create tables
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                department TEXT,
                jobTitle TEXT,
                phone TEXT,
                status TEXT DEFAULT 'active',
                allowedPages TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS trial_balance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS statements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                statement_type TEXT NOT NULL,
                year INTEGER NOT NULL,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource TEXT,
                details TEXT,
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Create default admin user if not exists
        const adminExists = await db.get('SELECT id FROM users WHERE email = ?', ['admin@bonyan.com']);
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.run(
                'INSERT INTO users (email, username, password, name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
                ['admin@bonyan.com', 'admin', hashedPassword, 'Administrator', 'admin', 'active']
            );
            console.log('✅ Default admin user created: admin@bonyan.com / admin123');
        }

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

// Auth middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT * FROM users WHERE id = ? AND status = ?', [decoded.userId, 'active']);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, name, 'user', 'active']
        );

        const user = await db.get('SELECT id, email, name, role, allowedPages FROM users WHERE id = ?', [result.lastID]);
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Save session
        await db.run('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [user.id, token]);

        res.json({ token, user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Save session
        await db.run('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [user.id, token]);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        const allowedPages = user.allowedPages ? JSON.parse(user.allowedPages) : null;

        res.json({
            token,
            user: {
                ...userWithoutPassword,
                allowedPages
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            await db.run('DELETE FROM sessions WHERE token = ?', [token]);
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, email, username, name, role, department, jobTitle, phone, status, allowedPages FROM users WHERE id = ?', [req.user.id]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const allowedPages = user.allowedPages ? JSON.parse(user.allowedPages) : null;
        res.json({ user: { ...user, allowedPages } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ==================== TRIAL BALANCE ROUTES ====================
app.post('/api/trial-balance/upload', authenticateToken, async (req, res) => {
    try {
        const data = req.body;
        await db.run(
            'INSERT INTO trial_balance (user_id, data) VALUES (?, ?)',
            [req.user.id, JSON.stringify(data)]
        );
        res.json({ message: 'Trial balance uploaded successfully' });
    } catch (error) {
        console.error('Trial balance upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/api/trial-balance', authenticateToken, async (req, res) => {
    try {
        const records = await db.all(
            'SELECT id, data, created_at FROM trial_balance WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(records.map(r => ({ ...r, data: JSON.parse(r.data) })));
    } catch (error) {
        console.error('Get trial balance error:', error);
        res.status(500).json({ error: 'Failed to get trial balance' });
    }
});

app.get('/api/trial-balance/:id', authenticateToken, async (req, res) => {
    try {
        const record = await db.get(
            'SELECT id, data, created_at FROM trial_balance WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ ...record, data: JSON.parse(record.data) });
    } catch (error) {
        console.error('Get trial balance error:', error);
        res.status(500).json({ error: 'Failed to get trial balance' });
    }
});

app.delete('/api/trial-balance/:id', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM trial_balance WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error('Delete trial balance error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ==================== STATEMENTS ROUTES ====================
app.post('/api/statements/save', authenticateToken, async (req, res) => {
    try {
        const { statementType, year, data } = req.body;
        await db.run(
            'INSERT INTO statements (user_id, statement_type, year, data) VALUES (?, ?, ?, ?)',
            [req.user.id, statementType, year, JSON.stringify(data)]
        );
        res.json({ message: 'Statement saved successfully' });
    } catch (error) {
        console.error('Save statement error:', error);
        res.status(500).json({ error: 'Save failed' });
    }
});

app.get('/api/statements/:type/latest', authenticateToken, async (req, res) => {
    try {
        const record = await db.get(
            'SELECT * FROM statements WHERE user_id = ? AND statement_type = ? ORDER BY created_at DESC LIMIT 1',
            [req.user.id, req.params.type]
        );
        if (!record) {
            return res.status(404).json({ error: 'Statement not found' });
        }
        res.json({ ...record, data: JSON.parse(record.data) });
    } catch (error) {
        console.error('Get statement error:', error);
        res.status(500).json({ error: 'Failed to get statement' });
    }
});

// ==================== USERS ROUTES (Admin) ====================
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await db.all(
            'SELECT id, email, username, name, role, department, jobTitle, phone, status, allowedPages, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users.map(u => ({ ...u, allowedPages: u.allowedPages ? JSON.parse(u.allowedPages) : null })));
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

app.post('/api/users/create', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { email, username, password, name, role = 'user', department, jobTitle, phone, status = 'active' } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.run(
            'INSERT INTO users (email, username, password, name, role, department, jobTitle, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [email, username, hashedPassword, name, role, department, jobTitle, phone, status]
        );

        const user = await db.get('SELECT id, email, username, name, role, department, jobTitle, phone, status FROM users WHERE id = ?', [result.lastID]);
        res.json(user);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, department, jobTitle, phone } = req.body;
        await db.run(
            'UPDATE users SET name = ?, department = ?, jobTitle = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, department, jobTitle, phone, req.params.id]
        );

        const user = await db.get('SELECT id, email, username, name, role, department, jobTitle, phone, status FROM users WHERE id = ?', [req.params.id]);
        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.put('/api/users/:id/permissions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { allowedPages } = req.body;
        await db.run(
            'UPDATE users SET allowedPages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(allowedPages), req.params.id]
        );

        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Update permissions error:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

app.post('/api/users/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { status } = req.body;
        await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.post('/api/users/:id/reset-password', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, req.params.id]);
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

app.post('/api/users/:id/logout-all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);
        res.json({ message: 'All sessions logged out' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ error: 'Failed to logout all sessions' });
    }
});

app.get('/api/users/:id/permissions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = await db.get('SELECT allowedPages FROM users WHERE id = ?', [req.params.id]);
        res.json({ allowedPages: user?.allowedPages ? JSON.parse(user.allowedPages) : null });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ error: 'Failed to get permissions' });
    }
});

app.put('/api/users/:id/custom-permissions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { allowedPages } = req.body;
        await db.run(
            'UPDATE users SET allowedPages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(allowedPages), req.params.id]
        );
        res.json({ message: 'Custom permissions updated' });
    } catch (error) {
        console.error('Update custom permissions error:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

app.post('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (req.user.role !== 'admin') {
            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, userId]);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ==================== AUDIT LOGS ====================
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json(logs);
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
    }
});

// Start server
async function startServer() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);
            console.log(`🔑 Default admin: admin@bonyan.com / admin123\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

