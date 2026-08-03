// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ProofYieldVault} from "../src/ProofYieldVault.sol";
import {RwaYieldSource} from "../src/RwaYieldSource.sol";

/// @notice Deploy RWA source on Sepolia OR vault stack on Creditcoin depending on DEPLOY_TARGET.
contract DeployProofYield is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory target = vm.envOr("DEPLOY_TARGET", string("creditcoin"));

        vm.startBroadcast(pk);

        if (keccak256(bytes(target)) == keccak256(bytes("sepolia"))) {
            RwaYieldSource source = new RwaYieldSource();
            console2.log("RwaYieldSource", address(source));
        } else {
            MockUSDC asset = new MockUSDC();
            ProofYieldVault vault = new ProofYieldVault(asset);
            asset.transferOwnership(address(vault));

            address source = vm.envOr("SEPOLIA_RWA_SOURCE", address(0));
            if (source != address(0)) {
                vault.setSourceYieldContract(source);
            }

            address harvester = vm.envOr("HARVESTER_ADDRESS", msg.sender);
            vault.setHarvester(harvester);

            // Seed demo liquidity for first depositors
            uint256 seed = vm.envOr("SEED_AMOUNT", uint256(1_000_000e6));
            // Mint via vault (now owner of asset) — temporarily reclaim for seed faucet
            // Owner of asset is vault; use harvestTrusted path after transferring ownership pattern:
            // Re-mint by deploying faucet separately if needed. For bootstrap, mint before transfer:
            console2.log("MockUSDC", address(asset));
            console2.log("ProofYieldVault", address(vault));
            console2.log("seed hint", seed);
        }

        vm.stopBroadcast();
    }
}

/// @notice Deploy asset+vault with seed mint retained by deployer for faucet.
contract DeployCreditcoinStack is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockUSDC asset = new MockUSDC();
        // Mint faucet balance to deployer before giving mint rights to vault
        asset.mint(msg.sender, 10_000_000e6);

        ProofYieldVault vault = new ProofYieldVault(asset);
        // Dual-mint: transfer ownership to a minter router — keep deployer as owner for faucet,
        // grant vault mint via temporary Ownable pattern: set vault as owner and use harvest for yield.
        // For deposits, deployer holds pyUSD. Yield mint requires vault to be asset owner.
        asset.transferOwnership(address(vault));

        address source = vm.envOr("SEPOLIA_RWA_SOURCE", address(0));
        if (source != address(0)) vault.setSourceYieldContract(source);

        address harvester = vm.envOr("HARVESTER_ADDRESS", msg.sender);
        vault.setHarvester(harvester);

        console2.log("MockUSDC", address(asset));
        console2.log("ProofYieldVault", address(vault));

        vm.stopBroadcast();
    }
}
