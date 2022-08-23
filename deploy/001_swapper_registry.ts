import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { bytecode } from '../artifacts/solidity/contracts/SwapperRegistry.sol/SwapperRegistry.json';
import { deployThroughDeterministicFactory } from '@mean-finance/deterministic-factory/utils/deployment';
import { DeployFunction } from '@0xged/hardhat-deploy/dist/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, msig } = await hre.getNamedAccounts();

  await deployThroughDeterministicFactory({
    deployer,
    name: 'SwapperRegistry',
    salt: 'MF-Swapper-Registry-V1',
    contract: 'solidity/contracts/SwapperRegistry.sol:SwapperRegistry',
    bytecode,
    constructorArgs: {
      types: ['address[]', 'address[]', 'address', 'address[]'],
      values: [[], [], msig, [msig]],
    },
    log: !process.env.TEST,
    overrides: !!process.env.COVERAGE
      ? {}
      : {
          gasLimit: 3_000_000,
        },
  });
};

deployFunction.dependencies = [];
deployFunction.tags = ['SwapperRegistry'];
export default deployFunction;
