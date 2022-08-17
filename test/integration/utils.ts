import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IERC20, SwapperRegistry, SwapProxy } from '@typechained';
import { evm, wallet } from '@utils';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { DeterministicFactory, DeterministicFactory__factory } from '@mean-finance/deterministic-factory/typechained';
import { QuoteInput, Quote } from './dex-adapters';
import { abi as IERC20_ABI } from '@openzeppelin/contracts/build/contracts/IERC20.json';

export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WETH_WHALE_ADDRESS = '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e';
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDC_WHALE_ADDRESS = '0x0a59649758aa4d66e25f08dd01271e891fe52199';
const MANA_ADDRESS = '0x0f5d2fb29fb7d3cfee444a200298f468908cc942';
const MANA_WHALE_ADDRESS = '0xefb94ac00f1cee8a89d5c3f49faa799da6f03024';

export async function getQuoteAndAllowlistSwapper({
  swapProxy,
  registry,
  tokenIn,
  tokenOut,
  slippagePercentage,
  trade,
  amount,
  quoter,
  recipient,
}: {
  swapProxy: SwapProxy;
  registry: SwapperRegistry;
  tokenIn: IERC20 | 'ETH';
  tokenOut: IERC20 | 'ETH';
  slippagePercentage?: number;
  amount: BigNumberish;
  trade: 'sell' | 'buy';
  quoter: (input: QuoteInput) => Promise<Quote>;
  recipient?: SignerWithAddress;
}) {
  const slippage = slippagePercentage ?? 1;
  const quote = await quoter({
    tokenIn: tokenIn == 'ETH' ? ETH_ADDRESS : tokenIn.address,
    tokenOut: tokenOut == 'ETH' ? ETH_ADDRESS : tokenOut.address,
    chainId: 1,
    slippagePercentage: slippage,
    amount,
    userAddress: swapProxy.address,
    trade,
    recipient: recipient?.address,
  });
  const amountIn = BigNumber.from(quote.amountIn);
  const amountOut = BigNumber.from(quote.amountOut);
  let maxAmountIn: BigNumber, minAmountOut: BigNumber;
  if (trade === 'sell') {
    maxAmountIn = amountIn;
    minAmountOut = amountOut.sub(calculatePercentage(amountOut, slippage));
  } else {
    maxAmountIn = amountIn.add(calculatePercentage(amountIn, slippage));
    minAmountOut = amountOut;
  }
  const { msig: adminAddress } = await getNamedAccounts();
  const admin = await wallet.impersonate(adminAddress);
  await ethers.provider.send('hardhat_setBalance', [adminAddress, '0xffffffffffffffff']);
  await registry.connect(admin).allowSwappers([quote.swapperAddress]);
  if (quote.allowanceTarget !== quote.swapperAddress) {
    await registry.connect(admin).allowSupplementaryAllowanceTargets([quote.allowanceTarget]);
  }
  return { ...quote, maxAmountIn, minAmountOut };
}

export async function deployContractsAndReturnSigners() {
  await fork({ chain: 'ethereum' });
  await deployments.fixture(['SwapProxy'], { keepExistingDeployments: false });
  const registry = await ethers.getContract<SwapperRegistry>('SwapperRegistry');
  const swapProxy = await ethers.getContract<SwapProxy>('SwapProxy');
  const WETH = await ethers.getContractAt<IERC20>(IERC20_ABI, WETH_ADDRESS);
  const USDC = await ethers.getContractAt<IERC20>(IERC20_ABI, USDC_ADDRESS);
  const MANA = await ethers.getContractAt<IERC20>(IERC20_ABI, MANA_ADDRESS);

  const wethWhale = await wallet.impersonate(WETH_WHALE_ADDRESS);
  await wallet.setBalance({ account: WETH_WHALE_ADDRESS, balance: BigNumber.from('0xffffffffffffffff') });
  const usdcWhale = await wallet.impersonate(USDC_WHALE_ADDRESS);
  await wallet.setBalance({ account: USDC_WHALE_ADDRESS, balance: BigNumber.from('0xffffffffffffffff') });
  const manaWhale = await wallet.impersonate(MANA_WHALE_ADDRESS);
  await wallet.setBalance({ account: MANA_WHALE_ADDRESS, balance: BigNumber.from('0xffffffffffffffff') });
  return { registry, swapProxy, WETH, USDC, MANA, wethWhale, usdcWhale, manaWhale };
}

export async function fork({ chain }: { chain: string }): Promise<void> {
  await evm.reset({
    network: chain,
  });
  const { eoaAdmin, deployer } = await getNamedAccounts();
  const deployerAdmin = await wallet.impersonate(eoaAdmin);
  await wallet.setBalance({ account: deployerAdmin._address, balance: constants.MaxUint256 });
  const deterministicFactory = await ethers.getContractAt<DeterministicFactory>(
    DeterministicFactory__factory.abi,
    '0xbb681d77506df5CA21D2214ab3923b4C056aa3e2'
  );
  await deterministicFactory.connect(deployerAdmin).grantRole(await deterministicFactory.DEPLOYER_ROLE(), deployer);
}

const PRECISION = 10000;
function calculatePercentage(amount: BigNumber, percentage: number) {
  const numerator = amount.mul(Math.round((percentage * PRECISION) / 100));
  return numerator.mod(PRECISION).isZero() ? numerator.div(PRECISION) : numerator.div(PRECISION).add(1); // Round up
}
