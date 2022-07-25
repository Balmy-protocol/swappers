// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../interfaces/ISwapAdapter.sol';

abstract contract SwapAdapter is ISwapAdapter {
  using SafeERC20 for IERC20;
  using Address for address;

  /// @inheritdoc ISwapAdapter
  address public constant PROTOCOL_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
  /// @inheritdoc ISwapAdapter
  ISwapperRegistry public immutable SWAPPER_REGISTRY;

  constructor(address _swapperRegistry) {
    if (_swapperRegistry == address(0)) revert ZeroAddress();
    SWAPPER_REGISTRY = ISwapperRegistry(_swapperRegistry);
  }

  /// @inheritdoc ISwapAdapter
  function revokeAllowances(RevokeAction[] calldata _revokeActions) external {
    if (msg.sender != address(SWAPPER_REGISTRY)) revert OnlyRegistryCanRevoke();
    for (uint256 i; i < _revokeActions.length; i++) {
      RevokeAction memory _action = _revokeActions[i];
      for (uint256 j; j < _action.tokens.length; j++) {
        _action.tokens[j].approve(_action.spender, 0);
      }
    }
  }

  receive() external payable {}

  /**
   * @notice Takes the given amount of tokens from the caller
   * @param _token The token to check
   * @param _amount The amount to take
   */
  function _takeFromMsgSender(IERC20 _token, uint256 _amount) internal virtual {
    _token.safeTransferFrom(msg.sender, address(this), _amount);
  }

  /**
   * @notice Checks if the given spender has enough allowance, and approves the max amount
   *         if it doesn't
   * @param _token The token to check
   * @param _spender The spender to check
   * @param _minAllowance The min allowance. If the spender has over this amount, then no extra approve is needed
   */
  function _maxApproveSpenderIfNeeded(
    IERC20 _token,
    address _spender,
    bool _alreadyValidatedSpender,
    uint256 _minAllowance
  ) internal virtual {
    uint256 _allowance = _token.allowance(address(this), _spender);
    if (_allowance < _minAllowance) {
      if (!_alreadyValidatedSpender && !SWAPPER_REGISTRY.isValidAllowanceTarget(_spender)) {
        revert InvalidAllowanceTarget(_spender);
      }
      if (_allowance > 0) {
        _token.approve(_spender, 0); // We do this because some tokens (like USDT) fail if we don't
      }
      _token.approve(_spender, type(uint256).max);
    }
  }

  /**
   * @notice Executes a swap for the given swapper
   * @param _swapper The actual swapper
   * @param _swapData The swap execution data
   */
  function _executeSwap(
    address _swapper,
    bytes calldata _swapData,
    uint256 _value
  ) internal virtual {
    _swapper.functionCallWithValue(_swapData, _value);
  }

  /**
   * @notice Checks if the contract has any balance of the given token, and if it does,
   *         it sends it to the given recipient
   * @param _token The token to check
   * @param _recipient The recipient of the token balance
   */
  function _sendBalanceToRecipient(address _token, address _recipient) internal virtual {
    if (_token == PROTOCOL_TOKEN) {
      uint256 _balance = address(this).balance;
      if (_balance > 0) {
        payable(_recipient).transfer(_balance);
      }
    } else {
      uint256 _balance = IERC20(_token).balanceOf(address(this));
      if (_balance > 0) {
        IERC20(_token).safeTransfer(_recipient, _balance);
      }
    }
  }

  /**
   * @notice Checks if given swapper is allowlisted, and fails if it isn't
   * @param _swapper The swapper to check
   */
  function _assertSwapperIsAllowlisted(address _swapper) internal view {
    if (!SWAPPER_REGISTRY.isSwapperAllowlisted(_swapper)) revert SwapperNotAllowlisted(_swapper);
  }

  modifier onlyAllowlisted(address _swapper) {
    _assertSwapperIsAllowlisted(_swapper);
    _;
  }
}
