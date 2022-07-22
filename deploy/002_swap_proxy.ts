import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { SwapProxy__factory } from '@typechained';
import { deployThroughDeterministicFactory } from '@mean-finance/deterministic-factory/utils/deployment';
import { DeployFunction } from '@0xged/hardhat-deploy/dist/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();

  const registry = await hre.deployments.get('SwapperRegistry');

  await deployThroughDeterministicFactory({
    deployer,
    name: 'SwapProxy',
    salt: 'MF-Swap-Proxy-V1',
    contract: 'solidity/contracts/SwapProxy.sol:SwapProxy',
    bytecode: SwapProxy__factory.bytecode,
    constructorArgs: {
      types: ['address'],
      values: [registry.address],
    },
    log: !process.env.TEST,
    overrides: {
      gasLimit: 3_000_000,
    },
  });
};

deployFunction.dependencies = ['SwapperRegistry'];
deployFunction.tags = ['SwapProxy'];
export default deployFunction;
