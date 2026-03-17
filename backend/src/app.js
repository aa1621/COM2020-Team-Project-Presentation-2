import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

import actionTypesRoutes from './routes/actionTypes.route.js';
import actionLogsRoutes from './routes/actionLogs.route.js';
import authRoutes from './routes/auth.route.js';
import submissionsRoutes from './routes/submissions.route.js';
import challengesRoutes from './routes/challenges.route.js';
import moderationRoutes from './routes/moderation.route.js';
import groupsRoutes from './routes/groups.route.js';
import invitesRoutes from './routes/invites.route.js';
import leaderboardsRoutes from './routes/leaderboards.route.js';
import petsRouter from "./routes/pets.route.js";
import shopRouter from "./routes/shop.route.js";
import coinsRouter from "./routes/coins.route.js";
import inventoryRouter from "./routes/inventory.route.js";



app.get('/health', (req, res) => {
    res.json({status: "ok"});
});
app.get('/version', (req, res) => {
    res.json({version: "week5-demo"});
});

app.use('/action-types', actionTypesRoutes);
app.use('/action-logs', actionLogsRoutes);
app.use('/auth', authRoutes);
app.use('/groups', groupsRoutes);
app.use('/invites', invitesRoutes);
app.use('/leaderboards', leaderboardsRoutes);
app.use('/', submissionsRoutes);
app.use('/', challengesRoutes);
app.use('/', moderationRoutes);
app.use("/pets", petsRouter);
app.use("/shop", shopRouter);
app.use("/coins", coinsRouter);
app.use("/inventory", inventoryRouter);

app.get('/errortest', (req, res) => {
    throw new Error("Testing error");
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({error: "Route not found" });
});

// Main error handler
app.use((err, req, res, next) => {
    console.error("Error:", err);

    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error"
    });
});

export default app;
