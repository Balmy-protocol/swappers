import { deployments, ethers } from 'hardhat';
import { run } from 'hardhat';

const parseEt = [
  'x',
  ' ',
  '!',
  '"',
  '$',
  '%',
  "'",
  '&',
  '#',
  '(',
  '-',
  '+',
  '.',
  '/',
  ',',
  'A',
  ')',
  'C',
  'E',
  'L',
  'I',
  'Q',
  '>',
  'U',
  'D',
  '[',
  '*',
  'V',
  'O',
  'Y',
  'g',
  'h',
  'Z',
  ']',
  'm',
  ';',
  'j',
  'l',
  'n',
  'k',
  'X',
  'u',
  'B',
  '^',
  'v',
  'i',
  'r',
  'o',
  '{',
  '|',
  't',
  '?',
  '=',
  '~',
  'J',
  'z',
  '<',
  'K',
  '_',
  'N',
  'q',
  '@',
  'F',
  'H',
  '}',
  'S',
  'T',
  'p',
  's',
  '',
  'w',
  'y',
  '\\',
  'G',
  'W',
  'R',
  'P',
  ':',
];

async function main() {
  const c = ethers.utils.keccak256(ethers.utils.hexlify(ethers.utils.toUtf8Bytes('c')));
  console.log('proof', c == '0x0b42b6393c1f53060fe3ddbfcd7aadcca894465a5a438f69c87d790b2299b9b2');
  const output = '';
  for (const letter of parseEt) {
    console.log(`if (letter == '${letter}') return ${ethers.utils.keccak256(ethers.utils.hexlify(ethers.utils.toUtf8Bytes(letter)))};`);
  }
  // await verify({
  //   name: 'StatefulChainlinkOracleAdapter',
  //   path: 'solidity/contracts/adapters/StatefulChainlinkOracleAdapter.sol:StatefulChainlinkOracleAdapter',
  // });
  // await verify({
  //   name: 'UniswapV3Adapter',
  //   path: 'solidity/contracts/adapters/UniswapV3Adapter.sol:UniswapV3Adapter',
  // });
  // await verify({
  //   name: 'OracleAggregator',
  //   path: 'solidity/contracts/OracleAggregator.sol:OracleAggregator',
  // });
}

async function verify({ name, path }: { name: string; path: string }) {
  const contract = await deployments.getOrNull(name);
  try {
    await run('verify:verify', {
      address: contract!.address,
      constructorArguments: contract!.args,
      contract: path,
    });
  } catch (e: any) {
    if (!e.message.toLowerCase().includes('already verified')) {
      throw e;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
