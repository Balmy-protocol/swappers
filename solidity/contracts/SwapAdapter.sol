// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../interfaces/ISwapAdapter.sol';

abstract contract SwapAdapter is ISwapAdapter {
  using SafeERC20 for IERC20;
  using Address for address;

  ISwapperRegistry public immutable SWAPPER_REGISTRY;

  constructor(address _swapperRegistry) {
    if (_swapperRegistry == address(0)) revert ZeroAddress();
    SWAPPER_REGISTRY = ISwapperRegistry(_swapperRegistry);
  }

  /**
   * @notice Takes the given amount of tokens from the caller
   * @param _token The token to check
   * @param _amount The amount to take
   */
  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal virtual {
    _token.safeTransferFrom(msg.sender, address(this), _amount);
  }

  /**
   * @notice Checks if the given spender has enough allowance, and approves the max amount
   *         if it doesn't
   * @param _token The token to check
   * @param _spender The spender to check
   * @param _minAllowance The min allowance. If the spender has over this amount, then no extra approve is needed
   */
  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    uint256 _minAllowance
  ) internal virtual {
    uint256 _allowance = _token.allowance(address(this), _spender);
    if (_allowance < _minAllowance) {
      if (_allowance > 0) {
        _token.approve(_spender, 0); // We do this because some tokens (like USDT) fail if we don't
      }
      _token.approve(_spender, type(uint256).max);
    }
  }

  /**
   * @notice Executes a swap for the given swapper
   * @param _swapper The actual swapper
   * @param _swapData The swap execution
   */
  function _executeSwap(address _swapper, bytes calldata _swapData) internal virtual {
    _swapper.functionCallWithValue(_swapData, msg.value);
  }

  /**
   * @notice Checks if the contract has any balance of the given token, and if it does,
   *         it sends it to the caller
   * @param _token The token to check
   */
  function _sendBalanceToMsgSender(IERC20 _token) internal virtual {
    uint256 _balance = _token.balanceOf(address(this));
    if (_balance > 0) {
      _token.safeTransfer(msg.sender, _balance);
    }
  }

  /**
   * @notice Checks if given swapper is allowlisted, and fails if it isn't
   * @param _swapper The swapper to check
   */
  function _assertSwapperIsAllowlisted(address _swapper) internal view {
    if (!SWAPPER_REGISTRY.isAllowlisted(_swapper)) revert SwapperNotAllowlisted(_swapper);
  }
}
