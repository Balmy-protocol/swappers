// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import './Shared.sol';
import '../SwapAdapter.sol';

/**
 * @notice An abstract contract that contains an internal function that would allow
 *         someone to withdraw some tokens from the contract. When this function is exposed, we
 *         should make sure that it is behind a permission check.
 */
abstract contract InternalCollectableDust is SwapAdapter {
  using SafeERC20 for IERC20;
  using Address for address payable;

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
   * @notice Sends the given token to the recipient
   * @dev If exposed, then it should be permissioned
   * @param _token The token to send to the recipient (can be an ERC20 or the protocol token)
   * @param _amount The amount to transfer to the recipient
   * @param _recipient The address of the recipient
   */
  function _sendDust(
    address _token,
    uint256 _amount,
    address _recipient
  ) internal virtual {
    if (_recipient == address(0)) revert DustRecipientIsZeroAddress();
    if (_token == PROTOCOL_TOKEN) {
      payable(_recipient).sendValue(_amount);
    } else {
      IERC20(_token).safeTransfer(_recipient, _amount);
    }
    emit DustSent(_token, _amount, _recipient);
  }
}
