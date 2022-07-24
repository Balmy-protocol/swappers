// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import './ISwapperRegistry.sol';

/**
 * @notice This abstract contract will give contracts that implement it swapping capabilities. It will
 *         take a swapper and a swap's data, and if the swapper is valid, it will execute the swap
 */
interface ISwapAdapter {
  /// @notice Describes how the allowance should be revoked for the given spender
  struct RevokeAction {
    address spender;
    IERC20[] tokens;
  }

  /// @notice Thrown when one of the parameters is a zero address
  error ZeroAddress();

  /**
   * @notice Thrown when trying to execute a swap with a swapper that is not allowlisted
   * @param swapper The swapper that was not allowlisted
   */
  error SwapperNotAllowlisted(address swapper);

  /// @notice Thrown when the allowance target is not allowed by the swapper registry
  error InvalidAllowanceTarget(address spender);

  /// @notice Thrown when trying to send dust to the zero address
  error DustRecipientIsZeroAddress();

  /**
   * @notice Emitted when dust is sent
   * @param token The token that was sent
   * @param amount The amount that was sent
   * @param recipient The address that received the tokens
   */
  event DustSent(address token, uint256 amount, address recipient);

  /**
   * @notice Returns the address of the swapper registry
   * @dev Cannot be modified
   * @return The address of the swapper registry
   */
  function SWAPPER_REGISTRY() external view returns (ISwapperRegistry);

}
