import { FakeContract } from '@defi-wonderland/smock';
import { Extensions, ISwapperRegistry } from '@typechained';
import { then } from '@utils/bdd';
import { expect } from 'chai';

export function thenTakeFromMsgSenderIsCalledCorrectly(args: () => { contract: Extensions; calls: { token: string; amount: number }[] }) {
  then('_takeFromMsgSender is called correctly', async () => {
    const { contract, calls: expectedCalls } = args();
    const calls = await contract.takeFromMsgSenderCalls();
    expect(calls).to.have.lengthOf(expectedCalls.length);
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].token).to.equal(expectedCalls[i].token);
      expect(calls[i].amount).to.equal(expectedCalls[i].amount);
    }
  });
}
export function thenMaxApproveSpenderIsCalledCorrectly(
  args: () => { contract: Extensions; calls: { token: string; spender: string; alreadyValidatedSpender: boolean; minAllowance: number }[] }
) {
  then('_maxApproveSpenderIfNeeded is called correctly', async () => {
    const { contract, calls: expectedCalls } = args();
    const calls = await contract.maxApproveSpenderCalls();
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].token).to.equal(expectedCalls[i].token);
      expect(calls[i].spender).to.equal(expectedCalls[i].spender);
      expect(calls[i].alreadyValidatedSpender).to.equal(expectedCalls[i].alreadyValidatedSpender);
      expect(calls[i].minAllowance).to.equal(expectedCalls[i].minAllowance);
    }
  });
}

export function thenExecuteSwapIsCalledCorrectly(args: () => { contract: Extensions; calls: { swapper: string; swapData: string }[] }) {
  then('_executeSwap is called correctly', async () => {
    const { contract, calls: expectedCalls } = args();
    const calls = await contract.executeSwapCalls();
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].swapper).to.equal(expectedCalls[i].swapper);
      expect(calls[i].swapData).to.equal(expectedCalls[i].swapData);
    }
  });
}

export function thenSendBalanceToRecipientIsCalledCorrectly(
  args: () => { contract: Extensions; calls: { token: string; recipient: string }[] }
) {
  then('_sendBalanceToRecipient is called correctly', async () => {
    const { contract, calls: expectedCalls } = args();
    const calls = await contract.sendBalanceToRecipientCalls();
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].token).to.equal(expectedCalls[i].token);
      expect(calls[i].recipient).to.equal(expectedCalls[i].recipient);
    }
  });
}

export function thenSendBalanceToRecipientIsNotCalled(contract: () => Extensions) {
  then('_sendBalanceToRecipient is not called', async () => {
    const calls = await contract().sendBalanceToRecipientCalls();
    expect(calls).to.have.lengthOf(0);
  });
}

export function thenAllowlistWasCheckedForSwappers(args: () => { registry: FakeContract<ISwapperRegistry>; swappers: string[] }) {
  then('allow list was checked correctly for swappers', async () => {
    const { registry, swappers } = args();
    expect(registry.isSwapperAllowlisted).to.have.callCount(swappers.length);
    for (const swapper of swappers) {
      expect(registry.isSwapperAllowlisted).to.have.been.calledWith(swapper);
    }
  });
}
