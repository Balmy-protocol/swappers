import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, SwapperRegistry, SwapProxy } from '@typechained';
import { BigNumber, utils } from 'ethers';
import { snapshot } from '@utils/evm';
import { deployContractsAndReturnSigners, ETH_ADDRESS, getQuoteAndAllowlistSwapper } from './utils';
import {
  expectBalanceToBeEmpty,
  expectBalanceToBeGreatherThan,
  expectETHBalanceToBeEmpty,
  expectETHBalanceToBeGreatherThan,
} from './assertions';
import { oneInchAdapter, paraswapAdapter } from './dex-adapters';
import { expect } from 'chai';

contract('SwapProxy', () => {
  let registry: SwapperRegistry;
  let swapProxy: SwapProxy;
  let WETH: IERC20, USDC: IERC20;
  let usdcWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    ({ registry, swapProxy, WETH, USDC, usdcWhale } = await deployContractsAndReturnSigners());
    [caller, , recipient] = await ethers.getSigners();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('takeRunSwapsAndTransferMany', () => {
    when('swapping ETH => [USDC, WETH]', () => {
      const AMOUNT_ETH_PER_SWAP = utils.parseEther('0.5');
      let minAmountOutETHToUSDC: BigNumber, minAmountOutETHToWETH: BigNumber;
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
        const quoteETHToWETH = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: WETH,
          trade: 'sell',
          amount: AMOUNT_ETH_PER_SWAP,
          quoter: oneInchAdapter,
        });
        await swapProxy.connect(caller).takeRunSwapsAndTransferMany(
          {
            tokenIn: ETH_ADDRESS,
            maxAmountIn: 0,
            allowanceTargets: [],
            swappers: [quoteETHToUSDC.swapperAddress, quoteETHToWETH.swapperAddress],
            swaps: [quoteETHToUSDC.data, quoteETHToWETH.data],
            swapContext: [
              { swapperIndex: 0, value: AMOUNT_ETH_PER_SWAP },
              { swapperIndex: 1, value: AMOUNT_ETH_PER_SWAP },
            ],
            transferOutBalance: [
              { token: WETH.address, recipient: recipient.address },
              { token: USDC.address, recipient: recipient.address },
            ],
          },
          { value: AMOUNT_ETH_PER_SWAP.mul(2) }
        );
        minAmountOutETHToUSDC = quoteETHToUSDC.minAmountOut;
        minAmountOutETHToWETH = quoteETHToWETH.minAmountOut;
      });
      then('caller has no USDC', () => expectBalanceToBeEmpty(USDC, caller));
      then('caller has no WETH', () => expectBalanceToBeEmpty(WETH, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no WETH left', () => expectBalanceToBeEmpty(WETH, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then('recipient has the expected amount of USDC', () => expectBalanceToBeGreatherThan(USDC, minAmountOutETHToUSDC, recipient));
      then('recipient has the expected amount of WETH', () => expectBalanceToBeGreatherThan(WETH, minAmountOutETHToWETH, recipient));
    });
    when('swapping USDC => WETH => ETH', () => {
      const AMOUNT_ETH_WETH = utils.parseEther('0.5');
      let minAmountOut: BigNumber;
      let initialRecipientEthBalance: BigNumber;
      given(async () => {
        const quoteUSDCToWETH = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: USDC,
          tokenOut: WETH,
          trade: 'buy',
          amount: AMOUNT_ETH_WETH,
          quoter: paraswapAdapter,
        });
        const quoteWETHToETH = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: WETH,
          tokenOut: 'ETH',
          trade: 'sell',
          amount: AMOUNT_ETH_WETH,
          quoter: oneInchAdapter,
        });
        initialRecipientEthBalance = await ethers.provider.getBalance(recipient.address);
        await USDC.connect(usdcWhale).transfer(caller.address, quoteUSDCToWETH.maxAmountIn);
        await USDC.connect(caller).approve(swapProxy.address, quoteUSDCToWETH.maxAmountIn);
        await swapProxy.connect(caller).takeRunSwapsAndTransferMany({
          tokenIn: USDC.address,
          maxAmountIn: quoteUSDCToWETH.maxAmountIn,
          allowanceTargets: [
            { token: USDC.address, allowanceTarget: quoteUSDCToWETH.allowanceTarget, minAllowance: quoteUSDCToWETH.maxAmountIn },
            { token: WETH.address, allowanceTarget: quoteWETHToETH.allowanceTarget, minAllowance: quoteWETHToETH.maxAmountIn },
          ],
          swappers: [quoteUSDCToWETH.swapperAddress, quoteWETHToETH.swapperAddress],
          swaps: [quoteUSDCToWETH.data, quoteWETHToETH.data],
          swapContext: [
            { swapperIndex: 0, value: 0 },
            { swapperIndex: 1, value: 0 },
          ],
          transferOutBalance: [
            { token: USDC.address, recipient: caller.address },
            { token: ETH_ADDRESS, recipient: recipient.address },
          ],
        });
        minAmountOut = quoteWETHToETH.minAmountOut;
      });
      then('caller has some unspent USDC', async () => {
        // Since the slippage is big, we assume that we will get something back
        const balance = await USDC.balanceOf(caller.address);
        expect(balance.gt(0)).to.be.true;
      });
      then('caller has no WETH', () => expectBalanceToBeEmpty(WETH, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no WETH left', () => expectBalanceToBeEmpty(WETH, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then('recipient has the expected amount of ETH', () =>
        expectETHBalanceToBeGreatherThan(initialRecipientEthBalance.add(minAmountOut), recipient)
      );
    });
  });
});
