// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

/**
 * @notice This contract will simply act as a proxy to execute swaps in other contracts. We've built this
 *         proxy so that we can concentrate ERC20 approvals in one place, and we can control which swappers
 *         are allowed and which aren't
 */
interface ISwapProxy {
  /// @notice The parameters for swap & transfer
  struct SwapAndTransferParams {
    // The swapper that will execute the call
    address swapper;
    // The account that needs to be approved for token transfers
    address allowanceTarget;
    // The actual swap execution
    bytes swapData;
    // The tokens that will be swapped, and their max amounts
    AmountOfToken[] tokensIn;
    // The tokens that will be received
    address[] tokensOut;
    // The account that should receive the swapped tokens
    address recipient;
    // Determine if we need to check if there are any unspent tokens in to return to the caller
    bool checkUnspentTokensIn;
  }

  /// @notice A token with an associated amount
  struct AmountOfToken {
    address token;
    uint256 amount;
  }

  /**
   * @notice Thrown when a swapper that is not allowlisted tries to execute a swap
   * @param swapper The swapper that was not allowlisted
   */

  error SwapperNotAllowlisted(address swapper);

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
   * @notice Executes a swap and sends the swapped funds to the given recipient
   *         This function is basically a wrapper that acts as a proxy between the caller and the swapper.
   *         It is meant to add swap & transfer capabilities to swappers that do not support it natively
   * @dev This function can only be called by swappers that are allowlisted
   *      This function does not delegate the call to the swapper
   * @param params The parameters for the swap and transfer
   */
  function swapAndTransfer(SwapAndTransferParams calldata params) external payable;

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
