// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract VeilLiquidityPool is ERC20 {
    error AmountZero();
    error InvalidToken();
    error InvalidLiquidityRatio(uint256 expectedAmount1);
    error InsufficientLiquidityMinted();
    error InsufficientOutputAmount();

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidityBurned);
    event Swapped(address indexed trader, address indexed tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    uint256 public constant BPS = 10_000;
    uint256 public constant SWAP_FEE_BPS = 30;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    constructor(
        string memory name_,
        string memory symbol_,
        address token0_,
        address token1_
    ) ERC20(name_, symbol_) {
        token0 = IERC20(token0_);
        token1 = IERC20(token1_);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 liquidity) {
        if (amount0 == 0 || amount1 == 0) revert AmountZero();

        uint256 supply = totalSupply();

        if (supply == 0) {
            liquidity = Math.sqrt(amount0 * amount1);
        } else {
            uint256 expectedAmount1 = (amount0 * reserve1) / reserve0;
            if (expectedAmount1 != amount1) revert InvalidLiquidityRatio(expectedAmount1);

            uint256 liquidity0 = (amount0 * supply) / reserve0;
            uint256 liquidity1 = (amount1 * supply) / reserve1;
            liquidity = Math.min(liquidity0, liquidity1);
        }

        if (liquidity == 0) revert InsufficientLiquidityMinted();

        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;
        _mint(msg.sender, liquidity);

        emit LiquidityAdded(msg.sender, amount0, amount1, liquidity);
    }

    function removeLiquidity(uint256 liquidity) external returns (uint256 amount0, uint256 amount1) {
        if (liquidity == 0) revert AmountZero();

        uint256 supply = totalSupply();
        amount0 = (liquidity * reserve0) / supply;
        amount1 = (liquidity * reserve1) / supply;

        _burn(msg.sender, liquidity);

        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, liquidity);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        if (amountIn == 0) revert AmountZero();

        bool zeroForOne;
        if (tokenIn == address(token0)) {
            zeroForOne = true;
        } else if (tokenIn == address(token1)) {
            zeroForOne = false;
        } else {
            revert InvalidToken();
        }

        (IERC20 inputToken, IERC20 outputToken, uint256 reserveIn, uint256 reserveOut) = zeroForOne
            ? (token0, token1, reserve0, reserve1)
            : (token1, token0, reserve1, reserve0);

        uint256 amountInWithFee = amountIn * (BPS - SWAP_FEE_BPS);
        amountOut = (reserveOut * amountInWithFee) / ((reserveIn * BPS) + amountInWithFee);
        if (amountOut < minAmountOut || amountOut == 0) revert InsufficientOutputAmount();

        inputToken.transferFrom(msg.sender, address(this), amountIn);
        outputToken.transfer(msg.sender, amountOut);

        if (zeroForOne) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        emit Swapped(msg.sender, address(inputToken), amountIn, address(outputToken), amountOut);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        bool zeroForOne;
        if (tokenIn == address(token0)) {
            zeroForOne = true;
        } else if (tokenIn == address(token1)) {
            zeroForOne = false;
        } else {
            revert InvalidToken();
        }

        uint256 reserveIn = zeroForOne ? reserve0 : reserve1;
        uint256 reserveOut = zeroForOne ? reserve1 : reserve0;
        uint256 amountInWithFee = amountIn * (BPS - SWAP_FEE_BPS);
        amountOut = (reserveOut * amountInWithFee) / ((reserveIn * BPS) + amountInWithFee);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }
}
