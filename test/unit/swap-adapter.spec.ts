import { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants } from 'ethers';
import { behaviours } from '@utils';
import { then, when } from '@utils/bdd';
import { ISwapperRegistry, SwapAdapterMock, SwapAdapterMock__factory } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';

describe('SwapAdapter', () => {
  let swapAdapterFactory: SwapAdapterMock__factory;
  let swapAdapter: SwapAdapterMock;
  let registry: FakeContract<ISwapperRegistry>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    registry = await smock.fake('ISwapperRegistry');
    swapAdapterFactory = await ethers.getContractFactory('solidity/contracts/test/SwapAdapter.sol:SwapAdapterMock');
    swapAdapter = await swapAdapterFactory.deploy(registry.address);
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('constructor', () => {
    when('registry is zero address', () => {
      then('tx is reverted with reason error', async () => {
        await behaviours.deployShouldRevertWithMessage({
          contract: swapAdapterFactory,
          args: [constants.AddressZero],
          message: 'ZeroAddress',
        });
      });
    });
    when('all arguments are valid', () => {
      then('registry is set correctly', async () => {
        expect(await swapAdapter.SWAPPER_REGISTRY()).to.equal(registry.address);
      });
    });
  });
});
