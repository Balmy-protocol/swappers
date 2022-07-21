import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { SwapperRegistry__factory } from '@typechained';
import { deployThroughDeterministicFactory } from '@mean-finance/deterministic-factory/utils/deployment';
import { DeployFunction } from '@0xged/hardhat-deploy/dist/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, admin: superAdmin } = await hre.getNamedAccounts();

  await deployThroughDeterministicFactory({
    deployer,
    name: 'SwapperRegistry',
    salt: 'MF-Swapper-Registry-V1',
    contract: 'solidity/contracts/SwapperRegistry.sol:SwapperRegistry',
    bytecode: SwapperRegistry__factory.bytecode,
    constructorArgs: {
      types: ['address[]', 'address[]', 'address', 'address[]'],
      values: [[], [], superAdmin, [superAdmin]],
    },
    log: !process.env.TEST,
    overrides: {
      gasLimit: 3_000_000,
    },
  });
};

deployFunction.dependencies = [];
deployFunction.tags = ['SwapperRegistry'];
export default deployFunction;
