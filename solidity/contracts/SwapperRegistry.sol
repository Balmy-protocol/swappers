// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/ISwapperRegistry.sol';

contract SwapperRegistry is AccessControl, ISwapperRegistry {
  bytes32 public constant SUPER_ADMIN_ROLE = keccak256('SUPER_ADMIN_ROLE');
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  /// @inheritdoc ISwapperRegistry
  mapping(address => bool) public isSwapperAllowlisted;

  /// @inheritdoc ISwapperRegistry
  mapping(address => bool) public isSupplementaryAllowanceTarget;

  constructor(
    address[] memory _initialSwappersAllowlisted,
    address[] memory _initialSupplementaryAllowanceTargets,
    address _superAdmin,
    address[] memory _initialAdmins
  ) {
    if (_superAdmin == address(0)) revert ZeroAddress();
    _setupRole(SUPER_ADMIN_ROLE, _superAdmin);
    _setRoleAdmin(ADMIN_ROLE, SUPER_ADMIN_ROLE);
    for (uint256 i; i < _initialAdmins.length; i++) {
      _setupRole(ADMIN_ROLE, _initialAdmins[i]);
    }

    if (_initialSwappersAllowlisted.length > 0) {
      for (uint256 i; i < _initialSwappersAllowlisted.length; i++) {
        isSwapperAllowlisted[_initialSwappersAllowlisted[i]] = true;
      }
      emit AllowedSwappers(_initialSwappersAllowlisted);
    }

    if (_initialSupplementaryAllowanceTargets.length > 0) {
      for (uint256 i; i < _initialSupplementaryAllowanceTargets.length; i++) {
        isSupplementaryAllowanceTarget[_initialSupplementaryAllowanceTargets[i]] = true;
      }
      emit AllowedSupplementaryAllowanceTargets(_initialSupplementaryAllowanceTargets);
    }
  }

  /// @inheritdoc ISwapperRegistry
  function allowSwappers(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      isSwapperAllowlisted[_swappers[i]] = true;
    }
    emit AllowedSwappers(_swappers);
  }

  /// @inheritdoc ISwapperRegistry
  function removeSwappersFromAllowlist(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      isSwapperAllowlisted[_swappers[i]] = false;
    }
    emit RemoveSwappersFromAllowlist(_swappers);
  }
}
