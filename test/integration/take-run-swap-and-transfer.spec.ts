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
import { paraswapAdapter } from './dex-adapters';

contract('SwapProxy', () => {
  let registry: SwapperRegistry;
  let swapProxy: SwapProxy;
  let WETH: IERC20, USDC: IERC20;
  let wethWhale: JsonRpcSigner, usdcWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    ({ registry, swapProxy, WETH, USDC, wethWhale, usdcWhale } = await deployContractsAndReturnSigners());
    [caller, , recipient] = await ethers.getSigners();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('takeRunSwapAndTransfer', () => {
    when('swapping ETH => ERC20', () => {
      let minAmountOut: BigNumber;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: USDC,
          trade: 'sell',
          amount: utils.parseEther('0.5'),
          quoter: paraswapAdapter,
        });
        await swapProxy.connect(caller).takeRunSwapAndTransfer(
          {
            swapper: quote.swapperAddress,
            allowanceTarget: quote.allowanceTarget,
            swapData: quote.data,
            tokenIn: ETH_ADDRESS,
            maxAmountIn: quote.maxAmountIn,
            checkUnspentTokensIn: false,
            tokenOut: USDC.address,
            recipient: recipient.address,
          },
          { value: utils.parseEther('0.5') }
        );
        minAmountOut = quote.minAmountOut;
      });
      then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`proxy has no 'from' token left`, () => expectETHBalanceToBeEmpty(swapProxy));
      then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
    });

    when('swapping ERC20 => ETH', () => {
      let minAmountOut: BigNumber;
      let initialRecipientEthBalance: BigNumber;
      given(async () => {
        initialRecipientEthBalance = await ethers.provider.getBalance(recipient.address);
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: USDC,
          tokenOut: 'ETH',
          trade: 'sell',
          amount: utils.parseUnits('1000', 6),
          quoter: paraswapAdapter,
        });
        await USDC.connect(usdcWhale).transfer(caller.address, quote.maxAmountIn);
        await USDC.connect(caller).approve(swapProxy.address, quote.maxAmountIn);
        await swapProxy.connect(caller).takeRunSwapAndTransfer({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokenIn: USDC.address,
          maxAmountIn: quote.maxAmountIn,
          checkUnspentTokensIn: false,
          tokenOut: ETH_ADDRESS,
          recipient: recipient.address,
        });
        minAmountOut = quote.minAmountOut;
      });
      then(`caller has no 'from' token left`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`proxy has no 'from' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`proxy has no 'to' token left`, () => expectETHBalanceToBeEmpty(swapProxy));
      then(`recipient has no 'from' token`, () => expectBalanceToBeEmpty(USDC, recipient));
      then(`recipient has the expected amount of 'to' token`, () =>
        expectETHBalanceToBeGreatherThan(initialRecipientEthBalance.add(minAmountOut), recipient)
      );
    });

    when('swapping ERC20 => ERC20', () => {
      let minAmountOut: BigNumber;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: WETH,
          tokenOut: USDC,
          trade: 'sell',
          amount: utils.parseEther('0.5'),
          quoter: paraswapAdapter,
        });
        await WETH.connect(wethWhale).transfer(caller.address, quote.maxAmountIn);
        await WETH.connect(caller).approve(swapProxy.address, quote.maxAmountIn);
        await swapProxy.connect(caller).takeRunSwapAndTransfer({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokenIn: WETH.address,
          maxAmountIn: quote.maxAmountIn,
          checkUnspentTokensIn: false,
          tokenOut: USDC.address,
          recipient: recipient.address,
        });
        minAmountOut = quote.minAmountOut;
      });
      then(`caller has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, caller));
      then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`proxy has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, swapProxy));
      then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`recipient has no 'from' token`, () => expectBalanceToBeEmpty(WETH, recipient));
      then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
    });
  });
});
