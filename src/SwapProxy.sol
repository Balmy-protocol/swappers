// SPDX-License-Identifier: MIT
pragma solidity >=0.8.22;

import { ISwapProxy } from "./interfaces/ISwapProxy.sol";
import { SimulationAdapter } from "@call-simulation/SimulationAdapter.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

contract SwapProxy is ISwapProxy, SimulationAdapter {
  using SafeERC20 for IERC20;
  using Address for address;

  address public immutable UNDERLYING_SWAPPER;

  constructor(address underlyingSwapper) {
    UNDERLYING_SWAPPER = underlyingSwapper;
  }

  function swap(address token, uint256 amount, bytes calldata data) external payable returns (bytes memory) {
    uint256 value = 0;
    if (token == address(0)) {
      value = amount;
    } else if (msg.sender != address(UNDERLYING_SWAPPER)) {
      // Take the funds from the caller, and send them to the adapter
      IERC20(token).safeTransferFrom(msg.sender, address(UNDERLYING_SWAPPER), amount);
    }
    return UNDERLYING_SWAPPER.functionCallWithValue(data, value);
  }
}
