// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import './ISwapperRegistry.sol';

/**
 * @notice This abstract contract will give contracts that implement it swapping capabilities. It will
 *         take a swapper and a swap's data, and if the swapper is valid, it will execute the swap
 */
interface ISwapAdapter {
  /// @notice Thrown when one of the parameters is a zero address
  error ZeroAddress();

  /**
   * @notice Returns the address of the swapper registry
   * @dev Cannot be modified
   * @return The address of the swapper registry
   */
  function SWAPPER_REGISTRY() external view returns (ISwapperRegistry);
}
