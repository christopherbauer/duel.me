import { createReadStream } from "fs";
import { createInterface } from "readline";
import https from "https";
import { query } from "../db/pool";
import crypto from "crypto";
import {
	AppCard,
	BulkCardResponse,
	BulkDataResponse,
	ScryfallCard,
} from "./types";
import { IncomingMessage } from "http";
import logger from "../core/logger";

// Fetch latest bulk data URL from Scryfall
async function getLatestBulkUrl(): Promise<string> {
	return new Promise((resolve, reject) => {
		const options = {
			hostname: "api.scryfall.com",
			path: "/bulk-data",
			headers: {
				"User-Agent":
					"duel.me/0.1.0 (+https://github.com/christopherbauer/duel.me)",
				Accept: "application/json",
			},
		};

		https
			.get(options, (response) => {
				let data = "";
				response.on("data", (chunk: string) => (data += chunk));
				response.on("end", () => {
					try {
						const json = JSON.parse(data) as BulkDataResponse;
						const oracleCards = json.data?.find(
							(item) => item.type === "oracle_cards"
						);
						if (oracleCards && oracleCards.download_uri) {
							resolve(oracleCards.download_uri);
						} else {
							reject(
								new Error(
									`Oracle cards not found in bulk data. Got: ${JSON.stringify(
										json
									).substring(0, 200)}`
								)
							);
						}
					} catch (e) {
						reject(e);
					}
				});
			})
			.on("error", reject);
	});
}

let SCRYFALL_BULK_URL: string = "";

async function downloadAndSeedCards() {
	logger.info("Fetching latest Scryfall bulk data URL...");
	try {
		SCRYFALL_BULK_URL = await getLatestBulkUrl();
		logger.info(`Using: ${SCRYFALL_BULK_URL}`);
	} catch (error) {
		logger.info("Failed to fetch Scryfall bulk data URL");
		logger.catchError(error);
		throw error;
	}

	logger.info("Starting Scryfall bulk card import...");
	return new Promise<void>((resolve, reject) => {
		const handleResponse = async (response: IncomingMessage) => {
			// Handle redirects
			if (response.statusCode === 301 || response.statusCode === 302) {
				const redirectUrl = response.headers.location;
				logger.info(`Following redirect to: ${redirectUrl}`);
				if (!redirectUrl) {
					throw new Error("Redirect location missing");
				}
				https.get(redirectUrl, handleResponse).on("error", reject);
				return;
			}

			if (!response || response.statusCode !== 200) {
				return reject(
					new Error(`Failed to download: ${response?.statusCode}`)
				);
			}

			try {
				let buffer = "";
				let cardCount = 0;
				const batchSize = 50;
				let batch: AppCard[] = [];
				let hasher = crypto.createHash("sha256");

				response.on("data", async (chunk: Buffer) => {
					const str = chunk.toString();
					hasher.update(str);
					buffer += str;

					// Process complete lines only, keep incomplete line in buffer
					const lines = buffer.split("\n");
					// Last element is incomplete (or empty if buffer ends with \n)
					buffer = lines.pop() || "";

					for (const line of lines) {
						const trimmed = line.trim();

						// Skip array markers and empty lines
						if (
							trimmed === "[" ||
							trimmed === "]" ||
							trimmed === "" ||
							trimmed === ","
						)
							continue;

						let cleanLine = trimmed;
						if (cleanLine.endsWith(",")) {
							cleanLine = cleanLine.slice(0, -1);
						}

						try {
							const card: ScryfallCard = JSON.parse(cleanLine);

							// Transform and batch insert
							batch.push({
								scryfall_id: card.id,
								is_legal_commander:
									!card.legalities ||
									card.legalities.commander !== "banned",
								...card,
							});

							cardCount++;

							if (batch.length >= batchSize) {
								// Pause to let database catch up
								response.pause();
								await insertCardBatch(batch);
								batch = [];
								logger.info(
									`Processed ${cardCount} cards... (Memory: ${Math.round(
										process.memoryUsage().heapUsed /
											1024 /
											1024
									)}MB)`
								);
								response.resume();
							}
						} catch (error) {
							logger.error(
								`Line parse error (skipping) L${line}`
							);
							logger.catchError(error);
						}
					}
				});

				response.on("end", async () => {
					// Insert remaining batch
					if (batch.length > 0) {
						await insertCardBatch(batch);
					}

					const checksum = hasher.digest("hex");

					// Record snapshot metadata
					await query(
						`INSERT INTO card_snapshots (dataset_type, source_url, checksum, total_cards)
             VALUES ('scryfall', $1, $2, $3)`,
						[SCRYFALL_BULK_URL, checksum, cardCount]
					);

					logger.info(`✓ Imported ${cardCount} cards successfully`);
					resolve();
				});
			} catch (error) {
				reject(error);
			}
		};

		https.get(SCRYFALL_BULK_URL, handleResponse).on("error", reject);
	});
}

async function insertCardBatch(cards: AppCard[]) {
	// Using multi-row insert with ON CONFLICT for upsertion
	const values = cards
		.map((card, i) => {
			const offset = i * 7;
			return `($${offset + 1}::uuid, $${offset + 2}, $${offset + 3}, $${
				offset + 4
			}, $${offset + 5}, $${offset + 6}, $${offset + 7}::jsonb)`;
		})
		.join(",");

	const params = cards.flatMap((card) => [
		card.scryfall_id,
		card.name,
		card.type_line,
		card.oracle_text || null,
		card.mana_cost || null,
		card.colors || [],
		JSON.stringify({
			cmc: card.cmc,
			power: card.power,
			toughness: card.toughness,
			color_identity: card.color_identity,
			keywords: card.keywords,
			is_legal_commander: card.is_legal_commander,
			layout: card.layout,
			image_uris: card.image_uris,
		}),
	]);

	const sql = `
    INSERT INTO cards (scryfall_id, name, type_line, oracle_text, mana_cost, colors, image_uris)
    VALUES ${values}
    ON CONFLICT (scryfall_id) DO UPDATE
    SET name = EXCLUDED.name,
        type_line = EXCLUDED.type_line,
        updated_at = NOW()
  `;

	await query(sql, params);
}

export async function seedCards() {
	try {
		await downloadAndSeedCards();
		logger.info("Card seeding completed");
	} catch (error) {
		logger.info("Card seeding failed");
		logger.catchError(error);
		process.exit(1);
	}
}

if (require.main === module) {
	seedCards().then(() => process.exit(0));
}
