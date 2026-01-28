import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import https from 'https';
import { query } from '../core/pool';
import crypto from 'crypto';
import { AppCard, BulkCardResponse, BulkDataResponse, ScryfallCard } from './types';
import { IncomingMessage } from 'http';
import logger from '../core/logger';

// Fetch latest bulk data URL from Scryfall
async function getLatestBulkUrl(): Promise<string> {
	return new Promise((resolve, reject) => {
		const options = {
			hostname: 'api.scryfall.com',
			path: '/bulk-data',
			headers: {
				'User-Agent': 'duel.me/0.1.0 (+https://github.com/christopherbauer/duel.me)',
				Accept: 'application/json',
			},
		};

		https
			.get(options, (response) => {
				let data = '';
				response.on('data', (chunk: string) => (data += chunk));
				response.on('end', () => {
					try {
						const json = JSON.parse(data) as BulkDataResponse;
						const oracleCards = json.data?.find((item) => item.type === 'oracle_cards');
						if (oracleCards && oracleCards.download_uri) {
							resolve(oracleCards.download_uri);
						} else {
							reject(new Error(`Oracle cards not found in bulk data. Got: ${JSON.stringify(json).substring(0, 200)}`));
						}
					} catch (e) {
						reject(e);
					}
				});
			})
			.on('error', reject);
	});
}

let SCRYFALL_BULK_URL: string = '';

