import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { migrate } from "./migrations/migrate";
import { query, closePool } from "./db/pool";
import cardsRouter from "./routes/cards";
import decksRouter from "./routes/decks";
import gamesRouter from "./routes/games";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "duel.me API",
			version: "0.1.0",
			description: "Commander Duel Playtester API",
		},
		servers: [
			{
				url: `http://localhost:${PORT}`,
				description: "Development server",
			},
		],
	},
	apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

// Routes
app.use("/api/cards", cardsRouter);
app.use("/api/decks", decksRouter);
app.use("/api/games", gamesRouter);

// Error handling
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		console.error("Unhandled error:", err);
		res.status(500).json({ error: "Internal server error" });
	}
);

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("SIGTERM signal received: closing HTTP server");
	await closePool();
	process.exit(0);
});

// Initialize and start
async function main() {
	try {
		console.log("Initializing database...");
		await migrate();
		console.log("Database initialized");

		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
			console.log(
				`Swagger docs available at http://localhost:${PORT}/api-docs`
			);
		});
	} catch (error) {
		console.error("Initialization failed:", error);
		process.exit(1);
	}
}

main();
