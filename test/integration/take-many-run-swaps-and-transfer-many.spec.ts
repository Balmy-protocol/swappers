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
import { oneInchAdapter, paraswapAdapter, zrxAdapter } from './dex-adapters';

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

  describe('takeManyRunSwapsAndTransferMany', () => {
    when('swapping [ETH => ERC20, ERC20 => ETH, ERC20 => ERC20]', () => {
      const AMOUNT_ETH_WETH = utils.parseEther('0.5');
      const AMOUNT_USDC = utils.parseUnits('1000', 6);
      let minAmountOutETHToUSDC: BigNumber, minAmountOutWETHToUSDC: BigNumber, minAmountOutUSDCToETH: BigNumber;
      let initialRecipientEthBalance: BigNumber;
      given(async () => {
        const quoteETHToUSDC = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: 'ETH',
          tokenOut: USDC,
          trade: 'sell',
          amount: AMOUNT_ETH_WETH,
          quoter: paraswapAdapter,
        });
        const quoteUSDCToETH = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: USDC,
          tokenOut: 'ETH',
          trade: 'sell',
          amount: AMOUNT_USDC,
          quoter: oneInchAdapter,
        });
        const quoteWETHToUSDC = await getQuoteAndAllowlistSwapper({
          swapProxy,
          registry,
          tokenIn: WETH,
          tokenOut: USDC,
          trade: 'sell',
          amount: AMOUNT_ETH_WETH,
          quoter: zrxAdapter,
        });
        initialRecipientEthBalance = await ethers.provider.getBalance(recipient.address);
        await USDC.connect(usdcWhale).transfer(caller.address, quoteUSDCToETH.maxAmountIn);
        await WETH.connect(wethWhale).transfer(caller.address, quoteWETHToUSDC.maxAmountIn);
        await USDC.connect(caller).approve(swapProxy.address, quoteUSDCToETH.maxAmountIn);
        await WETH.connect(caller).approve(swapProxy.address, quoteWETHToUSDC.maxAmountIn);
        await swapProxy.connect(caller).takeManyRunSwapsAndTransferMany(
          {
            takeFromCaller: [
              { token: USDC.address, amount: AMOUNT_USDC },
              { token: WETH.address, amount: AMOUNT_ETH_WETH },
            ],
            allowanceTargets: [
              { token: USDC.address, allowanceTarget: quoteUSDCToETH.allowanceTarget, minAllowance: quoteUSDCToETH.maxAmountIn },
              { token: WETH.address, allowanceTarget: quoteWETHToUSDC.allowanceTarget, minAllowance: quoteWETHToUSDC.maxAmountIn },
            ],
            swappers: [quoteETHToUSDC.swapperAddress, quoteUSDCToETH.swapperAddress, quoteWETHToUSDC.swapperAddress],
            swaps: [quoteETHToUSDC.data, quoteUSDCToETH.data, quoteWETHToUSDC.data],
            swapContext: [
              { swapperIndex: 0, value: AMOUNT_ETH_WETH },
              { swapperIndex: 1, value: 0 },
              { swapperIndex: 2, value: 0 },
            ],
            transferOutBalance: [
              { token: ETH_ADDRESS, recipient: recipient.address },
              { token: USDC.address, recipient: recipient.address },
            ],
          },
          { value: AMOUNT_ETH_WETH }
        );
        minAmountOutETHToUSDC = quoteETHToUSDC.minAmountOut;
        minAmountOutWETHToUSDC = quoteWETHToUSDC.minAmountOut;
        minAmountOutUSDCToETH = quoteUSDCToETH.minAmountOut;
      });
      then(`caller has no 'USDC' left`, () => expectBalanceToBeEmpty(USDC, caller));
      then(`caller has no 'WETH' left`, () => expectBalanceToBeEmpty(WETH, caller));
      then(`proxy has no 'USDC' left`, () => expectBalanceToBeEmpty(USDC, swapProxy));
      then(`proxy has no 'WETH' left`, () => expectBalanceToBeEmpty(WETH, swapProxy));
      then(`proxy has no 'ETH' left`, () => expectETHBalanceToBeEmpty(swapProxy));
      then(`recipient has the expected amount of 'USDC'`, () =>
        expectBalanceToBeGreatherThan(USDC, minAmountOutETHToUSDC.add(minAmountOutWETHToUSDC), recipient)
      );
      then(`recipient has the expected amount of 'ETH'`, () =>
        expectETHBalanceToBeGreatherThan(initialRecipientEthBalance.add(minAmountOutUSDCToETH), recipient)
      );
    });
  });
});
