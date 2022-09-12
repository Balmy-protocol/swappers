// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.7 <0.9.0;

import '../extensions/PayableMulticall.sol';

contract PayableMulticallMock is PayableMulticall {
  // slither-disable-next-line arbitrary-send
  function sendEthToAddress(address payable _recipient, uint256 _amount) external payable {
    _recipient.transfer(_amount);
  }
}
