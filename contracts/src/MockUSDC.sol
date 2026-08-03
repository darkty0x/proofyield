// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Testnet stablecoin used as vault underlying on Creditcoin CC3.
contract MockUSDC is ERC20, Ownable {
    uint8 private immutable _decimals;

    constructor() ERC20("ProofYield USD", "pyUSD") Ownable(msg.sender) {
        _decimals = 6;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
