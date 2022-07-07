import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants } from 'ethers';
import { behaviours } from '@utils';
import { then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { SwapProxy, SwapProxy__factory, ISwapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';

chai.use(smock.matchers);

describe('SwapProxy', () => {
  let superAdmin: SignerWithAddress, admin: SignerWithAddress;
  let swapProxyFactory: SwapProxy__factory;
  let swapProxy: SwapProxy;
  let superAdminRole: string, adminRole: string;
  let swapper: FakeContract<ISwapper>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [, superAdmin, admin] = await ethers.getSigners();
    swapProxyFactory = await ethers.getContractFactory('solidity/contracts/SwapProxy.sol:SwapProxy');
    swapper = await smock.fake<ISwapper>('ISwapper');
    swapProxy = await swapProxyFactory.deploy([swapper.address], superAdmin.address, [admin.address]);
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
        expect(await swapProxy.isAllowlisted(swapper.address)).to.be.true;
      });
    });
  });
});