async function downloadAndSeedCards() {
	logger.info('Fetching latest Scryfall bulk data URL...');
	try {
		SCRYFALL_BULK_URL = await getLatestBulkUrl();
		logger.info(`Using: ${SCRYFALL_BULK_URL}`);
	} catch (error) {
		logger.info('Failed to fetch Scryfall bulk data URL');
		logger.catchError(error);
		throw error;
	}

	logger.info('Starting Scryfall bulk card import...');
	return new Promise<void>((resolve, reject) => {
		const handleResponse = async (response: IncomingMessage) => {
			// Handle redirects
			if (response.statusCode === 301 || response.statusCode === 302) {
				const redirectUrl = response.headers.location;
				logger.info(`Following redirect to: ${redirectUrl}`);
				if (!redirectUrl) {
					throw new Error('Redirect location missing');
				}
				https.get(redirectUrl, handleResponse).on('error', reject);
				return;
			}

			if (!response || response.statusCode !== 200) {
				return reject(new Error(`Failed to download: ${response?.statusCode}`));
			}

			try {
				let buffer = '';
				let cardCount = 0;
				const batchSize = 50;
				let batch: AppCard[] = [];
				let hasher = crypto.createHash('sha256');

				response.on('data', async (chunk: Buffer) => {
					const str = chunk.toString();
					hasher.update(str);
					buffer += str;

					// Process complete lines only, keep incomplete line in buffer
					const lines = buffer.split('\n');
					// Last element is incomplete (or empty if buffer ends with \n)
					buffer = lines.pop() || '';

					for (const line of lines) {
						const trimmed = line.trim();

						// Skip array markers and empty lines
						if (trimmed === '[' || trimmed === ']' || trimmed === '' || trimmed === ',') continue;

						let cleanLine = trimmed;
						if (cleanLine.endsWith(',')) {
							cleanLine = cleanLine.slice(0, -1);
						}

						try {
							const card: ScryfallCard = JSON.parse(cleanLine);
							batch.push(card);
							cardCount++;

							if (batch.length >= batchSize) {
								// Pause to let database catch up
								response.pause();
								await insertCardBatch(batch);
								batch = [];
								logger.info(`Processed ${cardCount} cards... (Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB)`);
								response.resume();
							}
						} catch (error) {
							logger.error(`Line parse error (skipping) L${line}`);
							logger.catchError(error);
						}
					}
				});

				response.on('end', async () => {
					// Insert remaining batch
					if (batch.length > 0) {
						await insertCardBatch(batch);
					}

					const checksum = hasher.digest('hex');

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

		https.get(SCRYFALL_BULK_URL, handleResponse).on('error', reject);
	});
}

async function insertCardBatch(cards: ScryfallCard[]) {
	// Using multi-row insert with ON CONFLICT for upsertion
	const values = cards
		.map((card, i) => {
			const offset = i * 40;
			return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${
				offset + 8
			}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${
				offset + 16
			}::jsonb, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${
				offset + 20
			}, $${offset + 21}, $${offset + 22}, $${offset + 23}::jsonb, $${
				offset + 24
			}::jsonb, $${offset + 25}::jsonb, $${offset + 26}::jsonb, $${offset + 27}::jsonb, $${offset + 28}::jsonb, $${offset + 29}, $${
				offset + 30
			}, $${offset + 31}::jsonb, $${offset + 32}::jsonb, $${offset + 33}::jsonb, $${offset + 34}, $${offset + 35}, $${offset + 36}, $${
				offset + 37
			}, $${offset + 38}, $${offset + 39}, $${offset + 40}::jsonb)`;
		})
		.join(',');

	const params = cards.flatMap((card) => [
		card.object,
		card.id,
		card.oracle_id,
		JSON.stringify(card.multiverse_ids || []),
		card.mtgo_id || null,
		card.tcgplayer_id || null,
		card.cardmarket_id || null,
		card.name,
		card.lang,
		card.released_at,
		card.uri,
		card.scryfall_uri,
		card.layout,
		card.highres_image,
		card.image_status,
		JSON.stringify(card.image_uris || {}),
		card.mana_cost || null,
		card.cmc || null,
		card.type_line,
		card.oracle_text || null,
		card.power || null,
		card.toughness || null,
		JSON.stringify(card.colors || []),
		JSON.stringify(card.color_identity || []),
		JSON.stringify(card.keywords || []),
		JSON.stringify(card.all_parts || []),
		JSON.stringify(card.legalities || {}),
		JSON.stringify(card.games || []),
		card.reserved,
		card.game_changer,
		JSON.stringify(card.foil || {}),
		JSON.stringify(card.nonfoil || {}),
		JSON.stringify(card.finishes || []),
		card.oversized,
		card.promo,
		card.reprint,
		card.variation,
		card.set,
		card.rarity || null,
		JSON.stringify(card.card_faces || []),
	]);

	const sql = `
    INSERT INTO cards (
      object, id, oracle_id, multiverse_ids, mtgo_id, tcgplayer_id, cardmarket_id,
      name, lang, released_at, uri, scryfall_uri, layout, highres_image,
      image_status, image_uris, mana_cost, cmc, type_line, oracle_text, power,
      toughness, colors, color_identity, keywords, all_parts, legalities, games,
      reserved, game_changer, foil, nonfoil, finishes, oversized, promo, reprint,
      variation, set, rarity, card_faces
    )
    VALUES ${values}
    ON CONFLICT (id) DO UPDATE
    SET oracle_id = EXCLUDED.oracle_id,
        name = EXCLUDED.name,
        type_line = EXCLUDED.type_line,
        oracle_text = EXCLUDED.oracle_text,
        mana_cost = EXCLUDED.mana_cost,
        cmc = EXCLUDED.cmc,
        power = EXCLUDED.power,
        toughness = EXCLUDED.toughness,
        colors = EXCLUDED.colors,
        color_identity = EXCLUDED.color_identity,
        keywords = EXCLUDED.keywords,
        image_uris = EXCLUDED.image_uris,
        card_faces = EXCLUDED.card_faces,
        legalities = EXCLUDED.legalities,
        rarity = EXCLUDED.rarity,
        updated_at = NOW()
  `;

	await query(sql, params);
}

export async function seedCards() {
	try {
		await downloadAndSeedCards();
		logger.info('Card seeding completed');
	} catch (error) {
		logger.info('Card seeding failed');
		logger.catchError(error);
		process.exit(1);
	}
}

if (require.main === module) {
	seedCards().then(() => process.exit(0));
}
