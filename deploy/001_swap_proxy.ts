import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { SwapProxy__factory } from '@typechained';
import { deployThroughDeterministicFactory } from '@mean-finance/deterministic-factory/utils/deployment';
import { DeployFunction } from '@0xged/hardhat-deploy/dist/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, admin: superAdmin } = await hre.getNamedAccounts();

  await deployThroughDeterministicFactory({
    deployer,
    name: 'SwapProxy',
    salt: 'MF-Swap-Proxy-V1',
    contract: 'solidity/contracts/SwapProxy.sol:SwapProxy',
    bytecode: SwapProxy__factory.bytecode,
    constructorArgs: {
      types: ['address[]', 'address', 'address[]'],
      values: [[], superAdmin, [superAdmin]],
    },
    log: !process.env.TEST,
    overrides: {
      gasLimit: 3_000_000,
    },
  });
};

deployFunction.dependencies = [];
deployFunction.tags = ['SwapProxy'];
export default deployFunction;
