// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../SwapAdapter.sol';

contract SwapAdapterMock is SwapAdapter {
  constructor(address _swapperRegistry) SwapAdapter(_swapperRegistry) {}

  function internalTakeFromMsgSender(IERC20 _token, uint256 _amount) external {
    _takeFromMsgSender(_token, _amount);
  }
}
