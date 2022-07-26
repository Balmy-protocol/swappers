import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20, Swapper } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { behaviours, wallet } from '@utils';
import { constants, utils } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';

chai.use(smock.matchers);

contract('InternalCollectableDust', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let token: FakeContract<IERC20>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    token = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(ACCOUNT, ACCOUNT);
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    token.transfer.returns(true);
    token.transferFrom.returns(true);
  });

  describe('_sendDust', () => {
    when('sending dust to zero address', () => {
      then('tx is reverted with reason', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: extensions,
          func: 'internalSendDust',
          args: [token.address, 10, constants.AddressZero],
          message: 'DustRecipientIsZeroAddress',
        });
      });
    });
    when('sending ETH dust', () => {
      const INITIAL_DUST_BALANCE = utils.parseEther('1');
      const DUST_TO_COLLECT = utils.parseEther('0.1');
      let tx: TransactionResponse;
      given(async () => {
        await wallet.setBalance({ account: extensions.address, balance: INITIAL_DUST_BALANCE });
        tx = await extensions.internalSendDust(await extensions.PROTOCOL_TOKEN(), DUST_TO_COLLECT, ACCOUNT);
      });
      then('eth is collected from contract', async () => {
        expect(await ethers.provider.getBalance(extensions.address)).to.equal(INITIAL_DUST_BALANCE.sub(DUST_TO_COLLECT));
      });
      then('eth is sent to recipient', async () => {
        expect(await ethers.provider.getBalance(ACCOUNT)).to.equal(DUST_TO_COLLECT);
      });
      then('event is emitted with arguments', async () => {
        await expect(tx)
          .to.emit(extensions, 'DustSent')
          .withArgs(await extensions.PROTOCOL_TOKEN(), DUST_TO_COLLECT, ACCOUNT);
      });
    });
    when('sending erc20 dust', () => {
      const DUST_TO_COLLECT = utils.parseEther('0.1');
      let tx: TransactionResponse;
      given(async () => {
        tx = await extensions.internalSendDust(token.address, DUST_TO_COLLECT, ACCOUNT);
      });
      then('erc20 transfer is executed', async () => {
        expect(token.transfer).to.have.been.calledOnceWith(ACCOUNT, DUST_TO_COLLECT);
      });
      then('event is emitted with arguments', async () => {
        await expect(tx).to.emit(extensions, 'DustSent').withArgs(token.address, DUST_TO_COLLECT, ACCOUNT);
      });
    });
  });
});
