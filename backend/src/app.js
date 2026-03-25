import express from 'express';
import cors from 'cors';

const app = express();

function normalizeOrigin(value) {
    return value.trim().replace(/\/+$/, "");
}

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(normalizeOrigin(origin))) {
            return callback(null, true);
        }

        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

import { authenticate, requireRole } from "./middleware/authenticate.middleware.js";

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
import badgesRouter from "./routes/badges.route.js";



app.get('/health', (req, res) => {
    res.json({status: "ok"});
});
app.get('/version', (req, res) => {
    res.json({version: "campus-carbon-prototype"});
});

// Public - no auth needed
app.use('/auth', authRoutes);
app.use('/action-types', actionTypesRoutes);
app.use('/leaderboards', leaderboardsRoutes);

// Protected - JWT needed
app.use('/action-logs', authenticate, actionLogsRoutes);
app.use('/groups', authenticate, groupsRoutes);
app.use('/invites', authenticate, invitesRoutes);
app.use("/pets", authenticate, petsRouter);
app.use("/shop", authenticate, shopRouter);
app.use("/coins", authenticate, coinsRouter);
app.use("/inventory", authenticate, inventoryRouter);
app.use("/badges", authenticate, badgesRouter);

// Challenges - GET routes are public, write routes (POST/PATCH/DELETE) are moderator only
app.use('/', challengesRoutes);

// Submissions - authenticated users only
app.use('/', authenticate, submissionsRoutes);

// Moderation - moderator/maintainer role needed
app.use('/', authenticate, requireRole("moderator", "maintainer"), moderationRoutes);

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
