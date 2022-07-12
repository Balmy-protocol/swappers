import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { constants } from 'ethers';
import { behaviours } from '@utils';
import { given, then, when } from '@utils/bdd';
import { IERC20, ISwapperRegistry, SwapAdapterMock, SwapAdapterMock__factory, Swapper, Swapper__factory } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

chai.use(smock.matchers);

describe('SwapAdapter', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let swapAdapterFactory: SwapAdapterMock__factory;
  let swapAdapter: SwapAdapterMock;
  let swapper: MockContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let snapshotId: string;
  let token: FakeContract<IERC20>;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    const swapperFactory = await smock.mock<Swapper__factory>('Swapper');
    swapper = await swapperFactory.deploy();
    swapAdapterFactory = await ethers.getContractFactory('solidity/contracts/test/SwapAdapter.sol:SwapAdapterMock');
    swapAdapter = await swapAdapterFactory.deploy(registry.address);
    token = await smock.fake('IERC20');
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    token.allowance.reset();
    token.approve.reset();
    token.balanceOf.reset();
    token.transfer.reset();
    token.transferFrom.reset();
    token.transfer.returns(true);
    token.transferFrom.returns(true);
    registry.isAllowlisted.reset();
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

  describe('_takeFromMsgSender', () => {
    when('function is called', () => {
      given(async () => {
        await swapAdapter.internalTakeFromMsgSender(token.address, AMOUNT);
      });
      then('token is called correctly', async () => {
        expect(token.transferFrom).to.have.been.calledOnceWith(caller.address, swapAdapter.address, AMOUNT);
      });
    });
  });

  describe('_maxApproveSpenderIfNeeded', () => {
    when('current allowance is enough', () => {
      given(async () => {
        token.allowance.returns(AMOUNT);
        await swapAdapter.internalMaxApproveSpenderIfNeeded(token.address, ACCOUNT, AMOUNT);
      });
      then('allowance is checked correctly', () => {
        expect(token.allowance).to.have.been.calledOnceWith(swapAdapter.address, ACCOUNT);
      });
      then('approve is not called', async () => {
        expect(token.approve).to.not.have.been.called;
      });
    });
    when('current allowance is not enough but its not zero', () => {
      given(async () => {
        token.allowance.returns(AMOUNT - 1);
        await swapAdapter.internalMaxApproveSpenderIfNeeded(token.address, ACCOUNT, AMOUNT);
      });
      then('allowance is checked correctly', () => {
        expect(token.allowance).to.have.been.calledOnceWith(swapAdapter.address, ACCOUNT);
      });
      then('approve is called twice', async () => {
        expect(token.approve).to.have.been.calledTwice;
        expect(token.approve).to.have.been.calledWith(ACCOUNT, 0);
        expect(token.approve).to.have.been.calledWith(ACCOUNT, constants.MaxUint256);
      });
    });
    when('current allowance is zero', () => {
      given(async () => {
        token.allowance.returns(0);
        await swapAdapter.internalMaxApproveSpenderIfNeeded(token.address, ACCOUNT, AMOUNT);
      });
      then('allowance is checked correctly', () => {
        expect(token.allowance).to.have.been.calledOnceWith(swapAdapter.address, ACCOUNT);
      });
      then('approve is called once', async () => {
        expect(token.approve).to.have.been.calledOnceWith(ACCOUNT, constants.MaxUint256);
      });
    });
  });

  describe('_executeSwap', () => {
    const VALUE = 123456;
    when('executing a swap', () => {
      given(async () => {
        const { data } = await swapper.populateTransaction.executeSwap(ACCOUNT, ACCOUNT, AMOUNT);
        await swapAdapter.internalExecuteSwap(swapper.address, data!, { value: VALUE });
      });
      then('swapper is called correctly', () => {
        expect(swapper.executeSwap).to.have.been.calledOnceWith(ACCOUNT, ACCOUNT, AMOUNT);
      });
      then('swapper was sent the ether correctly', async () => {
        expect(await swapper.msgValue()).to.equal(VALUE);
      });
    });
  });

  describe('_sendBalanceToMsgSender', () => {
    when('there is no balance', () => {
      given(async () => {
        token.balanceOf.returns(0);
        await swapAdapter.internalSendBalanceToMsgSender(token.address);
      });
      then('balance is checked correctly', () => {
        expect(token.balanceOf).to.have.been.calledOnceWith(swapAdapter.address);
      });
      then('transfer is not executed', async () => {
        expect(token.transfer).to.not.have.been.called;
      });
    });
    when('there is some balance', () => {
      given(async () => {
        token.balanceOf.returns(AMOUNT);
        await swapAdapter.internalSendBalanceToMsgSender(token.address);
      });
      then('balance is checked correctly', () => {
        expect(token.balanceOf).to.have.been.calledOnceWith(swapAdapter.address);
      });
      then('transfer is executed', async () => {
        expect(token.transfer).to.have.been.calledOnceWith(caller.address, AMOUNT);
      });
    });
  });

  describe('_sendBalanceToRecipient', () => {
    when('the function is called', () => {
      given(async () => {
        token.balanceOf.returns(AMOUNT);
        await swapAdapter.internalSendBalanceToRecipient(token.address, ACCOUNT);
      });
      then('balance is checked correctly', () => {
        expect(token.balanceOf).to.have.been.calledOnceWith(swapAdapter.address);
      });
      then('transfer is executed correctly', async () => {
        expect(token.transfer).to.have.been.calledOnceWith(ACCOUNT, AMOUNT);
      });
    });
  });

  describe('_assertSwapperIsAllowlisted', () => {
    when('swapper is allowlisted', () => {
      given(async () => {
        registry.isAllowlisted.returns(true);
        await swapAdapter.internalAssertSwapperIsAllowlisted(ACCOUNT);
      });
      then('allowlist is checked correctly', () => {
        expect(registry.isAllowlisted).to.have.been.calledOnceWith(ACCOUNT);
      });
    });
    when('swapper is not allowlisted', () => {
      given(() => {
        registry.isAllowlisted.returns(false);
      });
      then('reverts with message', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: swapAdapter,
          func: 'internalAssertSwapperIsAllowlisted',
          args: [ACCOUNT],
          message: 'SwapperNotAllowlisted',
        });
      });
    });
  });
});
