// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../SwapAdapter.sol';

abstract contract TakeAndRunSwap is SwapAdapter {
  // @notice The parameters to execute take & run a swap
  struct TakeAndRunSwapParams {
    // The swapper that will execute the call
    address swapper;
    // The account that needs to be approved for token transfers
    address allowanceTarget;
    // The actual swap execution
    bytes swapData;
    // The token that will be swapped
    IERC20 tokenIn;
    // The max amount of "token in" that can be spent
    uint256 maxAmountIn;
    // Determine if we need to check if there are any unspent "token in" to return to the caller
    bool checkUnspentTokensIn;
  }

  /**
   * @notice Takes tokens from the caller, and executes a swap with the given swapper. The swap itself
   *         should include a transfer, or the swapped tokens will be left in the contract
   * @dev This function can only be executed with swappers that are allowlisted
   * @param _parameters The parameters for the swap
   */
  function takeAndRunSwap(TakeAndRunSwapParams calldata _parameters) external payable onlyAllowlisted(_parameters.swapper) {
    _takeFromMsgSender(_parameters.tokenIn, _parameters.maxAmountIn);
    _maxApproveSpenderIfNeeded(_parameters.tokenIn, _parameters.allowanceTarget, _parameters.maxAmountIn);
    _executeSwap(_parameters.swapper, _parameters.swapData);
    if (_parameters.checkUnspentTokensIn) {
      _sendBalanceToRecipient(_parameters.tokenIn, msg.sender);
    }
  }
}
