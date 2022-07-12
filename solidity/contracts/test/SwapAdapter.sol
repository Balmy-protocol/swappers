// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../SwapAdapter.sol';

contract SwapAdapterMock is SwapAdapter {
  struct TakeFromMsgSenderCall {
    IERC20 token;
    uint256 amount;
  }

  struct MaxApproveSpenderCall {
    IERC20 token;
    address spender;
    uint256 minAllowance;
  }

  struct ExecuteSwapCall {
    address swapper;
    bytes swapData;
  }

  struct SendBalanceToMsgSenderCall {
    IERC20 token;
  }

  TakeFromMsgSenderCall public takeFromMsgSenderCall;
  MaxApproveSpenderCall public maxApproveSpenderCall;
  ExecuteSwapCall public executeSwapCall;
  SendBalanceToMsgSenderCall public sendBalanceToMsgSenderCall;

  constructor(address _swapperRegistry) SwapAdapter(_swapperRegistry) {}

  function internalTakeFromMsgSender(IERC20 _token, uint256 _amount) external {
    _takeFromMsgSender(_token, _amount);
  }

  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal override {
    takeFromMsgSenderCall = TakeFromMsgSenderCall(_token, _amount);
    super._takeFromMsgSender(_token, _amount);
  }

  function internalMaxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    uint256 _minAllowance
  ) external {
    _maxApproveSpenderIfNeeded(_token, _spender, _minAllowance);
  }

  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    uint256 _minAllowance
  ) internal override {
    maxApproveSpenderCall = MaxApproveSpenderCall(_token, _spender, _minAllowance);
    super._maxApproveSpenderIfNeeded(_token, _spender, _minAllowance);
  }

  function internalExecuteSwap(address _swapper, bytes calldata _swapData) external payable {
    _executeSwap(_swapper, _swapData);
  }

  function _executeSwap(address _swapper, bytes calldata _swapData) internal override {
    executeSwapCall = ExecuteSwapCall(_swapper, _swapData);
    super._executeSwap(_swapper, _swapData);
  }

  function internalSendBalanceToMsgSender(IERC20 _token) external {
    _sendBalanceToMsgSender(_token);
  }

  function _sendBalanceToMsgSender(IERC20 _token) internal override {
    sendBalanceToMsgSenderCall = SendBalanceToMsgSenderCall(_token);
    super._sendBalanceToMsgSender(_token);
  }

  function internalSendBalanceToRecipient(IERC20 _token, address _recipient) external {
    _sendBalanceToRecipient(_token, _recipient);
  }

  function internalAssertSwapperIsAllowlisted(address _swapper) external view {
    _assertSwapperIsAllowlisted(_swapper);
  }
}
