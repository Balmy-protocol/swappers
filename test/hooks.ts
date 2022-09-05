import { GasSnapshotReporter } from '@mean-finance/web3-utilities';
import path from 'path';

export const mochaHooks = (): Mocha.RootHookObject => {
  return {
    async beforeAll() {
      await GasSnapshotReporter.initialize({ snapshotFilePath: path.resolve(__dirname, '../') });
    },
  };
};
