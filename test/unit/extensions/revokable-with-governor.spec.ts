import chai from 'chai';
import { ethers } from 'hardhat';
import { contract, given, when } from '@utils/bdd';
import { Extensions, Extensions__factory, IERC20 } from '@typechained';
import { snapshot } from '@utils/evm';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { thenRevokeWasCalledCorrectly } from './assertions';
import { behaviours } from '@utils';

chai.use(smock.matchers);

contract('RevokableWithGovernor', () => {
  const ACCOUNT = '0x0000000000000000000000000000000000000001';

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
  });

  describe('revokeAllowances', () => {
    when('allowance is revoked', () => {
      given(async () => {
        await extensions.connect(governor).revokeAllowances([{ spender: ACCOUNT, tokens: [token.address] }]);
      });
      thenRevokeWasCalledCorrectly(() => ({
        contract: extensions,
        calls: [[{ spender: ACCOUNT, tokens: [token.address] }]],
      }));
    });
    behaviours.shouldBeExecutableOnlyByGovernor({
      contract: () => extensions,
      funcAndSignature: 'revokeAllowances',
      params: [[]],
      governor: () => governor,
    });
  });
});
