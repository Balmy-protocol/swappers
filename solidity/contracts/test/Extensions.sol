// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../extensions/RunSwap.sol';
import '../extensions/TakeAndRunSwap.sol';
import '../extensions/TakeRunSwapAndTransfer.sol';
import '../extensions/TakeRunSwapsAndTransferMany.sol';
import '../extensions/TakeManyRunSwapAndTransferMany.sol';
import '../extensions/TakeManyRunSwapsAndTransferMany.sol';
import '../extensions/GetBalances.sol';
import '../extensions/RevokableWithGovernor.sol';
import '../extensions/CollectableWithGovernor.sol';

contract Extensions is
  RunSwap,
  TakeAndRunSwap,
  TakeRunSwapAndTransfer,
  TakeRunSwapsAndTransferMany,
  TakeManyRunSwapAndTransferMany,
  TakeManyRunSwapsAndTransferMany,
  GetBalances,
  RevokableWithGovernor,
  CollectableWithGovernor
{
  struct TakeFromMsgSenderCall {
    IERC20 token;
    uint256 amount;
  }

  struct MaxApproveSpenderCall {
    IERC20 token;
    address spender;
    bool alreadyValidatedSpender;
    uint256 minAllowance;
  }

  struct ExecuteSwapCall {
    address swapper;
    bytes swapData;
    uint256 value;
  }

  struct SendBalanceOnContractToRecipientCall {
    address token;
    address recipient;
  }

  struct SendToRecipientCall {
    address token;
    uint256 amount;
    address recipient;
  }

  TakeFromMsgSenderCall[] internal _takeFromMsgSenderCalls;
  MaxApproveSpenderCall[] internal _maxApproveSpenderCalls;
  ExecuteSwapCall[] internal _executeSwapCalls;
  SendBalanceOnContractToRecipientCall[] internal _sendBalanceOnContractToRecipientCalls;
  RevokeAction[][] internal _revokeCalls;
  SendToRecipientCall[] internal _sendToRecipientCalls;

  constructor(address _swapperRegistry, address _governor) SwapAdapter(_swapperRegistry) Governable(_governor) {}

  function takeFromMsgSenderCalls() external view returns (TakeFromMsgSenderCall[] memory) {
    return _takeFromMsgSenderCalls;
  }

  function maxApproveSpenderCalls() external view returns (MaxApproveSpenderCall[] memory) {
    return _maxApproveSpenderCalls;
  }

  function executeSwapCalls() external view returns (ExecuteSwapCall[] memory) {
    return _executeSwapCalls;
  }

  function sendBalanceOnContractToRecipientCalls() external view returns (SendBalanceOnContractToRecipientCall[] memory) {
    return _sendBalanceOnContractToRecipientCalls;
  }

  function revokeAllowancesCalls() external view returns (RevokeAction[][] memory) {
    return _revokeCalls;
  }

  function sendToRecipientCalls() external view returns (SendToRecipientCall[] memory) {
    return _sendToRecipientCalls;
  }

  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal override {
    _takeFromMsgSenderCalls.push(TakeFromMsgSenderCall(_token, _amount));
    super._takeFromMsgSender(_token, _amount);
  }

  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    bool _alreadyValidatedSpender,
    uint256 _minAllowance
  ) internal override {
    _maxApproveSpenderCalls.push(MaxApproveSpenderCall(_token, _spender, _alreadyValidatedSpender, _minAllowance));
    super._maxApproveSpenderIfNeeded(_token, _spender, _alreadyValidatedSpender, _minAllowance);
  }

  function _executeSwap(
    address _swapper,
    bytes calldata _swapData,
    uint256 _value
  ) internal override {
    _executeSwapCalls.push(ExecuteSwapCall(_swapper, _swapData, _value));
    super._executeSwap(_swapper, _swapData, _value);
  }

  function _sendBalanceOnContractToRecipient(address _token, address _recipient) internal override {
    _sendBalanceOnContractToRecipientCalls.push(SendBalanceOnContractToRecipientCall(_token, _recipient));
    super._sendBalanceOnContractToRecipient(_token, _recipient);
  }

  function _revokeAllowances(RevokeAction[] calldata _revokeActions) internal override {
    _revokeCalls.push();
    uint256 _currentCall = _revokeCalls.length - 1;
    for (uint256 i; i < _revokeActions.length; i++) {
      _revokeCalls[_currentCall].push(_revokeActions[i]);
    }
    super._revokeAllowances(_revokeActions);
  }

  function _sendToRecipient(
    address _token,
    uint256 _amount,
    address _recipient
  ) internal override {
    _sendToRecipientCalls.push(SendToRecipientCall(_token, _amount, _recipient));
    super._sendToRecipient(_token, _amount, _recipient);
  }
}
