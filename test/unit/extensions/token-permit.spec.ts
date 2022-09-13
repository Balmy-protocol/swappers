import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { contract, given, then, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20Permit } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { utils } from 'ethers';

chai.use(smock.matchers);

contract('TokenPermit', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';

  let caller: SignerWithAddress;
  let extensions: Extensions;
  let token: FakeContract<IERC20Permit>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [caller] = await ethers.getSigners();
    token = await smock.fake('IERC20Permit');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(ACCOUNT, ACCOUNT);
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  describe('permit', () => {
    const OWNER = '0x0000000000000000000000000000000000000001';
    const SPENDER = '0x0000000000000000000000000000000000000002';
    const VALUE = 10000;
    const DEADLINE = 1234566;
    const V = 12;
    const R = utils.formatBytes32String('r');
    const S = utils.formatBytes32String('s');
    when('executing permit', () => {
      given(async () => {
        await extensions.permit(token.address, OWNER, SPENDER, VALUE, DEADLINE, V, R, S);
      });
      then('token permit is called correctly', async () => {
        expect(token.permit).to.have.been.calledOnceWith(OWNER, SPENDER, VALUE, DEADLINE, V, R, S);
      });
    });
  });
});
