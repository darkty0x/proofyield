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
            // Prefer DeployCreditcoinStack for beta (minter + faucet seed).
            MockUSDC asset = new MockUSDC();
            ProofYieldVault vault = new ProofYieldVault(asset);
            asset.setMinter(address(vault), true);

            address source = vm.envOr("SEPOLIA_RWA_SOURCE", address(0));
            if (source != address(0)) {
                vault.setSourceYieldContract(source);
            }

            address harvester = vm.envOr("HARVESTER_ADDRESS", msg.sender);
            vault.setHarvester(harvester);
            if (harvester != msg.sender) {
                asset.setMinter(harvester, true);
            }

            console2.log("MockUSDC", address(asset));
            console2.log("ProofYieldVault", address(vault));
        }

        vm.stopBroadcast();
    }
}

/// @notice Deploy asset+vault with seed mint + minter roles for vault harvest and faucet.
contract DeployCreditcoinStack is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockUSDC asset = new MockUSDC();
        // Seed faucet balance for deployer/harvester before wiring vault minter.
        asset.mint(msg.sender, 10_000_000e6);

        ProofYieldVault vault = new ProofYieldVault(asset);
        asset.setMinter(address(vault), true);

        address source = vm.envOr("SEPOLIA_RWA_SOURCE", address(0));
        if (source != address(0)) vault.setSourceYieldContract(source);

        address harvester = vm.envOr("HARVESTER_ADDRESS", msg.sender);
        vault.setHarvester(harvester);
        if (harvester != msg.sender) {
            asset.setMinter(harvester, true);
        }

        console2.log("MockUSDC", address(asset));
        console2.log("ProofYieldVault", address(vault));
        console2.log("Harvester", harvester);

        vm.stopBroadcast();
    }
}
