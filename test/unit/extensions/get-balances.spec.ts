import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20, GetBalances } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { wallet } from '@utils';
import { constants, utils } from 'ethers';

chai.use(smock.matchers);

contract('GetBalances', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let token: FakeContract<IERC20>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    token = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(ACCOUNT);
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    token.transfer.returns(true);
    token.transferFrom.returns(true);
  });

  describe('getBalances', () => {
    const BALANCE = utils.parseEther('0.1');
    when('querying for an ERC20', () => {
      let balances: GetBalances.TokenBalanceStructOutput[];
      given(async () => {
        token.balanceOf.returns(BALANCE);
        balances = await extensions.getBalances([token.address]);
      });
      then('balance is queried correctly', () => {
        expect(token.balanceOf).to.have.been.calledOnceWith(extensions.address);
      });
      then('balances are returned correctly', async () => {
        expect(balances.length).to.equal(1);
        expect(balances[0].token).to.equal(token.address);
        expect(balances[0].balance).to.equal(BALANCE);
      });
    });
    when('querying for protocol token', () => {
      let balances: GetBalances.TokenBalanceStructOutput[];
      given(async () => {
        await wallet.setBalance({ account: extensions.address, balance: BALANCE });
        balances = await extensions.getBalances([await extensions.PROTOCOL_TOKEN()]);
      });
      then('balances are returned correctly', async () => {
        expect(balances.length).to.equal(1);
        expect(balances[0].token).to.equal(await extensions.PROTOCOL_TOKEN());
        expect(balances[0].balance).to.equal(BALANCE);
      });
    });
    when('querying for an invalid address', () => {
      let tx: Promise<GetBalances.TokenBalanceStructOutput[]>;
      given(() => {
        tx = extensions.getBalances([constants.AddressZero]);
      });
      then('tx is reverted', async () => {
        await expect(tx).to.have.reverted;
      });
    });
  });
});
