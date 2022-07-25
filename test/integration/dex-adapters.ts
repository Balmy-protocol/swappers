import { BigNumber, BigNumberish } from 'ethers';
import { swap as paraswapQuote } from './dexes/paraswap';
import { quote as zrxQuote } from './dexes/zrx';
import { swap as oneInchQuote } from './dexes/oneinch';

export type QuoteInput = {
  tokenIn: string;
  tokenOut: string;
  amount: BigNumberish;
  userAddress: string;
  trade: 'buy' | 'sell';
  chainId: number;
  slippagePercentage: number;
  recipient?: string;
};

export type Quote = {
  swapperAddress: string;
  allowanceTarget: string;
  amountIn: BigNumberish;
  amountOut: BigNumberish;
  data: string;
};

export async function paraswapAdapter({
  tokenIn,
  tokenOut,
  amount,
  trade,
  chainId,
  slippagePercentage,
  recipient,
  userAddress,
}: QuoteInput): Promise<Quote> {
  const quote = await paraswapQuote({
    srcToken: tokenIn,
    destToken: tokenOut,
    amount: amount,
    userAddress,
    side: trade.toUpperCase() as any,
    network: chainId,
    slippage: slippagePercentage,
    receiver: recipient,
  });
  return {
    swapperAddress: quote.to,
    allowanceTarget: quote.allowanceTarget,
    amountIn: quote.srcAmount,
    amountOut: quote.destAmount,
    data: quote.data,
  };
}

export async function zrxAdapter({ tokenIn, tokenOut, amount, trade, chainId, slippagePercentage }: QuoteInput): Promise<Quote> {
  const quote = await zrxQuote({
    chainId,
    sellToken: tokenIn,
    buyToken: tokenOut,
    buyAmount: trade === 'buy' ? amount : undefined,
    sellAmount: trade === 'sell' ? amount : undefined,
    slippagePercentage: slippagePercentage / 100,
  });
  return {
    swapperAddress: quote.to,
    allowanceTarget: quote.allowanceTarget,
    amountIn: quote.sellAmount,
    amountOut: quote.buyAmount,
    data: quote.data,
  };
}

export async function oneInchAdapter({
  tokenIn,
  tokenOut,
  amount,
  trade,
  chainId,
  userAddress,
  slippagePercentage,
}: QuoteInput): Promise<Quote> {
  if (trade === 'buy') throw new Error('1inch does not support but');
  const quote = await oneInchQuote(chainId, {
    tokenIn,
    tokenOut,
    amountIn: BigNumber.from(amount),
    fromAddress: userAddress,
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
}
