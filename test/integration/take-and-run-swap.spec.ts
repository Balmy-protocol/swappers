import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, SwapperRegistry, SwapProxy } from '@typechained';
import { BigNumber, ContractTransaction, utils } from 'ethers';
import { snapshot } from '@utils/evm';
import { deployContractsAndReturnSigners, ETH_ADDRESS, getQuoteAndAllowlistSwapper } from './utils';
import { expectBalanceToBeEmpty, expectBalanceToBeGreatherThan, expectETHBalanceToBeEmpty } from './assertions';
import { paraswapAdapter } from './dex-adapters';
import { GasSnapshotReporter } from '@mean-finance/web3-utilities';

contract('SwapProxy', () => {
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

  describe('takeAndRunSwap', () => {
    when('executing ETH => ERC20', () => {
      let minAmountOut: BigNumber;
      let tx: ContractTransaction;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: USDC,
          trade: 'sell',
          amount: utils.parseEther('0.5'),
          recipient: recipient,
          quoter: paraswapAdapter,
        });
        tx = await swapProxy.connect(caller).takeAndRunSwap(
          {
            swapper: quote.swapperAddress,
            allowanceTarget: quote.allowanceTarget,
            swapData: quote.data,
            tokenIn: ETH_ADDRESS,
            maxAmountIn: quote.maxAmountIn,
            checkUnspentTokensIn: false,
          },
          { value: utils.parseEther('0.5') }
        );
        minAmountOut = quote.minAmountOut;
      });
      then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`proxy has no 'from' token left`, () => expectETHBalanceToBeEmpty(swapProxy));
      then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
      then(`gas snapshot`, async () => {
        await GasSnapshotReporter.snapshot(`Taking ETH and swapping for ERC20`, tx);
      });
    });

    when('executing ERC20 => ERC20', () => {
      let minAmountOut: BigNumber;
      let tx: ContractTransaction;
      given(async () => {
        const quote = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: WETH,
          tokenOut: USDC,
          trade: 'sell',
          amount: utils.parseEther('0.5'),
          recipient: recipient,
          quoter: paraswapAdapter,
        });
        await WETH.connect(wethWhale).transfer(caller.address, quote.maxAmountIn);
        await WETH.connect(caller).approve(swapProxy.address, quote.maxAmountIn);
        tx = await swapProxy.connect(caller).takeAndRunSwap({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokenIn: WETH.address,
          maxAmountIn: quote.maxAmountIn,
          checkUnspentTokensIn: false,
        });
        minAmountOut = quote.minAmountOut;
      });
      then(`caller has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, caller));
      then(`caller has no 'to' token`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`proxy has no 'from' token left`, () => expectBalanceToBeEmpty(WETH, swapProxy));
      then(`proxy has no 'to' token left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`recipient has no 'from' token`, () => expectBalanceToBeEmpty(WETH, recipient));
      then(`recipient has the expected amount of 'to' token`, () => expectBalanceToBeGreatherThan(USDC, minAmountOut, recipient));
      then(`gas snapshot`, async () => {
        await GasSnapshotReporter.snapshot(`Taking only ETH and swapping for ERC20`, tx);
      });
    });
  });
});
