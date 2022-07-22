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

contract('TakeManyRunSwapsAndTransferMany', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let swapper1: FakeContract<Swapper>, swapper2: FakeContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let tokenIn1: FakeContract<IERC20>, tokenIn2: FakeContract<IERC20>, tokenOut1: FakeContract<IERC20>, tokenOut2: FakeContract<IERC20>;
  let swapData: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    swapper1 = await smock.fake('ISwapper');
    swapper2 = await smock.fake('ISwapper');
    tokenIn1 = await smock.fake('IERC20');
    tokenIn2 = await smock.fake('IERC20');
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
    tokenIn1.transfer.returns(true);
    tokenIn2.transfer.returns(true);
    tokenIn1.transferFrom.returns(true);
    tokenIn2.transferFrom.returns(true);
    tokenOut1.transfer.returns(true);
    tokenOut2.transfer.returns(true);
    registry.isSwapperAllowlisted.reset();
    registry.isSwapperAllowlisted.returns(true);
    registry.isValidAllowanceTarget.returns(true);
  });

  describe('takeManyRunSwapsAndTransferMany', () => {
    when('function is called', () => {
      given(async () => {
        await extensions.takeManyRunSwapsAndTransferMany(
          {
            takeFromCaller: [
              { token: tokenIn1.address, amount: AMOUNT },
              { token: tokenIn2.address, amount: AMOUNT / 2 },
            ],
            allowanceTargets: [
              { allowanceTarget: ACCOUNT, minAllowance: AMOUNT, token: tokenIn1.address },
              { allowanceTarget: swapper1.address, minAllowance: 0, token: tokenIn2.address },
            ],
            swappers: [swapper1.address, swapper2.address],
            swaps: [swapData, swapData],
            swapContext: [
              { value: 50000, swapperIndex: 0 },
              { value: 150000, swapperIndex: 1 },
            ],
            transferOutBalance: [
              { token: tokenIn2.address, recipient: ACCOUNT },
              { token: tokenOut1.address, recipient: ACCOUNT },
              { token: tokenOut2.address, recipient: ACCOUNT },
            ],
          },
          { value: 200000 }
        );
      });
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenIn1.address, amount: AMOUNT },
          { token: tokenIn2.address, amount: AMOUNT / 2 },
        ],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenIn1.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT },
          { token: tokenIn2.address, spender: swapper1.address, alreadyValidatedSpender: false, minAllowance: 0 },
        ],
      }));
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper1.address, swapper2.address],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { swapper: swapper1.address, swapData, value: 50000 },
          { swapper: swapper2.address, swapData, value: 150000 },
        ],
      }));
      thenSendBalanceToRecipientIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [
          { token: tokenIn2.address, recipient: ACCOUNT },
          { token: tokenOut1.address, recipient: ACCOUNT },
          { token: tokenOut2.address, recipient: ACCOUNT },
        ],
      }));
    });
  });
});
