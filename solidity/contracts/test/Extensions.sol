// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../extensions/TakeAndRunSwap.sol';

contract Extensions is TakeAndRunSwap {
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

  struct SendBalanceToRecipientCall {
    IERC20 token;
    address recipient;
  }

  TakeFromMsgSenderCall[] internal _takeFromMsgSenderCalls;
  MaxApproveSpenderCall[] internal _maxApproveSpenderCalls;
  ExecuteSwapCall[] internal _executeSwapCalls;
  SendBalanceToRecipientCall[] internal _sendBalanceToRecipientCalls;

  constructor(address _swapperRegistry) SwapAdapter(_swapperRegistry) {}

  function takeFromMsgSenderCalls() external view returns (TakeFromMsgSenderCall[] memory) {
    return _takeFromMsgSenderCalls;
  }

  function maxApproveSpenderCalls() external view returns (MaxApproveSpenderCall[] memory) {
    return _maxApproveSpenderCalls;
  }

  function executeSwapCalls() external view returns (ExecuteSwapCall[] memory) {
    return _executeSwapCalls;
  }

  function sendBalanceToRecipientCalls() external view returns (SendBalanceToRecipientCall[] memory) {
    return _sendBalanceToRecipientCalls;
  }

  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal override {
    _takeFromMsgSenderCalls.push(TakeFromMsgSenderCall(_token, _amount));
    super._takeFromMsgSender(_token, _amount);
  }

  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    uint256 _minAllowance
  ) internal override {
    _maxApproveSpenderCalls.push(MaxApproveSpenderCall(_token, _spender, _minAllowance));
    super._maxApproveSpenderIfNeeded(_token, _spender, _minAllowance);
  }

  function _executeSwap(address _swapper, bytes calldata _swapData) internal override {
    _executeSwapCalls.push(ExecuteSwapCall(_swapper, _swapData));
    super._executeSwap(_swapper, _swapData);
  }

  function _sendBalanceToRecipient(IERC20 _token, address _recipient) internal override {
    _sendBalanceToRecipientCalls.push(SendBalanceToRecipientCall(_token, _recipient));
    super._sendBalanceToRecipient(_token, _recipient);
  }
}
