import chai from 'chai';
import { ethers } from 'hardhat';
import { contract, given, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20, ISwapperRegistry, Swapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  thenTakeFromMsgSenderIsCalledCorrectly,
  thenMaxApproveSpenderIsCalledCorrectly,
  thenExecuteSwapIsCalledCorrectly,
  thenSendBalanceToRecipientIsCalledCorrectly,
  whenSwapperIsNotAllowlistedThenTxReverts,
} from './assertions';

chai.use(smock.matchers);

contract('TakeRunSwapAndTransfer', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let swapper: FakeContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let tokenIn: FakeContract<IERC20>, tokenOut: FakeContract<IERC20>;
  let swapData: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    swapper = await smock.fake('ISwapper');
    tokenIn = await smock.fake('IERC20');
    tokenOut = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(registry.address);
    const { data } = await swapper.populateTransaction.executeSwap(ACCOUNT, ACCOUNT, AMOUNT);
    swapData = data!;
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    tokenIn.transfer.returns(true);
    tokenIn.transferFrom.returns(true);
    tokenOut.transfer.returns(true);
    registry.isAllowlisted.returns(true);
  });

  describe('takeRunSwapAndTransfer', () => {
    when('should not check for unspent tokens', () => {
      given(async () => {
        await extensions.takeRunSwapAndTransfer({
          swapper: swapper.address,
          allowanceTarget: ACCOUNT,
          swapData: swapData,
          tokenIn: tokenIn.address,
          maxAmountIn: AMOUNT,
          checkUnspentTokensIn: false,
          tokenOut: tokenOut.address,
          recipient: ACCOUNT,
        });
      });
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenIn.address, amount: AMOUNT }],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenIn.address, spender: ACCOUNT, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData }],
      }));
      thenSendBalanceToRecipientIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenOut.address, recipient: ACCOUNT }],
      }));
    });

    when('should check for unspent tokens', () => {
      given(async () => {
        await extensions.takeRunSwapAndTransfer({
          swapper: swapper.address,
          allowanceTarget: ACCOUNT,
          swapData: swapData,
          tokenIn: tokenIn.address,
          maxAmountIn: AMOUNT,
          checkUnspentTokensIn: true,
          tokenOut: tokenOut.address,
          recipient: ACCOUNT,
        });
      });
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenIn.address, amount: AMOUNT }],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenIn.address, spender: ACCOUNT, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData }],
      }));
      thenSendBalanceToRecipientIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenIn.address, recipient: caller.address },
          { token: tokenOut.address, recipient: ACCOUNT },
        ],
      }));
    });

    whenSwapperIsNotAllowlistedThenTxReverts({
      contract: () => extensions,
      func: 'takeRunSwapAndTransfer',
      args: () => [
        {
          swapper: swapper.address,
          allowanceTarget: ACCOUNT,
          swapData: swapData,
          tokenIn: tokenIn.address,
          maxAmountIn: AMOUNT,
          checkUnspentTokensIn: true,
          tokenOut: tokenOut.address,
          recipient: ACCOUNT,
        },
      ],
      registry: () => registry,
    });
  });
});
