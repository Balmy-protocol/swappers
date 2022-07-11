import hre, { deployments, ethers, getNamedAccounts } from 'hardhat';
import { evm, wallet } from '@utils';
import { given, then, when } from '@utils/bdd';
import { expect } from 'chai';
import { getNodeUrl } from 'utils/env';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { IERC20, SwapProxy } from '@typechained';
import { BigNumber, BigNumberish, constants, utils } from 'ethers';
import { abi as IERC20_ABI } from '@openzeppelin/contracts/build/contracts/IERC20.json';
import { DeterministicFactory, DeterministicFactory__factory } from '@mean-finance/deterministic-factory/typechained';
import { snapshot } from '@utils/evm';
import { setTestChainId } from 'utils/deploy';
import { quote as zrxQuote } from './dexes/zrx';
import { swap as oneInchQuote } from './dexes/oneinch';
import { swap as paraswapQuote } from './dexes/paraswap';

const CHAIN = { chain: 'ethereum', chainId: 1 };

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WETH_WHALE_ADDRESS = '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e';
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const SLIPPAGE_PERCENTAGE = 0.3;
const AMOUNT_EXACT_IN = utils.parseEther('1');
const AMOUNT_EXACT_OUT = utils.parseUnits('1000', 6);

describe('Comprehensive Swap Test', () => {
  let swapProxy: SwapProxy;
  let WETH: IERC20, USDC: IERC20;
  let admin: JsonRpcSigner, wethWhale: JsonRpcSigner;
  let caller: SignerWithAddress, recipient: SignerWithAddress;
  let snapshotId: string;

  type Quote = {
    swapperAddress: string;
    allowanceTarget: string;
    amountIn: BigNumberish;
    amountOut: BigNumberish;
    data: string;
  };

  before(async () => {
    const { deployer: deployerAddress } = await hre.getNamedAccounts();
    const deployer = await ethers.getSigner(deployerAddress);
    await fork({ ...CHAIN, deployer });
    await deployments.fixture(['SwapProxy'], { keepExistingDeployments: true });

    swapProxy = await ethers.getContract<SwapProxy>('SwapProxy');
    WETH = await ethers.getContractAt(IERC20_ABI, WETH_ADDRESS);
    USDC = await ethers.getContractAt(IERC20_ABI, USDC_ADDRESS);

    const { admin: adminAddress } = await getNamedAccounts();
    admin = await wallet.impersonate(adminAddress);
    await ethers.provider.send('hardhat_setBalance', [adminAddress, '0xffffffffffffffff']);

    [caller, recipient] = await ethers.getSigners();
    wethWhale = await wallet.impersonate(WETH_WHALE_ADDRESS);
    await ethers.provider.send('hardhat_setBalance', [WETH_WHALE_ADDRESS, '0xffffffffffffffff']);

    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  swapAndTransferTest({
    swapper: '0x',
    type: 'Exact In',
    getQuote: async ({ tokenIn, tokenOut, chainId, slippagePercentage }) => {
      const quote = await zrxQuote({
        chainId,
        sellToken: tokenIn,
        buyToken: tokenOut,
        sellAmount: AMOUNT_EXACT_IN,
        slippagePercentage: slippagePercentage / 100,
      });
      return {
        swapperAddress: quote.to,
        allowanceTarget: quote.allowanceTarget,
        amountIn: quote.sellAmount,
        amountOut: quote.buyAmount,
        data: quote.data,
      };
    },
  });

  swapAndTransferTest({
    swapper: '0x',
    type: 'Exact Out',
    getQuote: async ({ tokenIn, tokenOut, chainId, slippagePercentage }) => {
      const quote = await zrxQuote({
        chainId,
        sellToken: tokenIn,
        buyToken: tokenOut,
        buyAmount: AMOUNT_EXACT_OUT,
        slippagePercentage: slippagePercentage / 100,
      });
      return {
        swapperAddress: quote.to,
        allowanceTarget: quote.allowanceTarget,
        amountIn: quote.sellAmount,
        amountOut: quote.buyAmount,
        data: quote.data,
      };
    },
  });

  swapAndTransferTest({
    swapper: '1inch',
    type: 'Exact In',
    getQuote: async ({ tokenIn, tokenOut, chainId, slippagePercentage }) => {
      const quote = await oneInchQuote(chainId, {
        tokenIn,
        tokenOut,
        amountIn: AMOUNT_EXACT_IN,
        fromAddress: swapProxy.address,
        slippage: slippagePercentage,
        disableEstimate: true,
        allowPartialFill: false,
      });
      return {
        swapperAddress: quote.tx.to,
        allowanceTarget: quote.tx.to,
        amountIn: quote.fromTokenAmount,
        amountOut: quote.toTokenAmount,
        data: quote.tx.data,
      };
    },
  });

  swapAndTransferTest({
    swapper: 'Paraswap',
    type: 'Exact In',
    getQuote: async ({ tokenIn, tokenOut, chainId, slippagePercentage }) => {
      const quote = await paraswapQuote({
        srcToken: tokenIn,
        destToken: tokenOut,
        amount: AMOUNT_EXACT_IN,
        userAddress: swapProxy.address,
        side: 'SELL',
        network: chainId,
        slippage: slippagePercentage,
      });
      return {
        swapperAddress: quote.to,
        allowanceTarget: quote.allowanceTarget,
        amountIn: quote.srcAmount,
        amountOut: quote.destAmount,
        data: quote.data,
      };
    },
  });

  swapAndTransferTest({
    swapper: 'Paraswap',
    type: 'Exact Out',
    checkUnspentTokensIn: true,
    getQuote: async ({ tokenIn, tokenOut, chainId, slippagePercentage }) => {
      const quote = await paraswapQuote({
        srcToken: tokenIn,
        destToken: tokenOut,
        amount: AMOUNT_EXACT_OUT,
        userAddress: swapProxy.address,
        side: 'BUY',
        network: chainId,
        slippage: slippagePercentage,
      });
      return {
        swapperAddress: quote.to,
        allowanceTarget: quote.allowanceTarget,
        amountIn: quote.srcAmount,
        amountOut: quote.destAmount,
        data: quote.data,
      };
    },
  });

  function swapAndTransferTest({
    swapper,
    type,
    getQuote,
    checkUnspentTokensIn,
  }: {
    swapper: string;
    type: 'Exact In' | 'Exact Out';
    checkUnspentTokensIn?: boolean;
    getQuote: (_: { tokenIn: string; tokenOut: string; chainId: number; slippagePercentage: number }) => Promise<Quote>;
  }) {
    describe(swapper + ' (' + type + ')', () => {
      let amountOut: BigNumber, minAmountOut: BigNumber;
      let amountIn: BigNumber, maxAmountIn: BigNumber;
      given(async () => {
        const quote = await getQuote({
          tokenIn: WETH.address,
          tokenOut: USDC.address,
          chainId: CHAIN.chainId,
          slippagePercentage: SLIPPAGE_PERCENTAGE,
        });
        amountIn = BigNumber.from(quote.amountIn);
        amountOut = BigNumber.from(quote.amountOut);
        if (type === 'Exact In') {
          maxAmountIn = amountIn;
          minAmountOut = amountOut.sub(calculatePercentage(amountOut, SLIPPAGE_PERCENTAGE));
        } else {
          maxAmountIn = amountIn.add(calculatePercentage(amountIn, SLIPPAGE_PERCENTAGE));
          minAmountOut = amountOut;
        }

        await swapProxy.connect(admin).allowSwappers([quote.swapperAddress]);
        await WETH.connect(wethWhale).transfer(caller.address, maxAmountIn);
        await WETH.connect(caller).approve(swapProxy.address, maxAmountIn);
        await swapProxy.connect(caller).swapAndTransfer({
          swapper: quote.swapperAddress,
          allowanceTarget: quote.allowanceTarget,
          swapData: quote.data,
          tokensIn: [{ token: WETH.address, amount: maxAmountIn }],
          tokensOut: [USDC.address],
          recipient: recipient.address,
          checkUnspentTokensIn: !!checkUnspentTokensIn,
        });
      });

      when('swap & transfer is executed through the swap proxy', () => {
        if (!checkUnspentTokensIn) {
          then(`caller has no 'from' token left`, async () => {
            const balance = await WETH.balanceOf(caller.address);
            expect(balance).to.equal(0);
          });
        }
        then(`caller has no 'to' token`, async () => {
          const balance = await USDC.balanceOf(caller.address);
          expect(balance).to.equal(0);
        });
        then(`proxy has no 'from' token left`, async () => {
          const balance = await WETH.balanceOf(swapProxy.address);
          expect(balance).to.equal(0);
        });
        then(`proxy has no 'to' token left`, async () => {
          const balance = await USDC.balanceOf(swapProxy.address);
          expect(balance).to.equal(0);
        });
        then(`recipient has no 'from' token`, async () => {
          const balance = await WETH.balanceOf(recipient.address);
          expect(balance).to.equal(0);
        });
        then(`recipient has the expected amount of 'to' token`, async () => {
          const balance = await USDC.balanceOf(recipient.address);
          validateResult(balance);
        });
      });

      function validateResult(result: BigNumber) {
        expect(result.gte(minAmountOut)).to.be.true;
      }

      const PRECISION = 10000;
      function calculatePercentage(amount: BigNumber, percentage: number) {
        const numerator = amount.mul(Math.round((percentage * PRECISION) / 100));
        return numerator.mod(PRECISION).isZero() ? numerator.div(PRECISION) : numerator.div(PRECISION).add(1); // Round up
      }
    });
  }

  const DETERMINISTIC_FACTORY_ADMIN = '0x1a00e1e311009e56e3b0b9ed6f86f5ce128a1c01';
  const DEPLOYER_ROLE = utils.keccak256(utils.toUtf8Bytes('DEPLOYER_ROLE'));
  async function fork({ chain, chainId, deployer }: { chain: string; chainId: number; deployer: SignerWithAddress }): Promise<void> {
    // Set fork of network
    await evm.reset({
      jsonRpcUrl: getNodeUrl(chain),
    });
    setTestChainId(chainId);
    // Give deployer role to our deployer address
    const admin = await wallet.impersonate(DETERMINISTIC_FACTORY_ADMIN);
    await wallet.setBalance({ account: admin._address, balance: constants.MaxUint256 });
    const deterministicFactory = await ethers.getContractAt<DeterministicFactory>(
      DeterministicFactory__factory.abi,
      '0xbb681d77506df5CA21D2214ab3923b4C056aa3e2'
    );
    await deterministicFactory.connect(admin).grantRole(DEPLOYER_ROLE, deployer.address);
  }
});
