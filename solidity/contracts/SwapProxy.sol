// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/ISwapProxy.sol';

contract SwapProxy is AccessControl, ISwapProxy {
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
}
