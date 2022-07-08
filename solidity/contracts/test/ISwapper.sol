// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.7 <0.9.0;

// Note: this interface is used only for testing purposes
interface ISwapper {
  function executeSwap(
    address from,
    address to,
    uint256 amount
  ) external payable;
}

contract Swapper is ISwapper {
  uint256 public msgValue;

  function executeSwap(
    address,
    address,
    uint256
  ) external payable {
    msgValue = msg.value;
  }
}
