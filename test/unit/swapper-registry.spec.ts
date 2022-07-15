import { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants } from 'ethers';
import { behaviours } from '@utils';
import { given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { SwapperRegistry, SwapperRegistry__factory } from '@typechained';
import { snapshot } from '@utils/evm';

describe('SwapperRegistry', () => {
  const ALLOWED_SWAPPER = '0x0000000000000000000000000000000000000001';
  const NOT_ALLOWED_SWAPPER = '0x0000000000000000000000000000000000000002';
  const SUPPLEMENTARY_ALLOWANCE_TARGET = '0x0000000000000000000000000000000000000003';
  const NOT_ALLOWED_SUPPLEMENTARY_ALLOWANCE_TARGET = '0x0000000000000000000000000000000000000004';

  let superAdmin: SignerWithAddress, admin: SignerWithAddress, caller: SignerWithAddress;
  let swapperRegistryFactory: SwapperRegistry__factory;
  let swapperRegistry: SwapperRegistry;
  let superAdminRole: string, adminRole: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller, superAdmin, admin] = await ethers.getSigners();
    swapperRegistryFactory = await ethers.getContractFactory('solidity/contracts/SwapperRegistry.sol:SwapperRegistry');
    swapperRegistry = await swapperRegistryFactory.deploy([ALLOWED_SWAPPER], [SUPPLEMENTARY_ALLOWANCE_TARGET], superAdmin.address, [
      admin.address,
    ]);
    superAdminRole = await swapperRegistry.SUPER_ADMIN_ROLE();
    adminRole = await swapperRegistry.ADMIN_ROLE();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('constructor', () => {
    when('super admin is zero address', () => {
      then('tx is reverted with reason error', async () => {
        await behaviours.deployShouldRevertWithMessage({
          contract: swapperRegistryFactory,
          args: [[], [], constants.AddressZero, []],
          message: 'ZeroAddress',
        });
      });
    });
    when('all arguments are valid', () => {
      then('super admin is set correctly', async () => {
        const hasRole = await swapperRegistry.hasRole(superAdminRole, superAdmin.address);
        expect(hasRole).to.be.true;
      });
      then('initial admins are set correctly', async () => {
        const hasRole = await swapperRegistry.hasRole(adminRole, admin.address);
        expect(hasRole).to.be.true;
      });
      then('super admin role is set as admin role', async () => {
        const admin = await swapperRegistry.getRoleAdmin(adminRole);
        expect(admin).to.equal(superAdminRole);
      });
      then('initial allowlisted swappers are set correctly', async () => {
        expect(await swapperRegistry.isSwapperAllowlisted(ALLOWED_SWAPPER)).to.be.true;
      });
      then('initial allowlisted swappers are set as valid allowance targets', async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(ALLOWED_SWAPPER)).to.be.true;
      });
      then('initial allowlisted allowance targets are set as valid allowance targets', async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(SUPPLEMENTARY_ALLOWANCE_TARGET)).to.be.true;
      });
    });
  });

  describe('allowSwappers', () => {
    when('swapper is allowed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapperRegistry.connect(admin).allowSwappers([NOT_ALLOWED_SWAPPER]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapperRegistry.isSwapperAllowlisted(NOT_ALLOWED_SWAPPER)).to.be.true;
      });
      then('it is set as a valid allowance target', async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(NOT_ALLOWED_SWAPPER)).to.be.true;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapperRegistry, 'AllowedSwappers').withArgs([NOT_ALLOWED_SWAPPER]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapperRegistry,
      funcAndSignature: 'allowSwappers',
      params: () => [[NOT_ALLOWED_SWAPPER]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });

  describe('removeSwappersFromAllowlist', () => {
    when('swapper is removed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapperRegistry.connect(admin).removeSwappersFromAllowlist([ALLOWED_SWAPPER]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapperRegistry.isSwapperAllowlisted(ALLOWED_SWAPPER)).to.be.false;
      });
      then('it is not a valid allowance anymore target', async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(NOT_ALLOWED_SWAPPER)).to.be.false;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapperRegistry, 'RemoveSwappersFromAllowlist').withArgs([ALLOWED_SWAPPER]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapperRegistry,
      funcAndSignature: 'removeSwappersFromAllowlist',
      params: () => [[ALLOWED_SWAPPER]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });

  describe('allowSupplementaryAllowanceTargets', () => {
    when('allowance target is allowed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapperRegistry.connect(admin).allowSupplementaryAllowanceTargets([NOT_ALLOWED_SUPPLEMENTARY_ALLOWANCE_TARGET]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(NOT_ALLOWED_SUPPLEMENTARY_ALLOWANCE_TARGET)).to.be.true;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapperRegistry, 'AllowedSupplementaryAllowanceTargets').withArgs([NOT_ALLOWED_SUPPLEMENTARY_ALLOWANCE_TARGET]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapperRegistry,
      funcAndSignature: 'allowSupplementaryAllowanceTargets',
      params: () => [[NOT_ALLOWED_SUPPLEMENTARY_ALLOWANCE_TARGET]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });

  describe('removeSupplementaryAllowanceTargetsFromAllowlist', () => {
    when('allowance target is removed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapperRegistry.connect(admin).removeSupplementaryAllowanceTargetsFromAllowlist([SUPPLEMENTARY_ALLOWANCE_TARGET]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapperRegistry.isValidAllowanceTarget(SUPPLEMENTARY_ALLOWANCE_TARGET)).to.be.false;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapperRegistry, 'RemovedAllowanceTargetsFromAllowlist').withArgs([SUPPLEMENTARY_ALLOWANCE_TARGET]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapperRegistry,
      funcAndSignature: 'removeSupplementaryAllowanceTargetsFromAllowlist',
      params: () => [[SUPPLEMENTARY_ALLOWANCE_TARGET]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });
});
