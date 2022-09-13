import { ethers } from 'hardhat';
import { given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, IERC20Permit, SwapperRegistry, SwapProxy } from '@typechained';
import { BigNumber, constants, utils } from 'ethers';
import { snapshot } from '@utils/evm';
import { fromRpcSig } from 'ethereumjs-util';
import { expectBalanceToBeEmpty, expectBalanceToBeGreatherThan } from './assertions';
import { deployContractsAndReturnSigners, getQuoteAndAllowlistSwapper } from './utils';
import { oneInchAdapter, paraswapAdapter, Quote, QuoteInput, zrxAdapter } from './dex-adapters';

const AMOUNT_EXACT_OUT = utils.parseEther('1');
const AMOUNT_EXACT_IN = utils.parseUnits('1000', 6);

describe('DEX Aggregators - Integration', () => {
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
          tokenIn: USDC,
          tokenOut: WETH,
          trade: type === 'Exact In' ? 'sell' : 'buy',
          amount: type === 'Exact In' ? AMOUNT_EXACT_IN : AMOUNT_EXACT_OUT,
          recipient: recipient,
          quoter,
        });
        minAmountOut = quote.minAmountOut;
        await USDC.connect(usdcWhale).transfer(caller.address, quote.maxAmountIn);

        const { v, r, s } = await getSignature(caller, swapProxy.address, quote.maxAmountIn);
        const { data: permitData } = await swapProxy.populateTransaction.permit(
          USDC.address,
          caller.address,
          swapProxy.address,
          quote.maxAmountIn,
          constants.MaxUint256,
          v,
          r,
          s
        );

        const { data: swapData } = await swapProxy.populateTransaction.takeRunSwapAndTransfer({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokenIn: USDC.address,
          maxAmountIn: quote.maxAmountIn,
          tokenOut: WETH.address,
          recipient: recipient.address,
          checkUnspentTokensIn: !!checkUnspentTokensIn,
        });

        await swapProxy.connect(caller).multicall([permitData!, swapData!]);
      });

      when('swap & transfer is executed through the swap proxy', () => {
        if (!checkUnspentTokensIn) {
          then(`caller has no 'from' token left`, () => expectBalanceToBeEmpty(USDC, caller));
        }
        then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(WETH, caller));
        then(`proxy has no 'from' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
        then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(WETH, swapProxy));
        then(`recipient has no 'from' token`, () => expectBalanceToBeEmpty(USDC, recipient));
        then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(WETH, minAmountOut, recipient));
      });
    });
  }

  const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ];

  async function getSignature(owner: SignerWithAddress, spender: string, amount: BigNumber) {
    const nonce = await (USDC as any as IERC20Permit).nonces(owner.address);
    const { domain, types, value } = buildPermitData(owner, spender, amount, nonce);
    const signature = await owner._signTypedData(domain, types, value);
    return fromRpcSig(signature);
  }

  function buildPermitData(owner: SignerWithAddress, spender: string, amount: BigNumber, nonce: BigNumber) {
    return {
      types: { Permit },
      domain: { name: 'USD Coin', version: '2', chainId: 1, verifyingContract: USDC.address },
      value: { owner: owner.address, spender, value: amount, nonce, deadline: constants.MaxUint256 },
    };
  }
});
