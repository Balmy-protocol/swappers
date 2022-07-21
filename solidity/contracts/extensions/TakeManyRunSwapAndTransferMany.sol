// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import './Shared.sol';
import '../SwapAdapter.sol';

abstract contract TakeManyRunSwapAndTransferMany is SwapAdapter {
  /// @notice The parameters to execute the call
  struct TakeManyRunSwapAndTransferManyParams {
    // The tokens (and amounts) to take from the caller
    TakeFromCaller[] takeFromCaller;
    // The accounts that should be approved for spending
    Allowance[] allowanceTargets;
    // The swapper that will execute the call
    address swapper;
    // The actual swap execution
    bytes swapData;
    // Tokens to transfer after swaps have been executed
    TransferOutBalance[] transferOutBalance;
  }

  /**
   * @notice Takes many tokens from the caller, and executes a swap. After the swap is executed, the caller
   *         can specify that tokens that remained in the contract should be sent to different recipients.
   *         These tokens could be either the result of the swap, or unspent tokens
   * @dev This function can only be executed with swappers that are allowlisted
   * @param _parameters The parameters for the swap
   */
  function takeManyRunSwapAndTransferMany(TakeManyRunSwapAndTransferManyParams calldata _parameters) external payable {
    // Take from caller
    for (uint256 i; i < _parameters.takeFromCaller.length; i++) {
      TakeFromCaller memory _takeFromCaller = _parameters.takeFromCaller[i];
      _takeFromMsgSender(_takeFromCaller.token, _takeFromCaller.amount);
    }

    // Validate that the swapper is allowlisted
    _assertSwapperIsAllowlisted(_parameters.swapper);

    // Approve whatever is necessary
    for (uint256 i; i < _parameters.allowanceTargets.length; i++) {
      Allowance memory _allowance = _parameters.allowanceTargets[i];
      _maxApproveSpenderIfNeeded(
        _allowance.token,
        _allowance.allowanceTarget,
        _allowance.allowanceTarget == _parameters.swapper,
        _allowance.minAllowance
      );
    }

    // Execute swap
    _executeSwap(_parameters.swapper, _parameters.swapData);

    // Transfer out whatever was left in the contract
    for (uint256 i; i < _parameters.transferOutBalance.length; i++) {
      TransferOutBalance memory _transferOutBalance = _parameters.transferOutBalance[i];
      _sendBalanceToRecipient(_transferOutBalance.token, _transferOutBalance.recipient);
    }
  }
}
