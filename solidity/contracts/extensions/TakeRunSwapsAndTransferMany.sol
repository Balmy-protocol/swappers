// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '../SwapAdapter.sol';

abstract contract TakeRunSwapsAndTransferMany is SwapAdapter {
  /// @notice The parameters to execute the call
  struct TakeRunSwapsAndTransferManyParams {
    // The token that will be taken from the caller
    IERC20 tokenIn;
    // The max amount of "token in" that can be spent
    uint256 maxAmountIn;
    // The accounts that should be approved for spending
    Allowance[] allowanceTargets;
    // The different swappers involved in the swap
    address[] swappers;
    // The different swapps to execute
    bytes[] swaps;
    // The index of the swapper that should execute each swap. This might look strange but it's way cheaper than alternatives
    uint8[] swapperForSwap;
    // Tokens to transfer after swaps have been executed
    TransferOutBalance[] transferOutBalance;
  }

  /// @notice An allowance to provide for the swaps to work
  struct Allowance {
    // The token that should be approved
    IERC20 token;
    // The spender
    address allowanceTarget;
    // The minimum allowance needed
    uint256 minAllowance;
  }

  /// @notice A swap to execute
  struct Swap {
    // The index of the swapper in the list of swappers
    uint8 swapperIndex;
    // The data to send to the swapper
    bytes swapData;
  }

  /// @notice A token that was left on the contract and should be transferred out
  struct TransferOutBalance {
    // The token to transfer
    IERC20 token;
    // The recipient of those tokens
    address recipient;
  }

  /**
   * @notice Takes tokens from the caller, and executes many different swaps. These swaps can be chained between
   *         each other, or totally independent. After the swaps are executed, the caller can specify that tokens
   *         that remained in the contract should be sent to different recipients. These tokens could be either
   *         the result of the swaps, or unspent tokens
   * @dev This function can only be executed with swappers that are allowlisted
   * @param _parameters The parameters for the swap
   */
  function takeRunSwapsAndTransferMany(TakeRunSwapsAndTransferManyParams calldata _parameters) external payable {
    // Take from caller
    _takeFromMsgSender(_parameters.tokenIn, _parameters.maxAmountIn);

    // Approve whatever is necessary
    for (uint256 i; i < _parameters.allowanceTargets.length; i++) {
      Allowance memory _allowance = _parameters.allowanceTargets[i];
      _maxApproveSpenderIfNeeded(_allowance.token, _allowance.allowanceTarget, false, _allowance.minAllowance);
    }

    // Validate that all swappers are allowlisted
    for (uint256 i; i < _parameters.swappers.length; i++) {
      _assertSwapperIsAllowlisted(_parameters.swappers[i]);
    }

    // Execute swaps
    for (uint256 i; i < _parameters.swaps.length; i++) {
      _executeSwap(_parameters.swappers[_parameters.swapperForSwap[i]], _parameters.swaps[i]);
    }

    // Transfer out whatever was left in the contract
    for (uint256 i; i < _parameters.transferOutBalance.length; i++) {
      TransferOutBalance memory _transferOutBalance = _parameters.transferOutBalance[i];
      _sendBalanceToRecipient(_transferOutBalance.token, _transferOutBalance.recipient);
    }
  }
}
