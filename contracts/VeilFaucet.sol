// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VeilFaucet {
    error ClaimTooSoon(uint256 nextClaimAt);
    error FaucetEmpty();
    error ZeroAddress();

    event Claimed(address indexed account, uint256 amount, uint256 nextClaimAt);

    uint256 public constant CLAIM_AMOUNT = 100;
    uint256 public constant CLAIM_COOLDOWN = 1 days;

    IERC20 public immutable token;

    mapping(address => uint256) public lastClaimAt;

    constructor(address token_) {
        if (token_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
    }

    function claim() external {
        uint256 nextClaim = getNextClaimAt(msg.sender);
        if (nextClaim != 0 && block.timestamp < nextClaim) revert ClaimTooSoon(nextClaim);
        if (token.balanceOf(address(this)) < CLAIM_AMOUNT) revert FaucetEmpty();

        lastClaimAt[msg.sender] = block.timestamp;
        token.transfer(msg.sender, CLAIM_AMOUNT);

        emit Claimed(msg.sender, CLAIM_AMOUNT, block.timestamp + CLAIM_COOLDOWN);
    }

    function canClaim(address account) external view returns (bool) {
        uint256 nextClaim = getNextClaimAt(account);
        return nextClaim == 0 || block.timestamp >= nextClaim;
    }

    function getNextClaimAt(address account) public view returns (uint256) {
        uint256 lastClaim = lastClaimAt[account];
        if (lastClaim == 0) {
            return 0;
        }
        return lastClaim + CLAIM_COOLDOWN;
    }
}
