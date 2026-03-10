import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import loanRoutes from './routes/loan.routes';
import equipmentRoutes from './routes/equipment.routes';
import statsRoutes from './routes/stats.routes';
import userRoutes from './routes/user.routes';
import accountTypeRoutes from './routes/accountType.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/loans', loanRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/account-types', accountTypeRoutes);

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'GEB Equipment Loan API is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

export default app;
