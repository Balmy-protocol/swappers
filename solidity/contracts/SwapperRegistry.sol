// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/ISwapperRegistry.sol';

contract SwapperRegistry is AccessControl, ISwapperRegistry {
  enum Role {
    NONE,
    SWAPPER,
    SUPPLEMENTARY_ALLOWANCE_TARGET
  }

  bytes32 public constant SUPER_ADMIN_ROLE = keccak256('SUPER_ADMIN_ROLE');
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  mapping(address => Role) internal _accountRole;

  constructor(
    address[] memory _initialSwappersAllowlisted,
    address[] memory _initialSupplementaryAllowanceTargets,
    address _superAdmin,
    address[] memory _initialAdmins
  ) {
    if (_superAdmin == address(0)) revert ZeroAddress();
    // We are setting the super admin role as its own admin so we can transfer it
    _setRoleAdmin(SUPER_ADMIN_ROLE, SUPER_ADMIN_ROLE);
    _setRoleAdmin(ADMIN_ROLE, SUPER_ADMIN_ROLE);
    _setupRole(SUPER_ADMIN_ROLE, _superAdmin);
    for (uint256 i; i < _initialAdmins.length; i++) {
      _setupRole(ADMIN_ROLE, _initialAdmins[i]);
    }

    if (_initialSupplementaryAllowanceTargets.length > 0) {
      for (uint256 i; i < _initialSupplementaryAllowanceTargets.length; i++) {
        _accountRole[_initialSupplementaryAllowanceTargets[i]] = Role.SUPPLEMENTARY_ALLOWANCE_TARGET;
      }
      emit AllowedSupplementaryAllowanceTargets(_initialSupplementaryAllowanceTargets);
    }

    if (_initialSwappersAllowlisted.length > 0) {
      for (uint256 i; i < _initialSwappersAllowlisted.length; i++) {
        _accountRole[_initialSwappersAllowlisted[i]] = Role.SWAPPER;
      }
      emit AllowedSwappers(_initialSwappersAllowlisted);
    }
  }

  /// @inheritdoc ISwapperRegistry
  function isSwapperAllowlisted(address _account) external view returns (bool) {
    return _accountRole[_account] == Role.SWAPPER;
  }

  /// @inheritdoc ISwapperRegistry
  function isValidAllowanceTarget(address _account) external view returns (bool) {
    return _accountRole[_account] != Role.NONE;
  }

  /// @inheritdoc ISwapperRegistry
  function allowSwappers(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      _accountRole[_swappers[i]] = Role.SWAPPER;
    }
    emit AllowedSwappers(_swappers);
  }

  /// @inheritdoc ISwapperRegistry
  function removeSwappersFromAllowlist(address[] calldata _swappers) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _swappers.length; i++) {
      _accountRole[_swappers[i]] = Role.NONE;
    }
    emit RemoveSwappersFromAllowlist(_swappers);
  }

  /// @inheritdoc ISwapperRegistry
  function allowSupplementaryAllowanceTargets(address[] calldata _allowanceTargets) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _allowanceTargets.length; i++) {
      _accountRole[_allowanceTargets[i]] = Role.SUPPLEMENTARY_ALLOWANCE_TARGET;
    }
    emit AllowedSupplementaryAllowanceTargets(_allowanceTargets);
  }

  /// @inheritdoc ISwapperRegistry
  function removeSupplementaryAllowanceTargetsFromAllowlist(address[] calldata _allowanceTargets) external onlyRole(ADMIN_ROLE) {
    for (uint256 i; i < _allowanceTargets.length; i++) {
      _accountRole[_allowanceTargets[i]] = Role.NONE;
    }
    emit RemovedAllowanceTargetsFromAllowlist(_allowanceTargets);
  }
}
