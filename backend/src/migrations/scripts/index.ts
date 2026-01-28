import { migration_001 } from './001 - Initial script';
import { migration_002 } from './002 - Minor update';
import { migration_003 } from './003 - Add order to game_objects';
import { migration_004 } from './004 - Add indicators table';
import { migration005 } from './005 - Add 4-player support';
import { migration006 } from './006 - Add card_faces support';

export const migrations = [migration_001, migration_002, migration_003, migration_004, migration005, migration006];
