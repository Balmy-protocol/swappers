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
  let USDC: IERC20;
  let usdcWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    ({ registry, swapProxy, USDC, usdcWhale } = await deployContractsAndReturnSigners());
    [caller, , recipient] = await ethers.getSigners();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  // It's hard to find an use case for this extension, so we will do normal swaps, just to test it
  describe('takeManyRunSwapAndTransferMany', () => {
    when('swapping ETH => USDC', () => {
      const AMOUNT_ETH = utils.parseEther('0.5');
      let minAmountOut: BigNumber;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: USDC,
          trade: 'sell',
          amount: AMOUNT_ETH,
          quoter: paraswapAdapter,
        });
        await swapProxy.connect(caller).takeManyRunSwapAndTransferMany(
          {
            takeFromCaller: [],
            swapper: quote.swapperAddress,
            allowanceTarget: quote.allowanceTarget,
            swapData: quote.data,
            valueInSwap: AMOUNT_ETH,
            transferOutBalance: [{ token: USDC.address, recipient: recipient.address }],
          },
          { value: AMOUNT_ETH }
        );
        minAmountOut = quote.minAmountOut;
      });
      then('caller has no USDC', () => expectBalanceToBeEmpty(USDC, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then('recipient has the expected amount of USDC', () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
    });

    when('swapping USDC => ETH', () => {
      const AMOUNT_USDC = utils.parseUnits('1000', 6);
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
          amount: AMOUNT_USDC,
          quoter: paraswapAdapter,
        });
        await USDC.connect(usdcWhale).transfer(caller.address, quote.maxAmountIn);
        await USDC.connect(caller).approve(swapProxy.address, quote.maxAmountIn);
        await swapProxy.connect(caller).takeManyRunSwapAndTransferMany({
          takeFromCaller: [{ token: USDC.address, amount: AMOUNT_USDC }],
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          valueInSwap: 0,
          transferOutBalance: [{ token: ETH_ADDRESS, recipient: recipient.address }],
        });
        minAmountOut = quote.minAmountOut;
      });
      then('caller has no USDC', () => expectBalanceToBeEmpty(USDC, caller));
      then('proxy has no USDC left', () => expectBalanceToBeEmpty(USDC, swapProxy));
      then('proxy has no ETH left', () => expectETHBalanceToBeEmpty(swapProxy));
      then(`recipient has the expected amount of ETH`, () =>
        expectETHBalanceToBeGreatherThan(initialRecipientEthBalance.add(minAmountOut), recipient)
      );
    });
  });
});
