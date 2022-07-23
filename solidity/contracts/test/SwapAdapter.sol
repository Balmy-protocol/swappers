// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../SwapAdapter.sol';

contract SwapAdapterMock is SwapAdapter {
  constructor(address _swapperRegistry, address _governor) SwapAdapter(_swapperRegistry, _governor) {}

  function internalTakeFromMsgSender(IERC20 _token, uint256 _amount) external {
    _takeFromMsgSender(_token, _amount);
  }

  function internalMaxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    bool _alreadyValidatedSpender,
    uint256 _minAllowance
  ) external {
    _maxApproveSpenderIfNeeded(_token, _spender, _alreadyValidatedSpender, _minAllowance);
  }

  function internalExecuteSwap(
    address _swapper,
    bytes calldata _swapData,
    uint256 _value
  ) external payable {
    _executeSwap(_swapper, _swapData, _value);
  }

  function internalSendBalanceToRecipient(address _token, address _recipient) external {
    _sendBalanceToRecipient(_token, _recipient);
  }

  function internalAssertSwapperIsAllowlisted(address _swapper) external view {
    _assertSwapperIsAllowlisted(_swapper);
  }
}
