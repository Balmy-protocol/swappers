import { IERC20 } from '@mean-finance/deterministic-factory/typechained';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

export async function expectETHBalanceToBeEmpty(hasAddress: { address: string }) {
  const balance = await ethers.provider.getBalance(hasAddress.address);
  expect(balance).to.equal(0);
}

export async function expectBalanceToBeEmpty(token: IERC20, hasAddress: { address: string }) {
  const balance = await token.balanceOf(hasAddress.address);
  expect(balance).to.equal(0);
}

export async function expectBalanceToBeGreatherThan(token: IERC20, minAmountOut: BigNumber, hasAddress: { address: string }) {
  const balance = await token.balanceOf(hasAddress.address);
  expect(balance.gte(minAmountOut)).to.be.true;
}
