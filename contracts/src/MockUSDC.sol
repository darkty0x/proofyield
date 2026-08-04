// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Testnet stablecoin used as vault underlying on Creditcoin CC3.
/// @dev Owner and approved minters can mint. Vault is a minter for harvests;
///      deployer/harvester stays a minter for the beta faucet.
contract MockUSDC is ERC20, Ownable {
    uint8 private immutable _decimals;
    mapping(address => bool) public minters;

    event MinterUpdated(address indexed account, bool allowed);

    error NotMinter();

    constructor() ERC20("ProofYield USD", "pyUSD") Ownable(msg.sender) {
        _decimals = 6;
        minters[msg.sender] = true;
        emit MinterUpdated(msg.sender, true);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner() && !minters[msg.sender]) revert NotMinter();
        _mint(to, amount);
    }
}
