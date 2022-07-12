// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../interfaces/ISwapAdapter.sol';

abstract contract SwapAdapter is ISwapAdapter {
  using SafeERC20 for IERC20;

  ISwapperRegistry public immutable SWAPPER_REGISTRY;

  constructor(address _swapperRegistry) {
    if (_swapperRegistry == address(0)) revert ZeroAddress();
    SWAPPER_REGISTRY = ISwapperRegistry(_swapperRegistry);
  }

  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal virtual {
    _token.safeTransferFrom(msg.sender, address(this), _amount);
  }

  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    uint256 _minAllowance
  ) internal virtual {
    if (_token.allowance(address(this), _spender) < _minAllowance) {
      _token.approve(_spender, 0); // We do this because some tokens (like USDT) fail if we don't
      _token.approve(_spender, type(uint256).max);
    }
  }
}
