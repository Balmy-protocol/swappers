// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.22;

import { BasePermit2Adapter } from "@mean-finance/permit2-adapter/src/base/BasePermit2Adapter.sol";
import { MockPermit2 } from "@mean-finance/permit2-adapter/test/unit/mocks/MockPermit2.sol";

contract Permit2AdapterMock is BasePermit2Adapter {
  error BadAddressIsNotAToken();

  constructor() BasePermit2Adapter(new MockPermit2()) { }

  function isNativeToken(address token) public payable returns (bool) {
    if (token == address(1_234_567_890)) revert BadAddressIsNotAToken();
    return token == NATIVE_TOKEN;
  }
}
