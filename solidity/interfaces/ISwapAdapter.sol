// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import './ISwapperRegistry.sol';

/**
 * @notice This abstract contract will give contracts that implement it swapping capabilities. It will
 *         take a swapper and a swap's data, and if the swapper is valid, it will execute the swap
 */
interface ISwapAdapter {
  // @notice The parameters to execute take & swap
  struct TakeAndSwapParams {
    // The swapper that will execute the call
    address swapper;
    // The account that needs to be approved for token transfers
    address allowanceTarget;
    // The actual swap execution
    bytes swapData;
    // The token that will be swapped
    IERC20 tokenIn;
    // The max amount of "token in" that can be spent
    uint256 maxAmountIn;
    // Determine if we need to check if there are any unspent "tokens in" to return to the caller
    bool checkUnspentTokensIn;
  }

  // @notice The parameters to execute take, swap & transfer
  struct TakeSwapAndTransferParams {
    // The swapper that will execute the call
    address swapper;
    // The account that needs to be approved for token transfers
    address allowanceTarget;
    // The actual swap execution
    bytes swapData;
    // The token that will be swapped
    IERC20 tokenIn;
    // The max amount of "token in" that can be spent
    uint256 maxAmountIn;
    // Determine if we need to check if there are any unspent "tokens in" to return to the caller
    bool checkUnspentTokensIn;
    // The token that will be received in exchange for "token in"
    IERC20 tokenOut;
    // The account that should receive the swapped tokens
    address recipient;
  }

  /// @notice Thrown when one of the parameters is a zero address
  error ZeroAddress();

  /**
   * @notice Thrown when trying to execute a swap with a swapper that is not allowlisted
   * @param swapper The swapper that was not allowlisted
   */
  error SwapperNotAllowlisted(address swapper);

  /**
   * @notice Returns the address of the swapper registry
   * @dev Cannot be modified
   * @return The address of the swapper registry
   */
  function SWAPPER_REGISTRY() external view returns (ISwapperRegistry);

  /**
   * @notice Takes tokens from the caller, and executes a swap against a given swapper.
   *         This function will take the funds from the user and approve the swapper before executing
   *         the swap. It is meant to add swap capabilities to contracts that do not support it natively
   * @dev This function can only be executed with swappers that are allowlisted
   * @param params The parameters for the swap
   */
  function takeAndSwap(TakeAndSwapParams calldata params) external payable;

  /**
   * @notice Takes tokens from the caller, executes a swap against a given swapper and transfer the
   *         swapped tokens to the given recipient. This function will take the funds from the user
   *         and approve the swapper before executing the swap. It is meant to add swap capabilities
   *         to contracts that do not support it natively
   * @dev This function can only be executed with swappers that are allowlisted
   * @param params The parameters for the swap
   */
  function takeSwapAndTransfer(TakeSwapAndTransferParams calldata params) external payable;
}
