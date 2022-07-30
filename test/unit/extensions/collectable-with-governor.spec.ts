import chai from 'chai';
import { ethers } from 'hardhat';
import { contract, given, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20 } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { thenSendToRecipientWasCalledCorrectly } from './assertions';
import { behaviours } from '@utils';

chai.use(smock.matchers);

contract('CollectableWithGovernor', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';
  const AMOUNT = 100000;

  let governor: SignerWithAddress;
  let extensions: Extensions;
  let token: FakeContract<IERC20>;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [, governor] = await ethers.getSigners();
    token = await smock.fake('IERC20');
    const factory: Extensions__factory = await ethers.getContractFactory('solidity/contracts/test/Extensions.sol:Extensions');
    extensions = await factory.deploy(ACCOUNT, governor.address);
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
    token.transfer.returns(true);
  });

  describe('sendDust', () => {
    when('function is called', () => {
      given(async () => {
        await extensions.connect(governor).sendDust(token.address, AMOUNT, ACCOUNT);
      });
      thenSendToRecipientWasCalledCorrectly(() => ({
        contract: extensions,
        calls: [{ token: token.address, amount: AMOUNT, recipient: ACCOUNT }],
      }));
    });
    behaviours.shouldBeExecutableOnlyByGovernor({
      contract: () => extensions,
      funcAndSignature: 'sendDust',
      params: () => [token.address, AMOUNT, ACCOUNT],
      governor: () => governor,
    });
  });
});
