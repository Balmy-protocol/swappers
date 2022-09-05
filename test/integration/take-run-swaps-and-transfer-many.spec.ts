import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, SwapperRegistry, SwapProxy } from '@typechained';
import { BigNumber, ContractTransaction, utils } from 'ethers';
import { snapshot } from '@utils/evm';
import { deployContractsAndReturnSigners, ETH_ADDRESS, getQuoteAndAllowlistSwapper } from './utils';
import {
  expectBalanceToBeEmpty,
  expectBalanceToBeGreatherThan,
  expectETHBalanceToBeEmpty,
  expectETHBalanceToBeGreatherThan,
} from './assertions';
import { paraswapAdapter, zrxAdapter } from './dex-adapters';
import { expect } from 'chai';
import { GasSnapshotReporter } from '@mean-finance/web3-utilities';

contract('SwapProxy', () => {
  let registry: SwapperRegistry;
  let swapProxy: SwapProxy;
  let MANA: IERC20, USDC: IERC20;
  let usdcWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    ({ registry, swapProxy, MANA, USDC, usdcWhale } = await deployContractsAndReturnSigners());
    [caller, , recipient] = await ethers.getSigners();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('takeRunSwapsAndTransferMany', () => {
    when('swapping ETH => [USDC, MANA]', () => {
      const AMOUNT_ETH_PER_SWAP = utils.parseEther('0.5');
      let minAmountOutETHToUSDC: BigNumber, minAmountOutETHToMANA: BigNumber;
      let tx: ContractTransaction;
      given(async () => {
        const quoteETHToUSDC = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: USDC,
          trade: 'sell',
          amount: AMOUNT_ETH_PER_SWAP,
          quoter: paraswapAdapter,
        });
        const quoteETHToMANA = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: MANA,
          trade: 'sell',
          amount: AMOUNT_ETH_PER_SWAP,
          quoter: zrxAdapter,
        });
        tx = await swapProxy.connect(caller).takeRunSwapsAndTransferMany(
          {
            tokenIn: ETH_ADDRESS,
            maxAmountIn: 0,
            allowanceTargets: [],
            swappers: [quoteETHToUSDC.swapperAddress, quoteETHToMANA.swapperAddress],
            swaps: [quoteETHToUSDC.data, quoteETHToMANA.data],
            swapContext: [
              { swapperIndex: 0, value: AMOUNT_ETH_PER_SWAP },
              { swapperIndex: 1, value: AMOUNT_ETH_PER_SWAP },
            ],
            transferOutBalance: [
              { token: MANA.address, recipient: recipient.address },
              { token: USDC.address, recipient: recipient.address },
            ],
          },
          { value: AMOUNT_ETH_PER_SWAP.mul(2) }
        );
        minAmountOutETHToUSDC = quoteETHToUSDC.minAmountOut;
        minAmountOutETHToMANA = quoteETHToMANA.minAmountOut;
      });
      then('caller has no USDC', () => expectBalanceToBeEmpty(USDC, caller));
      then('caller has no MANA', () => expectBalanceToBeEmpty(MANA, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no MANA left', () => expectBalanceToBeEmpty(MANA, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then('recipient has the expected amount of USDC', () => expectBalanceToBeGreatherThan(USDC, minAmountOutETHToUSDC, recipient));
      then('recipient has the expected amount of MANA', () => expectBalanceToBeGreatherThan(MANA, minAmountOutETHToMANA, recipient));
      then(`gas snapshot`, async () => {
        await GasSnapshotReporter.snapshot(`swapping ETH => [USDC, MANA]`, tx);
      });
    });
    when('swapping USDC => MANA => ETH', () => {
      const AMOUNT_MANA = utils.parseEther('1000');
      let minAmountOut: BigNumber;
      let initialRecipientEthBalance: BigNumber;
      let tx: ContractTransaction;
      given(async () => {
        const quoteUSDCToMANA = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: USDC,
          tokenOut: MANA,
          trade: 'buy',
          amount: AMOUNT_MANA,
          quoter: paraswapAdapter,
        });
        const quoteMANAToETH = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: MANA,
          tokenOut: 'ETH',
          trade: 'sell',
          amount: AMOUNT_MANA,
          quoter: zrxAdapter,
        });
        initialRecipientEthBalance = await ethers.provider.getBalance(recipient.address);
        await USDC.connect(usdcWhale).transfer(caller.address, quoteUSDCToMANA.maxAmountIn);
        await USDC.connect(caller).approve(swapProxy.address, quoteUSDCToMANA.maxAmountIn);
        tx = await swapProxy.connect(caller).takeRunSwapsAndTransferMany({
          tokenIn: USDC.address,
          maxAmountIn: quoteUSDCToMANA.maxAmountIn,
          allowanceTargets: [
            { token: USDC.address, allowanceTarget: quoteUSDCToMANA.allowanceTarget, minAllowance: quoteUSDCToMANA.maxAmountIn },
            { token: MANA.address, allowanceTarget: quoteMANAToETH.allowanceTarget, minAllowance: quoteMANAToETH.maxAmountIn },
          ],
          swappers: [quoteUSDCToMANA.swapperAddress, quoteMANAToETH.swapperAddress],
          swaps: [quoteUSDCToMANA.data, quoteMANAToETH.data],
          swapContext: [
            { swapperIndex: 0, value: 0 },
            { swapperIndex: 1, value: 0 },
          ],
          transferOutBalance: [
            { token: USDC.address, recipient: caller.address },
            { token: ETH_ADDRESS, recipient: recipient.address },
          ],
        });
        minAmountOut = quoteMANAToETH.minAmountOut;
      });
      then('caller has some unspent USDC', async () => {
        // Since the slippage is big, we assume that we will get something back
        const balance = await USDC.balanceOf(caller.address);
        expect(balance.gt(0)).to.be.true;
      });
      then('caller has no MANA', () => expectBalanceToBeEmpty(MANA, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no MANA left', () => expectBalanceToBeEmpty(MANA, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then('recipient has the expected amount of ETH', () =>
        expectETHBalanceToBeGreatherThan(initialRecipientEthBalance.add(minAmountOut), recipient)
      );
      then(`gas snapshot`, async () => {
        await GasSnapshotReporter.snapshot(`swapping USDC => MANA => ETH`, tx);
      });
    });
  });
});
