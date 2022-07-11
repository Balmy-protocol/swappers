import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants, utils } from 'ethers';
import { behaviours } from '@utils';
import { given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { SwapProxy, SwapProxy__factory, Swapper__factory, IERC20, Swapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';

chai.use(smock.matchers);

describe('SwapProxy', () => {
  let superAdmin: SignerWithAddress, admin: SignerWithAddress, caller: SignerWithAddress;
  let swapProxyFactory: SwapProxy__factory;
  let swapProxy: SwapProxy;
  let superAdminRole: string, adminRole: string;
  let swapper1: MockContract<Swapper>, swapper2: MockContract<Swapper>;
  let tokenIn: FakeContract<IERC20>, tokenOut: FakeContract<IERC20>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller, superAdmin, admin] = await ethers.getSigners();
    swapProxyFactory = await ethers.getContractFactory('solidity/contracts/SwapProxy.sol:SwapProxy');
    const swapperFactory = await smock.mock<Swapper__factory>('Swapper');
    swapper1 = await swapperFactory.deploy();
    swapper2 = await swapperFactory.deploy();
    tokenIn = await smock.fake('IERC20');
    tokenOut = await smock.fake('IERC20');
    swapProxy = await swapProxyFactory.deploy([swapper1.address], superAdmin.address, [admin.address]);
    superAdminRole = await swapProxy.SUPER_ADMIN_ROLE();
    adminRole = await swapProxy.ADMIN_ROLE();
    snapshotId = await snapshot.take();
  });

  beforeEach('Deploy and configure', async () => {
    await snapshot.revert(snapshotId);
    tokenIn.transferFrom.reset();
    tokenIn.allowance.reset();
    tokenIn.approve.reset();
    tokenIn.balanceOf.reset();
    tokenIn.transfer.reset();
    tokenOut.balanceOf.reset();
    tokenOut.transfer.reset();
    swapper1.executeSwap.reset();
    tokenIn.transferFrom.returns(true);
    tokenIn.transfer.returns(true);
    tokenOut.transfer.returns(true);
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

  describe('swapAndTransfer', () => {
    const RECIPIENT = '0x0000000000000000000000000000000000000001';
    const AMOUNT_IN = 1000000;
    const AMOUNT_OUT = 1234567;
    given(async () => {
      tokenIn.allowance.returns(AMOUNT_IN);
      tokenOut.balanceOf.returns(AMOUNT_OUT);
    });
    when('swapper is not allowlisted', () => {
      then('reverts with message', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: swapProxy,
          func: 'swapAndTransfer',
          args: [
            {
              swapper: swapper2.address,
              allowanceTarget: swapper1.address,
              swapData: [],
              tokensIn: [{ token: tokenIn.address, amount: AMOUNT_IN }],
              tokensOut: [tokenOut.address],
              recipient: RECIPIENT,
            },
          ],
          message: 'SwapperNotAllowlisted',
        });
      });
    });
    when('swapper is allowed', () => {
      const VALUE = utils.parseEther('0.1');
      let tx: TransactionResponse;
      given(async () => {
        tokenIn.allowance.returns(0);
        const { data } = await swapper1.populateTransaction.executeSwap(tokenIn.address, tokenOut.address, AMOUNT_IN);
        tx = await swapProxy.connect(caller).swapAndTransfer(
          {
            swapper: swapper1.address,
            allowanceTarget: swapper1.address,
            swapData: data!,
            tokensIn: [{ token: tokenIn.address, amount: AMOUNT_IN }],
            tokensOut: [tokenOut.address],
            recipient: RECIPIENT,
            checkUnspentTokensIn: false,
          },
          { value: VALUE }
        );
      });
      thenTokenInWasTransferredFromTheCallerCorrectly;
      thenAllowanceWasAskedCorrectly();
      then('allowance was increased correctly', () => {
        expect(tokenIn.approve).to.have.been.calledTwice;
        expect(tokenIn.approve).to.have.been.calledWith(swapper1.address, 0);
        expect(tokenIn.approve).to.have.been.calledWith(swapper1.address, constants.MaxUint256);
      });
      thenSwapWasExecutedCorrectly();
      then('swapper was sent the ether correctly', async () => {
        expect(await swapper1.msgValue()).to.equal(VALUE);
      });
      thenTokenInWasNotCheckedForUnspentTokens();
      thenTokenOutWasTransferredCorrectly();
    });
    when('swapper is allowed and allowance is enough', () => {
      let tx: TransactionResponse;
      given(async () => {
        const { data } = await swapper1.populateTransaction.executeSwap(tokenIn.address, tokenOut.address, AMOUNT_IN);
        tx = await swapProxy.connect(caller).swapAndTransfer({
          swapper: swapper1.address,
          allowanceTarget: swapper1.address,
          swapData: data!,
          tokensIn: [{ token: tokenIn.address, amount: AMOUNT_IN }],
          tokensOut: [tokenOut.address],
          recipient: RECIPIENT,
          checkUnspentTokensIn: false,
        });
      });
      thenTokenInWasTransferredFromTheCallerCorrectly;
      thenAllowanceWasAskedCorrectly();
      thenAllowanceWasNotIncreased();
      thenSwapWasExecutedCorrectly();
      thenTokenInWasNotCheckedForUnspentTokens();
      thenTokenOutWasTransferredCorrectly();
    });
    when('token in must be checked for unspent, but there is nothing there', () => {
      let tx: TransactionResponse;
      given(async () => {
        tokenIn.balanceOf.returns(0);
        const { data } = await swapper1.populateTransaction.executeSwap(tokenIn.address, tokenOut.address, AMOUNT_IN);
        tx = await swapProxy.connect(caller).swapAndTransfer({
          swapper: swapper1.address,
          allowanceTarget: swapper1.address,
          swapData: data!,
          tokensIn: [{ token: tokenIn.address, amount: AMOUNT_IN }],
          tokensOut: [tokenOut.address],
          recipient: RECIPIENT,
          checkUnspentTokensIn: true,
        });
      });
      thenTokenInWasTransferredFromTheCallerCorrectly;
      thenAllowanceWasAskedCorrectly();
      thenAllowanceWasNotIncreased();
      then('balance for token in was asked correctly', () => {
        expect(tokenIn.balanceOf).to.have.been.calledOnceWith(swapProxy.address);
      });
      then('token in was not transferred', () => {
        expect(tokenIn.transfer).to.not.have.been.called;
      });
      thenSwapWasExecutedCorrectly();
      thenTokenOutWasTransferredCorrectly();
    });
    when('token in must be checked for unspent, and there were some tokens', () => {
      const UNSPENT = 10000;
      let tx: TransactionResponse;
      given(async () => {
        tokenIn.balanceOf.returns(UNSPENT);
        const { data } = await swapper1.populateTransaction.executeSwap(tokenIn.address, tokenOut.address, AMOUNT_IN);
        tx = await swapProxy.connect(caller).swapAndTransfer({
          swapper: swapper1.address,
          allowanceTarget: swapper1.address,
          swapData: data!,
          tokensIn: [{ token: tokenIn.address, amount: AMOUNT_IN }],
          tokensOut: [tokenOut.address],
          recipient: RECIPIENT,
          checkUnspentTokensIn: true,
        });
      });
      thenTokenInWasTransferredFromTheCallerCorrectly;
      thenAllowanceWasAskedCorrectly();
      thenAllowanceWasNotIncreased();
      then('balance for token in was asked correctly', () => {
        expect(tokenIn.balanceOf).to.have.been.calledOnceWith(swapProxy.address);
      });
      then('token in was transferred correctly', () => {
        expect(tokenIn.transfer).to.have.been.calledOnceWith(caller.address, UNSPENT);
      });
      thenSwapWasExecutedCorrectly();
      thenTokenOutWasTransferredCorrectly();
    });

    function thenTokenInWasNotCheckedForUnspentTokens() {
      then('balance for token in was not checked', () => {
        expect(tokenIn.balanceOf).to.not.have.been.called;
      });
      then('transfer was not executed for token in', () => {
        expect(tokenIn.transfer).to.not.have.been.called;
      });
    }
    function thenAllowanceWasNotIncreased() {
      then('allowance was not increased', () => {
        expect(tokenIn.approve).to.not.have.been.called;
      });
    }
    function thenAllowanceWasAskedCorrectly() {
      then('allowance was asked correctly', () => {
        expect(tokenIn.allowance).to.have.been.calledOnceWith(swapProxy.address, swapper1.address);
      });
    }
    function thenTokenInWasTransferredFromTheCallerCorrectly() {
      then('tokens were transferred from the caller', () => {
        expect(tokenIn.transferFrom).to.have.been.calledOnceWith(caller.address, swapProxy.address, AMOUNT_IN);
      });
    }
    function thenSwapWasExecutedCorrectly() {
      then('swapper was called correctly', () => {
        expect(swapper1.executeSwap).to.have.been.calledOnceWith(tokenIn.address, tokenOut.address, AMOUNT_IN);
      });
    }
    function thenTokenOutWasTransferredCorrectly() {
      then('balance for token out tokens was asked correctly', () => {
        expect(tokenOut.balanceOf).to.have.been.calledOnceWith(swapProxy.address);
      });
      then('token out was transferred correctly', () => {
        expect(tokenOut.transfer).to.have.been.calledOnceWith(RECIPIENT, AMOUNT_OUT);
      });
    }
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

  describe('removeSwappersFromAllowlist', () => {
    when('swapper is removed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await swapProxy.connect(admin).removeSwappersFromAllowlist([swapper1.address]);
      });
      then(`it is reflected correctly`, async () => {
        expect(await swapProxy.isAllowlisted(swapper1.address)).to.be.false;
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(swapProxy, 'RemoveSwappersFromAllowlist').withArgs([swapper1.address]);
      });
    });
    behaviours.shouldBeExecutableOnlyByRole({
      contract: () => swapProxy,
      funcAndSignature: 'removeSwappersFromAllowlist',
      params: () => [[swapper1.address]],
      addressWithRole: () => admin,
      role: () => adminRole,
    });
  });
});
