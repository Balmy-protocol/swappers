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

  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal virtual {
    _token.safeTransferFrom(msg.sender, address(this), _amount);
  }

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

  function _executeSwap(address _swapper, bytes calldata _swapData) internal virtual {
    _swapper.functionCallWithValue(_swapData, msg.value);
  }

  function _sendBalanceToRecipient(IERC20 _token, address _recipient) internal virtual {
    uint256 _balance = _token.balanceOf(address(this));
    if (_balance > 0) {
      _token.safeTransfer(_recipient, _balance);
    }
  }
}
