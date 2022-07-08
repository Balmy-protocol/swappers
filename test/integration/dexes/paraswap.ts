import { BigNumber } from '@ethersproject/bignumber';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BigNumberish } from 'ethers';
import moment from 'moment';
import qs from 'qs';

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

export type SwapParams = {
  srcToken: string;
  srcDecimals?: number;
  destToken: string;
  destDecimals?: number;
  amount: BigNumberish; // In weis
  userAddress: string;
  receiver?: string;
  side: 'SELL' | 'BUY';
  network: number;
  otherExchangePrices?: boolean;
  includeDEXS?: string;
  excludeDEXS?: string;
  slippage?: number;
};

export type SwapResponse = {
  from: string;
  to: string;
  allowanceTarget: string;
  value: string;
  data: string;
  gasPrice: string;
  chainId: number;
  destAmount: BigNumber;
  srcAmount: BigNumber;
};

export const swap = async (swapParams: SwapParams): Promise<SwapResponse> => {
  try {
    const priceResponse = await axios.get(
      `https://apiv5.paraswap.io/prices?${qs.stringify({
        ...swapParams,
        amount: BigNumber.from(swapParams.amount).toString(),
      })}`
    );
    const transactionQueryParams = {
      ignoreChecks: true,
      ignoreGasEstimate: true,
    };
    let transactionsBodyParams: any = {
      srcToken: swapParams.srcToken,
      srcDecimals: swapParams.srcDecimals,
      destToken: swapParams.destToken,
      destDecimals: swapParams.destDecimals,
      priceRoute: priceResponse.data.priceRoute,
      slippage: swapParams.slippage ? swapParams.slippage * 100 : undefined,
      userAddress: swapParams.userAddress,
      receiver: swapParams.receiver,
      deadline: moment().add('10', 'minutes').unix(),
    };
    if (swapParams.side === 'SELL') {
      transactionsBodyParams.srcAmount = priceResponse.data.priceRoute.srcAmount;
    } else {
      transactionsBodyParams.destAmount = priceResponse.data.priceRoute.destAmount;
    }
    const transactionResponse = await axios.post(
      `https://apiv5.paraswap.io/transactions/${swapParams.network}?${qs.stringify(transactionQueryParams)}`,
      transactionsBodyParams
    );
    const finalData = {
      ...transactionResponse.data,
      // Ref.: https://developers.paraswap.network/smart-contracts#tokentransferproxy
      allowanceTarget: (priceResponse.data as any).priceRoute.tokenTransferProxy,
      srcAmount: BigNumber.from(priceResponse.data.priceRoute.srcAmount),
      destAmount: BigNumber.from(priceResponse.data.priceRoute.destAmount),
    };
    return finalData;
  } catch (err: any) {
    console.log(err);
    throw new Error(`Error while fetching transactions params: ${err.response.data.error}`);
  }
};

export default {
  swap,
};
