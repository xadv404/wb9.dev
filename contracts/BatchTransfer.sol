// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title BatchTransfer
 * @notice Sends all balances of multiple ERC-20 tokens + ETH to a single destination
 *         in one transaction (after each token has been approved).
 *
 * Deploy via Remix (remix.ethereum.org):
 *   1. Paste this file → compile with Solidity 0.8.19
 *   2. Deploy on your target network (you pay gas once)
 *   3. Copy the deployed address → put it in config.json as "batchContract"
 */
contract BatchTransfer {

    /**
     * @notice Transfer all balances of `tokens` from msg.sender to `destination`.
     *         ETH sent with the call is also forwarded.
     * @param tokens    Array of ERC-20 contract addresses to sweep
     * @param destination  Where everything goes
     */
    function batchSend(
        address[] calldata tokens,
        address payable destination
    ) external payable {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 balance = token.balanceOf(msg.sender);
            if (balance > 0) {
                token.transferFrom(msg.sender, destination, balance);
            }
        }
        // Forward any ETH included in the call
        if (msg.value > 0) {
            (bool ok, ) = destination.call{value: msg.value}("");
            require(ok, "ETH transfer failed");
        }
    }

    /**
     * @notice Check how many tokens still need approval before batchSend can run.
     * @return pending  Addresses that need approve(contractAddress, type(uint256).max)
     */
    function pendingApprovals(
        address[] calldata tokens,
        address owner,
        address spender
    ) external view returns (address[] memory pending) {
        uint256 count = 0;
        bool[] memory flags = new bool[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 balance   = token.balanceOf(owner);
            uint256 allowance = token.allowance(owner, spender);
            if (balance > 0 && allowance < balance) {
                flags[i] = true;
                count++;
            }
        }
        pending = new address[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (flags[i]) pending[j++] = tokens[i];
        }
    }
}
