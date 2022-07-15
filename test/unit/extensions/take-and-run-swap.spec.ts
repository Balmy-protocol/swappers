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
  thenSendBalanceToRecipientIsNotCalled,
  thenSendBalanceToRecipientIsCalledCorrectly,
  thenAllowlistWasCheckedForSwappers,
} from './assertions';

chai.use(smock.matchers);

contract('TakeAndRunSwap', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 1000000;

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let swapper: FakeContract<Swapper>;
  let registry: FakeContract<ISwapperRegistry>;
  let token: FakeContract<IERC20>;
  let swapData: string;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    registry = await smock.fake('ISwapperRegistry');
    swapper = await smock.fake('ISwapper');
    token = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(registry.address);
    const { data } = await swapper.populateTransaction.executeSwap(ACCOUNT, ACCOUNT, AMOUNT);
    swapData = data!;
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    token.transfer.returns(true);
    token.transferFrom.returns(true);
    registry.isSwapperAllowlisted.reset();
    registry.isSwapperAllowlisted.returns(true);
    registry.isValidAllowanceTarget.returns(true);
  });

  describe('takeAndRunSwap', () => {
    when('should not check for unspent tokens', () => {
      given(async () => {
        await extensions.takeAndRunSwap({
          swapper: swapper.address,
          allowanceTarget: ACCOUNT,
          swapData: swapData,
          tokenIn: token.address,
          maxAmountIn: AMOUNT,
          checkUnspentTokensIn: false,
        });
      });
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, amount: AMOUNT }],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData }],
      }));
      thenSendBalanceToRecipientIsNotCalled(() => extensions);
    });

    when('should check for unspent tokens', () => {
      given(async () => {
        await extensions.takeAndRunSwap({
          swapper: swapper.address,
          allowanceTarget: swapper.address,
          swapData: swapData,
          tokenIn: token.address,
          maxAmountIn: AMOUNT,
          checkUnspentTokensIn: true,
        });
      });
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper.address],
      }));
      thenTakeFromMsgSenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, amount: AMOUNT }],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, spender: swapper.address, alreadyValidatedSpender: true, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData }],
      }));
      thenSendBalanceToRecipientIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, recipient: caller.address }],
      }));
    });
  });
});
