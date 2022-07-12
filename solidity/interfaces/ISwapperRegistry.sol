// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

/**
 * @notice This contract will act as a registry to allowlist swappers. Different contracts from the Mean
 *         ecosystem will ask this contract if an address is a valid swapper or not
 */
interface ISwapperRegistry {
  /// @notice Thrown when one of the parameters is a zero address
  error ZeroAddress();

  /**
   * @notice Emitted when swappers are removed from the allowlist
   * @param swappers The swappers that were removed
   */
  event RemoveSwappersFromAllowlist(address[] swappers);

  /**
   * @notice Emitted when new swappers are added to the allowlist
   * @param swappers The swappers that were added
   */
  event AllowedSwappers(address[] swappers);

  /**
   * @notice Returns whether a given account is allowlisted for swaps
   * @param account The address to check
   * @return Whether it is allowlisted for swaps
   */
  function isAllowlisted(address account) external view returns (bool);

  /**
   * @notice Adds a list of swappers to the allowlist
   * @dev Can only be called by users with the admin role
   * @param swappers The list of swappers to add
   */
  function allowSwappers(address[] calldata swappers) external;

  /**
   * @notice Removes given swappers from the allowlist
   * @dev Can only be called by users with the admin role
   * @param swappers The list of swappers to remove
   */
  function removeSwappersFromAllowlist(address[] calldata swappers) external;
}