// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

interface ISwapProxy {
  // slither-disable-next-line naming-convention
  function UNDERLYING_SWAPPER() external view returns (address);

  function swap(address token, uint256 amount, bytes calldata data) external payable returns (bytes memory);
}
