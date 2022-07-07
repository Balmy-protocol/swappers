import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants } from 'ethers';
import { behaviours } from '@utils';
import { given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { SwapProxy, SwapProxy__factory, ISwapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';

chai.use(smock.matchers);

describe('SwapProxy', () => {
  let superAdmin: SignerWithAddress, admin: SignerWithAddress;
  let swapProxyFactory: SwapProxy__factory;
  let swapProxy: SwapProxy;
  let superAdminRole: string, adminRole: string;
  let swapper1: FakeContract<ISwapper>, swapper2: FakeContract<ISwapper>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [, superAdmin, admin] = await ethers.getSigners();
    swapProxyFactory = await ethers.getContractFactory('solidity/contracts/SwapProxy.sol:SwapProxy');
    swapper1 = await smock.fake<ISwapper>('ISwapper');
    swapper2 = await smock.fake<ISwapper>('ISwapper');
    swapProxy = await swapProxyFactory.deploy([swapper1.address], superAdmin.address, [admin.address]);
    superAdminRole = await swapProxy.SUPER_ADMIN_ROLE();
    adminRole = await swapProxy.ADMIN_ROLE();
    snapshotId = await snapshot.take();
  });

  beforeEach('Deploy and configure', async () => {
    await snapshot.revert(snapshotId);
  });

  describe('constructor', () => {
    when('super admin is zero address', () => {
      then('tx is reverted with reason error', async () => {
        await behaviours.deployShouldRevertWithMessage({
          contract: swapProxyFactory,
          args: [[], constants.AddressZero, []],
          message: 'ZeroAddress',
        });
      });
    });
    when('all arguments are valid', () => {
      then('super admin is set correctly', async () => {
        const hasRole = await swapProxy.hasRole(superAdminRole, superAdmin.address);
        expect(hasRole).to.be.true;
      });
      then('initial admins are set correctly', async () => {
        const hasRole = await swapProxy.hasRole(adminRole, admin.address);
        expect(hasRole).to.be.true;
      });
      then('super admin role is set as admin role', async () => {
        const admin = await swapProxy.getRoleAdmin(adminRole);
        expect(admin).to.equal(superAdminRole);
      });
      then('initial allowlisted are set correctly', async () => {
        expect(await swapProxy.isAllowlisted(swapper1.address)).to.be.true;
      });
    });
  });

  describe('allowSwappers', () => {
    when('swapper is allowed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapProxy.connect(admin).allowSwappers([swapper2.address]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapProxy.isAllowlisted(swapper2.address)).to.be.true;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapProxy, 'AllowedSwappers').withArgs([swapper2.address]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapProxy,
      funcAndSignature: 'allowSwappers',
      params: () => [[swapper2.address]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });
});
