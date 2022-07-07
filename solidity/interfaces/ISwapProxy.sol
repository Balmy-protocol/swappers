// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

/**
 * @notice This contract will simply act as a proxy to execute swaps in other contracts. We've built this
 *         proxy so that we can concentrate ERC20 approvals in one place, and we can control which swappers
 *         are allowed and which aren't
 */
interface ISwapProxy {
  /// @notice Thrown when one of the parameters is a zero address
  error ZeroAddress();

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
}
