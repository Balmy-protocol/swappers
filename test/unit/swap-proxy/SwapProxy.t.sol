// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.22;

import { ISwapProxy, SwapProxy } from "../../../src/SwapProxy.sol";
import { PRBTest } from "@prb/test/PRBTest.sol";
import { ERC20MintableMock } from "../../mocks/ERC20/ERC20MintableMock.sol";
import { Permit2AdapterMock } from "../../mocks/Permit2AdapterMock.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SwapProxyTest is PRBTest {
  ISwapProxy private swapProxy;
  Permit2AdapterMock private underlyingSwapper;
  ERC20MintableMock private token = new ERC20MintableMock();

  function setUp() public virtual {
    underlyingSwapper = new Permit2AdapterMock();
    swapProxy = new SwapProxy(address(underlyingSwapper));
  }

  function test_constructor() public {
    assertEq(address(underlyingSwapper), address(swapProxy.UNDERLYING_SWAPPER()));
  }

  function test_swap_ERC20() public {
    token.mint(address(this), 10);
    token.approve(address(swapProxy), 10);
    bytes memory swapResults =
      swapProxy.swap(address(token), 10, abi.encodeWithSignature("isNativeToken(address)", address(token)));
    assertEq(IERC20(token).balanceOf(address(this)), 0);
    assertEq(IERC20(token).balanceOf(address(underlyingSwapper)), 10);
    assertEq(abi.decode(swapResults, (bool)), underlyingSwapper.isNativeToken(address(token)));
  }

  function test_swap_Permit2Adapter_ERC20() public {
    token.mint(address(this), 10);
    token.approve(address(swapProxy), 10);
    vm.prank(address(underlyingSwapper));
    swapProxy.swap(address(token), 10, "");

    // Nothing happens...
    assertEq(IERC20(token).balanceOf(address(this)), 10);
    assertEq(IERC20(token).balanceOf(address(underlyingSwapper)), 0);
  }

  function test_swap_Permit2Adapter_NativeToken() public {
    vm.deal(address(swapProxy), 10);
    vm.prank(address(underlyingSwapper));
    swapProxy.swap(address(0), 10, "");
    assertEq(address(swapProxy).balance, 0);
    assertEq(address(underlyingSwapper).balance, 10);
  }

  function test_swap_NativeToken() public {
    vm.deal(address(swapProxy), 10);
    bytes memory swapResults = swapProxy.swap(
      address(0), 10, abi.encodeWithSignature("isNativeToken(address)", underlyingSwapper.NATIVE_TOKEN())
    );
    assertEq(address(underlyingSwapper).balance, 10);
    assertEq(address(swapProxy).balance, 0);
    assertEq(abi.decode(swapResults, (bool)), underlyingSwapper.isNativeToken(underlyingSwapper.NATIVE_TOKEN()));
  }

  function test_swap_RevertWhen_Permit2AdapterReverts() public {
    token.mint(address(this), 10);
    token.approve(address(swapProxy), 10);
    vm.expectRevert(abi.encodeWithSelector(Permit2AdapterMock.BadAddressIsNotAToken.selector));
    swapProxy.swap(address(token), 10, abi.encodeWithSignature("isNativeToken(address)", address(1_234_567_890)));
  }
}
