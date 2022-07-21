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

contract('TakeManyRunSwapAndTransferMany', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let swapper: FakeContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let tokenIn1: FakeContract<IERC20>, tokenIn2: FakeContract<IERC20>, tokenOut1: FakeContract<IERC20>, tokenOut2: FakeContract<IERC20>;
  let swapData: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    swapper = await smock.fake('ISwapper');
    tokenIn1 = await smock.fake('IERC20');
    tokenIn2 = await smock.fake('IERC20');
    tokenOut1 = await smock.fake('IERC20');
    tokenOut2 = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(registry.address);
    const { data } = await swapper.populateTransaction.executeSwap(ACCOUNT, ACCOUNT, AMOUNT);
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

  describe('takeManyRunSwapAndTransferMany', () => {
    when('function is called and allowance target is the same as swapper', () => {
      given(async () => {
        await extensions.takeManyRunSwapAndTransferMany({
          takeFromCaller: [
            { token: tokenIn1.address, amount: AMOUNT },
            { token: tokenIn2.address, amount: AMOUNT / 2 },
          ],
          allowanceTarget: swapper.address,
          swapper: swapper.address,
          swapData,
          transferOutBalance: [
            { token: tokenIn2.address, recipient: ACCOUNT },
            { token: tokenOut1.address, recipient: ACCOUNT },
            { token: tokenOut2.address, recipient: ACCOUNT },
          ],
        });
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
          { token: tokenIn1.address, spender: swapper.address, alreadyValidatedSpender: true, minAllowance: AMOUNT },
          { token: tokenIn2.address, spender: swapper.address, alreadyValidatedSpender: true, minAllowance: AMOUNT / 2 },
        ],
      }));
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper.address],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData, value: 0 }],
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
    when('function is called with value', () => {
      given(async () => {
        await extensions.takeManyRunSwapAndTransferMany(
          {
            takeFromCaller: [
              { token: tokenIn1.address, amount: AMOUNT },
              { token: tokenIn2.address, amount: AMOUNT / 2 },
            ],
            allowanceTarget: ACCOUNT,
            swapper: swapper.address,
            swapData,
            transferOutBalance: [
              { token: tokenIn2.address, recipient: ACCOUNT },
              { token: tokenOut1.address, recipient: ACCOUNT },
              { token: tokenOut2.address, recipient: ACCOUNT },
            ],
          },
          { value: 12345 }
        );
      });
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData, value: 12345 }],
      }));
    });
  });
  when('function is called and allowance target is different from the swapper', () => {
    given(async () => {
      await extensions.takeManyRunSwapAndTransferMany({
        takeFromCaller: [
          { token: tokenIn1.address, amount: AMOUNT },
          { token: tokenIn2.address, amount: AMOUNT / 2 },
        ],
        allowanceTarget: ACCOUNT,
        swapper: swapper.address,
        swapData,
        transferOutBalance: [
          { token: tokenIn2.address, recipient: ACCOUNT },
          { token: tokenOut1.address, recipient: ACCOUNT },
          { token: tokenOut2.address, recipient: ACCOUNT },
        ],
      });
    });
    thenMaxApproveSpenderIsCalledCorrectly(() => ({
      contract: extensions,
      calls: [
        { token: tokenIn1.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT },
        { token: tokenIn2.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT / 2 },
      ],
    }));
  });
});
