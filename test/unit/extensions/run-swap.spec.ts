import chai from 'chai';
import { ethers } from 'hardhat';
import { contract, given, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20, ISwapperRegistry, Swapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { thenMaxApproveSpenderIsCalledCorrectly, thenExecuteSwapIsCalledCorrectly, thenAllowlistWasCheckedForSwappers } from './assertions';

chai.use(smock.matchers);

contract('RunSwap', () => {
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
    extensions = await factory.deploy(registry.address, ACCOUNT);
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

  describe('runSwap', () => {
    when('token is ERC20', () => {
      given(async () => {
        await extensions.runSwap({
          swapper: swapper.address,
          allowanceTarget: ACCOUNT,
          swapData: swapData,
          tokenIn: token.address,
          amountIn: AMOUNT,
        });
      });
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper.address],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, spender: ACCOUNT, alreadyValidatedSpender: false, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData, value: 0 }],
      }));
    });
    when('token is ERC20 and allowance target is the same as the swapper', () => {
      given(async () => {
        await extensions.runSwap({
          swapper: swapper.address,
          allowanceTarget: swapper.address,
          swapData: swapData,
          tokenIn: token.address,
          amountIn: AMOUNT,
        });
      });
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper.address],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, spender: swapper.address, alreadyValidatedSpender: true, minAllowance: AMOUNT }],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData, value: 0 }],
      }));
    });
    when('token in is protocol token', () => {
      given(async () => {
        await extensions.runSwap(
          {
            swapper: swapper.address,
            allowanceTarget: ACCOUNT,
            swapData: swapData,
            tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            amountIn: AMOUNT,
          },
          { value: AMOUNT }
        );
      });
      thenAllowlistWasCheckedForSwappers(() => ({
        registry,
        swappers: [swapper.address],
      }));
      thenMaxApproveSpenderIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [],
      }));
      thenExecuteSwapIsCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ swapper: swapper.address, swapData, value: AMOUNT }],
      }));
    });
  });
});
