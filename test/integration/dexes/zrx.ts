import { BigNumber } from '@ethersproject/bignumber';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BigNumberish } from 'ethers';
import qs from 'qs';

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const API_URL: { [chainId: number]: string } = {
  1: 'api.0x.org',
  137: 'polygon.api.0x.org',
  10: 'optimism.api.0x.org',
};

export type QuoteRequest = {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: BigNumberish;
  buyAmount?: BigNumberish;
  slippagePercentage?: number;
  gasPrice?: BigNumberish;
  takerAddress?: string;
  excludeSources?: string[] | string;
  includeSources?: string[];
  skipValidation?: boolean;
  intentOnFilling?: boolean;
  buyTokenPercentageFee?: number;
  affiliateAddress?: string;
};

export type QuoteResponse = {
  chainId: number;
  price: string;
  guaranteedPrice: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  estimatedGas: string;
  gasPrice: string;
  protocolFee: string;
  minimumProtocolFee: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  buyAmount: string;
  sellAmount: string;
  sources: any[];
  orders: any[];
  allowanceTarget: string;
  sellTokenToEthRate: string;
  buyTokenToEthRate: string;
};

export const quote = async (quoteRequest: QuoteRequest): Promise<QuoteResponse> => {
  quoteRequest.sellAmount = quoteRequest.sellAmount ? BigNumber.from(quoteRequest.sellAmount).toString() : undefined;
  quoteRequest.buyAmount = quoteRequest.buyAmount ? BigNumber.from(quoteRequest.buyAmount).toString() : undefined;
  quoteRequest.gasPrice = quoteRequest.gasPrice ? BigNumber.from(quoteRequest.gasPrice).toString() : undefined;

  quoteRequest.excludeSources = (quoteRequest.excludeSources as string[]) ?? [];
  quoteRequest.excludeSources.push('Mesh');

  quoteRequest.excludeSources = quoteRequest.excludeSources.join(',');

  let response: any;
  try {
    response = await axios.get(`https://${API_URL[quoteRequest.chainId]}/swap/v1/quote?${qs.stringify(quoteRequest)}`);
  } catch (err: any) {
    console.log(err.response.data);
    throw new Error(`Error code: ${err.response.data.code}. Reason: ${err.response.data.reason}`);
  }
  return response.data as QuoteResponse;
};

export default {
  quote,
};
