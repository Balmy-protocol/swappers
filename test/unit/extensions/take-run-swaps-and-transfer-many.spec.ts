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
  thenAllowlistWasCheckedForSwappers,
} from './assertions';

chai.use(smock.matchers);

contract('TakeRunSwapsAndTransferMany', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let swapper1: FakeContract<Swapper>, swapper2: FakeContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let tokenIn: FakeContract<IERC20>, tokenOut1: FakeContract<IERC20>, tokenOut2: FakeContract<IERC20>;
  let swapData: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    swapper1 = await smock.fake('ISwapper');
    swapper2 = await smock.fake('ISwapper');
    tokenIn = await smock.fake('IERC20');
    tokenOut1 = await smock.fake('IERC20');
    tokenOut2 = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(registry.address);
    const { data } = await swapper1.populateTransaction.executeSwap(ACCOUNT, ACCOUNT, AMOUNT);
    swapData = data!;
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    tokenIn.transfer.returns(true);
    tokenIn.transferFrom.returns(true);
    tokenOut1.transfer.returns(true);
    tokenOut2.transfer.returns(true);
    registry.isSwapperAllowlisted.reset();
    registry.isSwapperAllowlisted.returns(true);
    registry.isValidAllowanceTarget.returns(true);
  });

  describe('takeRunSwapsAndTransferMany', () => {
    when('function is called', () => {
      given(async () => {
        await extensions.takeRunSwapsAndTransferMany({
          tokenIn: tokenIn.address,
          maxAmountIn: AMOUNT,
          allowanceTargets: [
            { allowanceTarget: ACCOUNT, minAllowance: AMOUNT, token: tokenIn.address },
            { allowanceTarget: swapper1.address, minAllowance: 0, token: tokenIn.address },
          ],
          swappers: [swapper1.address, swapper2.address],
          swaps: [swapData, swapData],
          swapperForSwap: [0, 1],
          transferOutBalance: [
            { token: tokenOut1.address, recipient: ACCOUNT },
            { token: tokenOut2.address, recipient: ACCOUNT },
          ],
        });
      });
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: tokenIn.address, amount: AMOUNT }],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenIn.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT },
          { token: tokenIn.address, spender: swapper1.address, alreadyValidatedSpender: false, minAllowance: 0 },
        ],
      }));
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper1.address, swapper2.address],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { swapper: swapper1.address, swapData, value: 0 },
          { swapper: swapper2.address, swapData, value: 0 },
        ],
      }));
      thenSendBalanceToRecipientIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenOut1.address, recipient: ACCOUNT },
          { token: tokenOut2.address, recipient: ACCOUNT },
        ],
      }));
    });
  });
});
