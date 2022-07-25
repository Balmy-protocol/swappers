import { ethers } from 'hardhat';
import { given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, SwapperRegistry, SwapProxy } from '@typechained';
import { BigNumber, utils } from 'ethers';
import { snapshot } from '@utils/evm';
import { expectBalanceToBeEmpty, expectBalanceToBeGreatherThan } from './assertions';
import { deployContractsAndReturnSigners, getQuoteAndAllowlistSwapper } from './utils';
import { oneInchAdapter, paraswapAdapter, Quote, QuoteInput, zrxAdapter } from './dex-adapters';

const AMOUNT_EXACT_IN = utils.parseEther('1');
const AMOUNT_EXACT_OUT = utils.parseUnits('1000', 6);

describe('DEX Aggregators - Integration', () => {
  let registry: SwapperRegistry;
  let swapProxy: SwapProxy;
  let WETH: IERC20, USDC: IERC20;
  let wethWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    ({ registry, swapProxy, WETH, USDC, wethWhale } = await deployContractsAndReturnSigners());
    [caller, recipient] = await ethers.getSigners();
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  swapAndTransferTest({
    swapper: '0x',
    type: 'Exact In',
    quoter: zrxAdapter,
  });

  swapAndTransferTest({
    swapper: '0x',
    type: 'Exact Out',
    quoter: zrxAdapter,
  });

  swapAndTransferTest({
    swapper: '1inch',
    type: 'Exact In',
    quoter: oneInchAdapter,
  });

  swapAndTransferTest({
    swapper: 'Paraswap',
    type: 'Exact In',
    quoter: paraswapAdapter,
  });

  swapAndTransferTest({
    swapper: 'Paraswap',
    type: 'Exact Out',
    checkUnspentTokensIn: true,
    quoter: paraswapAdapter,
  });

  function swapAndTransferTest({
    swapper,
    type,
    quoter,
    checkUnspentTokensIn,
  }: {
    swapper: string;
    type: 'Exact In' | 'Exact Out';
    checkUnspentTokensIn?: boolean;
    quoter: (input: QuoteInput) => Promise<Quote>;
  }) {
    describe(swapper + ' (' + type + ')', () => {
      let minAmountOut: BigNumber;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: WETH,
          tokenOut: USDC,
          trade: type === 'Exact In' ? 'sell' : 'buy',
          amount: type === 'Exact In' ? AMOUNT_EXACT_IN : AMOUNT_EXACT_OUT,
          recipient: recipient,
          quoter,
        });
        minAmountOut = quote.minAmountOut;
        await WETH.connect(wethWhale).transfer(caller.address, quote.maxAmountIn);
        await WETH.connect(caller).approve(swapProxy.address, quote.maxAmountIn);
        await swapProxy.connect(caller).takeRunSwapAndTransfer({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokenIn: WETH.address,
          maxAmountIn: quote.maxAmountIn,
          tokenOut: USDC.address,
          recipient: recipient.address,
          checkUnspentTokensIn: !!checkUnspentTokensIn,
        });
      });

      when('swap & transfer is executed through the swap proxy', () => {
        if (!checkUnspentTokensIn) {
          then(`caller has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, caller));
        }
        then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(USDC, caller));
        then(`proxy has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, swapProxy));
        then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
        then(`recipient has no 'from' token`, () => expectBalanceToBeEmpty(WETH, recipient));
        then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
      });
    });
  }
});
