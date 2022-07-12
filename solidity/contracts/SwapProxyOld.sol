// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../interfaces/ISwapProxy.sol';

contract SwapProxy is AccessControl, ISwapProxy {
  using SafeERC20 for IERC20;
  using Address for address;

  bytes32 public constant SUPER_ADMIN_ROLE = keccak256('SUPER_ADMIN_ROLE');
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  /// @inheritdoc ISwapProxy
  mapping(address => bool) public isAllowlisted;

  constructor(
    address[] memory _initialAllowlisted,
    address _superAdmin,
    address[] memory _initialAdmins
  ) {
    if (_superAdmin == address(0)) revert ZeroAddress();
    _setupRole(SUPER_ADMIN_ROLE, _superAdmin);
    _setRoleAdmin(ADMIN_ROLE, SUPER_ADMIN_ROLE);
    for (uint256 i; i < _initialAdmins.length; i++) {
      _setupRole(ADMIN_ROLE, _initialAdmins[i]);
    }

    if (_initialAllowlisted.length > 0) {
      for (uint256 i; i < _initialAllowlisted.length; i++) {
        isAllowlisted[_initialAllowlisted[i]] = true;
      }
      emit AllowedSwappers(_initialAllowlisted);
    }
  }

  /// @inheritdoc ISwapProxy
  function swapAndTransfer(SwapAndTransferParams calldata _parameters) external payable onlyAllowlisted(_parameters.swapper) {
    // Get token from caller
    IERC20(_parameters.tokenIn).safeTransferFrom(msg.sender, address(this), _parameters.maxAmountIn);

    // Approve swapper
    if (IERC20(_parameters.tokenIn).allowance(address(this), _parameters.allowanceTarget) < _parameters.maxAmountIn) {
      IERC20(_parameters.tokenIn).approve(_parameters.allowanceTarget, 0); // We do this because some tokens (like USDT) fail if we don't
      IERC20(_parameters.tokenIn).approve(_parameters.allowanceTarget, type(uint256).max);
    }

    // Execute swap
    _parameters.swapper.functionCallWithValue(_parameters.swapData, msg.value);

    // Send anything that wasn't spent back to the caller (if necessary)
    if (_parameters.checkUnspentTokensIn) {
      uint256 _balance = IERC20(_parameters.tokenIn).balanceOf(address(this));
      if (_balance > 0) {
        IERC20(_parameters.tokenIn).safeTransfer(msg.sender, _balance);
      }
    }

    // Send swapped to recipient
    IERC20(_parameters.tokenOut).safeTransfer(_parameters.recipient, IERC20(_parameters.tokenOut).balanceOf(address(this)));
  }

  /// @inheritdoc ISwapProxy
  function swapAndTransferMany(SwapAndTransferManyParams calldata _parameters) external payable onlyAllowlisted(_parameters.swapper) {
    for (uint256 i; i < _parameters.tokensIn.length; i++) {
      IERC20 _token = IERC20(_parameters.tokensIn[i].token);
      uint256 _amount = _parameters.tokensIn[i].amount;

      // Get token from caller
      _token.safeTransferFrom(msg.sender, address(this), _amount);

      // Approve swapper
      if (_token.allowance(address(this), _parameters.allowanceTarget) < _amount) {
        _token.approve(_parameters.allowanceTarget, 0); // We do this because some tokens (like USDT) fail if we don't
        _token.approve(_parameters.allowanceTarget, type(uint256).max);
      }
    }

    // Execute swap
    _parameters.swapper.functionCallWithValue(_parameters.swapData, msg.value);

    // Send anything that wasn't spent back to the caller (if necessary)
    if (_parameters.checkUnspentTokensIn) {
      for (uint256 i; i < _parameters.tokensIn.length; i++) {
        IERC20 _token = IERC20(_parameters.tokensIn[i].token);
        uint256 _balance = _token.balanceOf(address(this));
        if (_balance > 0) {
          _token.safeTransfer(msg.sender, _balance);
        }
      }
    }

    // Send swapped to recipient
    for (uint256 i; i < _parameters.tokensOut.length; i++) {
      IERC20(_parameters.tokensOut[i]).safeTransfer(_parameters.recipient, IERC20(_parameters.tokensOut[i]).balanceOf(address(this)));
    }
  }

  /// @inheritdoc ISwapProxy
  function allowSwappers(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      isAllowlisted[_swappers[i]] = true;
    }
    emit AllowedSwappers(_swappers);
  }

  /// @inheritdoc ISwapProxy
  function removeSwappersFromAllowlist(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      isAllowlisted[_swappers[i]] = false;
    }
    emit RemoveSwappersFromAllowlist(_swappers);
  }

  /// @dev Reverts if the given swapper is not allowlisted
  modifier onlyAllowlisted(address _swapper) {
    if (!isAllowlisted[_swapper]) revert SwapperNotAllowlisted(_swapper);
    _;
  }
}
